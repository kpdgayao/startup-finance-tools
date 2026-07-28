import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { CHART_COLORS } from "@/lib/constants";

// Vitest runs from the repo root, which IS the `app/` directory.
// Do not use __dirname — this file is ESM and it is undefined there.
const ROOT = process.cwd();

// Deferred by the Phase 1 spec — see docs/superpowers/specs/
// 2026-07-29-editorial-redesign-phase-1-design.md §7.
const HEX_ALLOWLIST = [
  "components/shared/export-pdf-button.tsx",
  // The dark-mode logo letterform: it is --background in dark only, so it
  // must be written as a theme-scoped class rather than a token reference.
  "components/shared/logo.tsx",
  // Both routes below build raw HTML email strings (Mailjet HTMLPart), not
  // app pages. They are never in the route sweep and CSS custom properties
  // are not reliably resolved by mail clients (Outlook's Word engine does
  // not support var() at all), so literal hex is the only correct choice —
  // the same "theme-independent, invisible on-screen" rationale the spec
  // already applies to export-pdf-button.tsx's PRINT_CSS. The task-8 brief
  // enumerated only two allowlist entries; these two were found during the
  // sweep and are documented as a deviation in task-8-report.md.
  "app/api/newsletter/subscribe/route.ts",
  "app/api/contact/route.ts",
];

const GRADIENT_ALLOWLIST = ["app/api/newsletter/subscribe/route.ts"];

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".superpowers") continue;
    // This guard file necessarily contains the literal strings it searches
    // for (the word "gradient" in its own identifiers/test titles, a hex
    // example in a comment) — exclude it from its own sweep rather than
    // reword working documentation to dodge a regex.
    if (entry === "design-tokens.test.ts") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, exts));
    } else if (exts.some((e) => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

function sourceFiles(exts: string[]): string[] {
  // lib/ is included: CHART_COLORS and STATUS_COLORS live there, and it is
  // exactly where a future phase would be tempted to reintroduce a literal.
  return [
    ...walk(join(ROOT, "app"), exts),
    ...walk(join(ROOT, "components"), exts),
    ...walk(join(ROOT, "lib"), exts),
  ];
}

describe("CHART_COLORS", () => {
  it("has at least 10 entries", () => {
    // pre-post-money, valuation-calculator and safe-calculator index this
    // array directly (CHART_COLORS[index], no modulo), so a shorter array
    // produces undefined fills on wide charts.
    expect(CHART_COLORS.length).toBeGreaterThanOrEqual(10);
  });

  it("contains only CSS custom property references", () => {
    for (const color of CHART_COLORS) {
      expect(color).toMatch(/^var\(--chart-\d+\)$/);
    }
  });

  it("references each chart token exactly once, in order", () => {
    expect(CHART_COLORS).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
      "var(--chart-6)",
      "var(--chart-7)",
      "var(--chart-8)",
      "var(--chart-9)",
      "var(--chart-10)",
    ]);
  });
});

describe("colour discipline", () => {
  it("has no hardcoded hex colours outside the allowlist", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles([".tsx", ".ts"])) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (HEX_ALLOWLIST.includes(rel)) continue;
      const matches = readFileSync(file, "utf8").match(/#[0-9a-fA-F]{6}\b/g);
      if (matches) offenders.push(`${rel}: ${matches.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("has no gradients outside the allowlist", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles([".tsx", ".ts", ".css", ".svg"])) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (GRADIENT_ALLOWLIST.includes(rel)) continue;
      if (/gradient/i.test(readFileSync(file, "utf8"))) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("has no Tailwind palette utility classes outside the neutral ramps", () => {
    // The hex guard above cannot see these: `text-blue-400` is a class name,
    // not a literal, but it resolves to #60a5fa and lands on warm paper just
    // as badly. Neutral ramps (slate/gray/zinc/neutral/stone) are out of scope.
    const PALETTE =
      /\b(bg|text|border|fill|stroke|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;
    const offenders: string[] = [];
    for (const file of sourceFiles([".tsx"])) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      const matches = readFileSync(file, "utf8").match(PALETTE);
      if (matches) offenders.push(`${rel}: ${[...new Set(matches)].join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("has no drop shadows in components", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles([".tsx"])) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      // shadow-none asserts the absence of a shadow — that is allowed.
      const matches = readFileSync(file, "utf8").match(/shadow-(?!none)[a-z0-9[\]/_-]+/g);
      if (matches) offenders.push(`${rel}: ${matches.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });
});

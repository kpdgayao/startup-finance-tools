import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { CHART_COLORS } from "@/lib/constants";

// Vitest runs from the repo root, which IS the `app/` directory.
// Do not use __dirname — this file is ESM and it is undefined there.
const ROOT = process.cwd();

// This guard file's own path, relative to ROOT, POSIX-normalized. Excluding
// by full path (not basename) means an unrelated file that merely happens
// to share this basename elsewhere in the tree still gets scanned.
const SELF = "lib/__tests__/design-tokens.test.ts";

// Deferred by the Phase 1 spec — see docs/superpowers/specs/
// 2026-07-29-editorial-redesign-phase-1-design.md §7.
const HEX_ALLOWLIST = [
  "components/shared/export-pdf-button.tsx",
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
  // Three brand SVGs — the browser-tab favicon and the two logo marks used
  // for social/OG scraping. Both consumers render outside the app's CSS
  // cascade (a scraper fetches the raw file; the tab icon is not a themed
  // DOM node), so neither can resolve a CSS custom property — an earlier
  // task deliberately gave them literal light-theme hex instead of
  // var(--token) references. Exactly these three paths, no directory or
  // pattern entries: any other SVG under app/, components/, lib/, or
  // public/ is expected to be clean.
  "app/icon.svg",
  "public/logo-icon.svg",
  "public/logo-full.svg",
];

const GRADIENT_ALLOWLIST = ["app/api/newsletter/subscribe/route.ts"];

// Matches 8-digit (#rrggbbaa), 6-digit (#rrggbb), and 3-or-4-digit
// shorthand (#rgb, #rgba) hex colours. Alternatives are ordered
// longest-first for clarity; \b after each alternative also prevents a
// shorter alternative from matching a mere prefix of a longer hex literal.
const HEX_PATTERN = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".superpowers") continue;
    const full = join(dir, entry);
    // This guard file necessarily contains the literal strings it searches
    // for (the word "gradient" in its own identifiers/test titles, hex
    // examples in comments) — exclude it from its own sweep by full
    // relative path (not basename) rather than reword working
    // documentation to dodge a regex.
    if (relative(ROOT, full).replace(/\\/g, "/") === SELF) continue;
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
    // .svg is included: app/icon.svg (favicon) and the two public/ logo
    // marks are real SVG assets with live hex, invisible to a .tsx/.ts-only
    // scan. public/ is walked here — and only here — because it's where
    // the two logo SVGs live and where Next.js's unused scaffold SVGs would
    // otherwise hide literal hex from every guard forever; the
    // gradient/palette/shadow assertions below have no legitimate reason to
    // see public/, so it is not added to the shared sourceFiles() roots.
    const files = [
      ...sourceFiles([".tsx", ".ts", ".svg"]),
      ...walk(join(ROOT, "public"), [".tsx", ".ts", ".svg"]),
    ];
    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (HEX_ALLOWLIST.includes(rel)) continue;
      const matches = readFileSync(file, "utf8").match(HEX_PATTERN);
      if (matches) offenders.push(`${rel}: ${matches.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("has no gradients outside the allowlist", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles([".tsx", ".ts", ".css", ".svg"])) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (GRADIENT_ALLOWLIST.includes(rel)) continue;
      const content = readFileSync(file, "utf8");
      if (/gradient/i.test(content) || /\bbg-(linear|radial|conic)(-|\b)/.test(content))
        offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("has no Tailwind palette utility classes outside the neutral ramps", () => {
    // The hex guard above cannot see these: `text-blue-400` is a class name,
    // not a literal, but it resolves to #60a5fa and lands on warm paper just
    // as badly. Neutral ramps (slate/gray/zinc/neutral/stone) are out of scope.
    const PALETTE =
      /\b(bg|text|border|border-[trbl]|border-[xy]|fill|stroke|ring|ring-offset|from|to|via|decoration|outline|accent|caret|placeholder|divide)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;
    const offenders: string[] = [];
    for (const file of sourceFiles([".tsx", ".ts"])) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      const matches = readFileSync(file, "utf8").match(PALETTE);
      if (matches) offenders.push(`${rel}: ${[...new Set(matches)].join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("has no CSS colour functions wrapping a var() reference", () => {
    // hsl(var(--x)) / oklch(var(--x)) / rgb(var(--x)) are all invalid CSS —
    // the token itself is already a full colour (hex or oklch literal), not
    // the bare h/s/l or r/g/b components these functions expect. The
    // declaration silently gets dropped by the browser, and Recharts (which
    // consumes these as inline `stroke`/`fill` props, not Tailwind classes)
    // falls back to its own built-in grey/black — invisible against a dark
    // card and untouched by the theme toggle either way.
    const WRAPPED_VAR = /(hsl|oklch|rgb)a?\(\s*var\(/g;
    const offenders: string[] = [];
    for (const file of sourceFiles([".tsx", ".ts"])) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      const matches = readFileSync(file, "utf8").match(WRAPPED_VAR);
      if (matches) offenders.push(`${rel}: ${matches.join(", ")}`);
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

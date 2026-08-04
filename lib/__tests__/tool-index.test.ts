import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TOOLS, TOOL_GROUPS } from "@/lib/constants";
import { FEATURED_TOOL_META } from "@/lib/tool-meta";

// Vitest runs from the repo root, which IS the `app/` directory.
// Do not use __dirname — this file is ESM and it is undefined there.
const ROOT = process.cwd();

describe("tool group data", () => {
  it("gives every group a non-empty subtitle", () => {
    for (const group of TOOL_GROUPS) {
      expect(group.subtitle, `${group.label} has no subtitle`).toBeTruthy();
      expect(group.subtitle.trim().length).toBeGreaterThan(0);
    }
  });

  // Both index pages resolve `TOOL_GROUPS` ids against `TOOLS` and render
  // nothing when the lookup misses. That failure is silent — no build error,
  // no runtime error, the tool simply does not appear on either index. This
  // test is the only thing that catches it.
  it("places every tool in exactly one group", () => {
    const grouped = TOOL_GROUPS.flatMap((g) => g.tools as readonly string[]);

    const counts = new Map<string, number>();
    for (const id of grouped) counts.set(id, (counts.get(id) ?? 0) + 1);

    const duplicated = [...counts].filter(([, n]) => n > 1).map(([id]) => id);
    expect(duplicated, "tool ids listed in more than one group").toEqual([]);

    const ungrouped = TOOLS.filter((t) => !counts.has(t.id)).map((t) => t.id);
    expect(ungrouped, "tools in TOOLS that no group lists — these render nowhere").toEqual([]);

    const unknown = [...counts.keys()].filter((id) => !TOOLS.some((t) => t.id === id));
    expect(unknown, "ids listed in a group with no matching TOOLS entry").toEqual([]);
  });
});

describe("featured tool metadata", () => {
  // Verified against the live data on 2026-08-05. If a question or a
  // checklist item is added, this test fails and the card copy updates in
  // the same commit — which is the entire point of deriving it.
  it("derives its numbers from the tool data", () => {
    expect(FEATURED_TOOL_META["self-assessment"]).toBe("25 questions · 6 categories");
    expect(FEATURED_TOOL_META["fundraising-guide"]).toBe("42 steps · 5 stages");
  });

  it("covers every tool in the featured group", () => {
    for (const id of TOOL_GROUPS[0].tools) {
      expect(FEATURED_TOOL_META[id], `no featured meta for "${id}"`).toBeTruthy();
    }
  });
});

describe("tool card", () => {
  it("carries no shadow and no tinted icon tile", () => {
    const src = readFileSync(join(ROOT, "components/tools/tool-card.tsx"), "utf8");

    // The editorial system has no shadows; elevation is surface steps and
    // hairlines. design-tokens.test.ts sweeps this globally — asserting it
    // here documents that the card was written to the rule, not caught by it.
    expect(src).not.toMatch(/\bshadow-/);

    // The old card wrapped the Lucide icon in `p-2 rounded-md bg-primary/10`.
    // The redesign drops the tile entirely.
    expect(src).not.toMatch(/bg-primary\/10/);
  });
});

describe("index page copy", () => {
  // The "15 interactive financial tools" bug: a literal that silently went
  // wrong when the 16th tool shipped, including in indexed metadata.
  it("never states a literal tool count", () => {
    for (const rel of ["app/page.tsx", "app/tools/page.tsx"]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      const literals =
        src.match(/\b\d{1,3}\s+(interactive\s+)?(financial\s+)?(tools|calculators)\b/gi) ?? [];
      expect(literals, `${rel} states a literal tool count — use TOOLS.length`).toEqual([]);
    }
  });

  it("renders the shared index rather than inline cards", () => {
    for (const rel of ["app/page.tsx", "app/tools/page.tsx"]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      expect(src, `${rel} should render <ToolIndex>`).toMatch(/<ToolIndex/);
      expect(src, `${rel} still has inline shadcn card markup`).not.toMatch(/<CardHeader/);
    }
  });
});

describe("tool sidebar", () => {
  it("uses the shared eyebrow utility in both the desktop and mobile nav", () => {
    const src = readFileSync(join(ROOT, "components/layout/tool-sidebar.tsx"), "utf8");

    // Two group headers: one in the desktop <nav>, one in MobileToolNav.
    // They drifted apart before; this pins them together.
    const eyebrows = src.match(/\beyebrow\b/g) ?? [];
    expect(eyebrows.length, "both navs should use the eyebrow utility").toBe(2);

    // The old ad-hoc label style, replaced by `eyebrow`.
    expect(src).not.toMatch(/text-xs font-semibold text-muted-foreground uppercase/);
  });
});

import { describe, it, expect } from "vitest";
import { TOOLS, TOOL_GROUPS } from "@/lib/constants";
import { FEATURED_TOOL_META } from "@/lib/tool-meta";

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

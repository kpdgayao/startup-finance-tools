import { describe, it, expect } from "vitest";
import { CHART_COLORS } from "@/lib/constants";

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

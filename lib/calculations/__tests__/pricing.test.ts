import { describe, it, expect } from "vitest";
import {
  calculateCostPlus,
  calculateValueBased,
  calculatePenetrationPrice,
  calculateCompetitivePosition,
  calculateBundlePrice,
  convertBasisPercent,
  suggestPsychologicalPrice,
  type CostBreakdown,
} from "../pricing";

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeCosts(overrides: Partial<CostBreakdown> = {}): CostBreakdown {
  return {
    fixedCosts: 100_000,
    variableCostPerUnit: 50,
    expectedUnits: 1_000,
    ...overrides,
  };
}

// ─── calculateCostPlus ─────────────────────────────────────────────────────

describe("calculateCostPlus", () => {
  it("calculates price with margin on total cost", () => {
    const result = calculateCostPlus(makeCosts(), 50);
    // Total cost/unit = 100K/1K + 50 = 150. Price = 150 * 1.5 = 225
    expect(result.price).toBe(225);
  });

  it("profitPerUnit equals price minus unit cost", () => {
    const result = calculateCostPlus(makeCosts(), 50);
    expect(result.profitPerUnit).toBeCloseTo(result.price - 150, 2);
  });

  it("breakeven is fixed costs divided by contribution per unit", () => {
    const result = calculateCostPlus(makeCosts(), 50);
    // Contribution = 225 - 50 = 175. Breakeven = ceil(100K / 175) = 572
    expect(result.breakeven).toBe(Math.ceil(100_000 / result.contributionPerUnit));
  });

  it("handles zero expected units (uses variable cost only)", () => {
    const result = calculateCostPlus(makeCosts({ expectedUnits: 0 }), 100);
    // Total cost = 50 (variable only). Price = 50 * 2 = 100
    expect(result.price).toBe(100);
  });

  it("returns Infinity breakeven when contribution is zero or negative", () => {
    const result = calculateCostPlus(
      makeCosts({ variableCostPerUnit: 200, fixedCosts: 0 }),
      0
    );
    // Price = 200 (no margin, no fixed cost), contribution = 200 - 200 = 0
    expect(result.breakeven).toBe(Infinity);
  });

  it("zero margin returns cost as price", () => {
    const result = calculateCostPlus(makeCosts(), 0);
    expect(result.price).toBe(150);
  });
});

describe("calculateCostPlus — deck practice case", () => {
  const deck = { fixedCosts: 30_000, variableCostPerUnit: 60, expectedUnits: 600 };

  it("30% markup gives ₱143, which is a 23% margin", () => {
    const r = calculateCostPlus(deck, 30, "markup");
    expect(r.unitCost).toBe(110);
    expect(r.price).toBeCloseTo(143, 6);
    expect(r.markupPercent).toBeCloseTo(30, 6);
    expect(r.marginPercent).toBeCloseTo(23.08, 2);
    expect(r.breakeven).toBe(362);
  });

  it("30% margin gives ₱157, which is a 43% markup", () => {
    const r = calculateCostPlus(deck, 30, "margin");
    expect(r.price).toBeCloseTo(157.14, 2);
    expect(r.marginPercent).toBeCloseTo(30, 6);
    expect(r.markupPercent).toBeCloseTo(42.86, 2);
  });

  it("defaults to markup when no basis is given", () => {
    expect(calculateCostPlus(deck, 30).price).toBeCloseTo(143, 6);
  });

  it("margin of 100% or more prices at Infinity instead of going negative", () => {
    expect(calculateCostPlus(deck, 100, "margin").price).toBe(Infinity);
  });
});

describe("convertBasisPercent", () => {
  it("30% markup is a 23.1% margin", () => expect(convertBasisPercent(30, "markup", "margin")).toBe(23.1));
  it("30% margin is a 42.9% markup", () => expect(convertBasisPercent(30, "margin", "markup")).toBe(42.9));
  it("150% markup is a 60% margin (no clamping on the way)", () => expect(convertBasisPercent(150, "markup", "margin")).toBe(60));
  it("same basis is unchanged", () => expect(convertBasisPercent(37, "margin", "margin")).toBe(37));
  it("margin of 100 converts to the markup max of 500", () => expect(convertBasisPercent(100, "margin", "markup")).toBe(500));
});

// ─── calculateValueBased ───────────────────────────────────────────────────

describe("calculateValueBased", () => {
  it("applies discount from perceived value", () => {
    expect(calculateValueBased(1000, 20)).toBe(800);
  });

  it("zero discount returns full perceived value", () => {
    expect(calculateValueBased(1000, 0)).toBe(1000);
  });

  it("100% discount returns zero", () => {
    expect(calculateValueBased(1000, 100)).toBe(0);
  });
});

// ─── calculatePenetrationPrice ─────────────────────────────────────────────

describe("calculatePenetrationPrice", () => {
  it("discounts from market price", () => {
    expect(calculatePenetrationPrice(500, 30)).toBe(350);
  });

  it("zero discount returns market price", () => {
    expect(calculatePenetrationPrice(500, 0)).toBe(500);
  });
});

// ─── calculateCompetitivePosition ──────────────────────────────────────────

describe("calculateCompetitivePosition", () => {
  it("calculates min, max, average, and median", () => {
    const result = calculateCompetitivePosition([100, 200, 300, 400, 500]);
    expect(result.min).toBe(100);
    expect(result.max).toBe(500);
    expect(result.average).toBe(300);
    expect(result.median).toBe(300);
  });

  it("handles even-length arrays for median", () => {
    const result = calculateCompetitivePosition([100, 200, 300, 400]);
    expect(result.median).toBe(250);
  });

  it("returns all zeros for empty array", () => {
    const result = calculateCompetitivePosition([]);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
    expect(result.average).toBe(0);
    expect(result.median).toBe(0);
  });

  it("handles single price", () => {
    const result = calculateCompetitivePosition([250]);
    expect(result.min).toBe(250);
    expect(result.max).toBe(250);
    expect(result.average).toBe(250);
    expect(result.median).toBe(250);
  });
});

// ─── calculateBundlePrice ──────────────────────────────────────────────────

describe("calculateBundlePrice", () => {
  it("calculates bundle with discount", () => {
    const result = calculateBundlePrice([100, 200, 300], 10);
    expect(result.totalIndividual).toBe(600);
    expect(result.bundlePrice).toBe(540);
    expect(result.savings).toBe(60);
  });

  it("zero discount returns sum of prices", () => {
    const result = calculateBundlePrice([100, 200], 0);
    expect(result.bundlePrice).toBe(300);
    expect(result.savings).toBe(0);
  });

  it("handles empty prices array", () => {
    const result = calculateBundlePrice([], 10);
    expect(result.totalIndividual).toBe(0);
    expect(result.bundlePrice).toBe(0);
  });
});

// ─── suggestPsychologicalPrice ─────────────────────────────────────────────

describe("suggestPsychologicalPrice", () => {
  it("returns 0 for zero or negative price", () => {
    expect(suggestPsychologicalPrice(0)).toBe(0);
    expect(suggestPsychologicalPrice(-10)).toBe(0);
  });

  it("returns price ending in 9", () => {
    const result = suggestPsychologicalPrice(105);
    expect(result % 10).toBe(9);
    expect(result).toBeLessThanOrEqual(105);
  });

  it("keeps price already ending in 9", () => {
    expect(suggestPsychologicalPrice(99)).toBe(99);
    expect(suggestPsychologicalPrice(199)).toBe(199);
  });

  it("steps down to nearest 9-ending number", () => {
    const result = suggestPsychologicalPrice(100);
    expect(result).toBe(99);
  });
});

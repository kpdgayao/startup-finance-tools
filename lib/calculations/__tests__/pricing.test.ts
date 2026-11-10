import { describe, it, expect } from "vitest";
import {
  calculateCostPlus,
  calculateValueBased,
  calculatePenetrationPrice,
  calculateCompetitivePosition,
  calculateBundlePrice,
  convertBasisPercent,
  suggestCharmPrices,
  suggestPsychologicalPrice,
  comparePerMeasure,
  buildPriceLadder,
  formatShareLine,
  compareTwoPrices,
  sumSavings,
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
  it("a 90% margin (a 900% markup) caps at the markup max of 500", () => expect(convertBasisPercent(90, "margin", "markup")).toBe(500));
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

describe("suggestPsychologicalPrice — small prices", () => {
  it("never returns a negative price", () => {
    for (let p = 0.5; p <= 200; p += 0.5) {
      const r = suggestPsychologicalPrice(p);
      expect(r, `price ${p}`).toBeGreaterThanOrEqual(0);
      expect(r, `price ${p}`).toBeLessThanOrEqual(p);
    }
  });
  it("leaves a ₱5 add-on at ₱5", () => expect(suggestPsychologicalPrice(5)).toBe(5));
  it("₱9.50 becomes ₱9", () => expect(suggestPsychologicalPrice(9.5)).toBe(9));
});

describe("suggestCharmPrices", () => {
  it("₱143 → down ₱139, up ₱149", () => expect(suggestCharmPrices(143)).toEqual({ down: 139, up: 149 }));
  it("₱18 → down ₱9, up ₱19", () => expect(suggestCharmPrices(18)).toEqual({ down: 9, up: 19 }));
  it("₱99 → down ₱99, up ₱109", () => expect(suggestCharmPrices(99)).toEqual({ down: 99, up: 109 }));
  it("below ₱9 there is no charm price", () => {
    expect(suggestCharmPrices(5)).toBeNull();
    expect(suggestCharmPrices(0)).toBeNull();
  });
});

// ─── comparePerMeasure ─────────────────────────────────────────────────────

describe("comparePerMeasure — the deck's sachet benchmark", () => {
  const offers = [
    { id: "a", name: "Single-use pack, 100.5 ml", price: 31.2, size: 100.5 },
    { id: "b", name: "Refill hub, 30 ml", price: 4, size: 30 },
  ];
  it("₱143 per liter is ₱0.143 per ml", () => {
    expect(comparePerMeasure(offers, 143, 1000).yourPerMeasure).toBeCloseTo(0.143, 6);
  });
  it("beats the ₱0.31/ml pack and loses to the ₱0.13/ml refill", () => {
    const { rows } = comparePerMeasure(offers, 143, 1000);
    expect(rows[0].pricePerMeasure).toBeCloseTo(0.3104, 4);
    expect(rows[0].differencePercent).toBeCloseTo(-53.9, 1);
    expect(rows[1].pricePerMeasure).toBeCloseTo(0.1333, 4);
    expect(rows[1].differencePercent).toBeCloseTo(7.25, 2);
  });
  it("skips an offer with size 0 instead of dividing by it", () => {
    const { rows } = comparePerMeasure([...offers, { id: "c", name: "x", price: 5, size: 0 }], 143, 1000);
    expect(rows).toHaveLength(2);
  });
  it("your size of 0 gives zeros, not Infinity", () => {
    const r = comparePerMeasure(offers, 143, 0);
    expect(r.yourPerMeasure).toBe(0);
    expect(r.rows.every((row) => row.differencePercent === 0)).toBe(true);
  });
});

// ─── buildPriceLadder ──────────────────────────────────────────────────────

describe("buildPriceLadder", () => {
  const base = { unitCost: 110, costPlusPrice: 143, marketLow: 133.33, marketHigh: 310.45 };
  it("₱143 sits between the floor and the market high", () => {
    const r = buildPriceLadder({ ...base, chosen: 143 });
    expect(r.verdict).toBe("in-range");
    expect(r.anchors.map((a) => a.label)).toEqual([
      "Unit cost (floor)", "Lowest alternative", "Cost-plus price", "Your price", "Highest alternative",
    ]);
  });
  it("below unit cost is below-cost", () => expect(buildPriceLadder({ ...base, chosen: 100 }).verdict).toBe("below-cost"));
  it("above every alternative is above-market", () => expect(buildPriceLadder({ ...base, chosen: 400 }).verdict).toBe("above-market"));
  it("without market numbers nothing is above-market", () => {
    expect(buildPriceLadder({ unitCost: 110, costPlusPrice: 143, chosen: 9_999 }).verdict).toBe("in-range");
  });
});

// ─── formatShareLine ───────────────────────────────────────────────────────

describe("formatShareLine", () => {
  it("uses the deck's chat format", () => {
    expect(formatShareLine({ startup: "Ikot", product: "Dish soap refill", price: 143, unitName: "liter", strategy: "Cost-Plus", breakeven: 362 }))
      .toBe("Ikot · Dish soap refill · ₱143 per liter · Cost-Plus · Break-even 362");
  });
  it("fills blanks and shows N/A for an impossible break-even", () => {
    expect(formatShareLine({ startup: " ", product: "", price: 50, unitName: "", strategy: "Penetration", breakeven: Infinity }))
      .toBe("Startup · Product · ₱50 per unit · Penetration · Break-even N/A");
  });
});

// ─── compareTwoPrices ──────────────────────────────────────────────────────

describe("compareTwoPrices — slide 3", () => {
  it("+₱5 per liter adds ₱3,000 a month", () => {
    const r = compareTwoPrices(30_000, 60, { price: 143, volume: 600 }, { price: 148, volume: 600 });
    expect(r.profitA).toBe(19_800);
    expect(r.difference).toBe(3_000);
  });
  it("selling 5% more liters at ₱143 adds only ₱2,490", () => {
    expect(compareTwoPrices(30_000, 60, { price: 143, volume: 600 }, { price: 143, volume: 630 }).difference).toBe(2_490);
  });
  it("at ₱148 you need 566 liters to match ₱143 × 600", () => {
    expect(compareTwoPrices(30_000, 60, { price: 143, volume: 600 }, { price: 148, volume: 0 }).volumeBToMatchA).toBe(566);
  });
  it("needs no volume when A itself sells below variable cost", () => {
    expect(compareTwoPrices(30_000, 60, { price: 50, volume: 600 }, { price: 148, volume: 600 }).volumeBToMatchA).toBe(0);
  });
  it("a price at or below variable cost can never match", () => {
    expect(compareTwoPrices(30_000, 60, { price: 143, volume: 600 }, { price: 60, volume: 600 }).volumeBToMatchA).toBe(Infinity);
  });
});

describe("sumSavings", () => {
  it("adds the customer's monthly savings", () => {
    expect(sumSavings([{ id: "1", name: "a", amount: 6_000 }, { id: "2", name: "b", amount: 2_500 }, { id: "3", name: "c", amount: 1_500 }])).toBe(10_000);
  });
  it("ignores negative entries", () => expect(sumSavings([{ id: "1", name: "a", amount: -50 }])).toBe(0));
});

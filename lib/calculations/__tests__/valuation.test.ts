import { describe, it, expect } from "vitest";
import {
  calculateDCF,
  calculateBerkus,
  calculateScorecard,
  calculateVCMethod,
  calculateRevenueMultiple,
  type DCFInputs,
  type BerkusFactor,
  type ScorecardFactor,
  type VCMethodInputs,
  type RevenueMultipleInputs,
} from "../valuation";

// ─── DCF ────────────────────────────────────────────────────────────────────

describe("calculateDCF", () => {
  function makeDCF(overrides: Partial<DCFInputs> = {}): DCFInputs {
    return {
      cashFlows: [100_000, 120_000, 150_000, 180_000, 200_000],
      discountRate: 15,
      terminalGrowthRate: 3,
      ...overrides,
    };
  }

  it("returns a positive NPV for growing cash flows", () => {
    const result = calculateDCF(makeDCF());
    expect(result).toBeGreaterThan(0);
  });

  it("returns 0 for empty cash flows", () => {
    const result = calculateDCF(makeDCF({ cashFlows: [] }));
    expect(result).toBe(0);
  });

  it("higher discount rate produces lower valuation", () => {
    const low = calculateDCF(makeDCF({ discountRate: 10 }));
    const high = calculateDCF(makeDCF({ discountRate: 30 }));
    expect(low).toBeGreaterThan(high);
  });

  it("higher growth rate produces higher valuation (when rate > g)", () => {
    const low = calculateDCF(makeDCF({ terminalGrowthRate: 2 }));
    const high = calculateDCF(makeDCF({ terminalGrowthRate: 5 }));
    expect(high).toBeGreaterThan(low);
  });

  it("skips terminal value when discount rate <= growth rate", () => {
    const result = calculateDCF(makeDCF({ discountRate: 3, terminalGrowthRate: 3 }));
    // Should still return NPV of cash flows without terminal value
    expect(result).toBeGreaterThan(0);
  });

  it("never returns negative values", () => {
    const result = calculateDCF(makeDCF({ cashFlows: [-100_000, -200_000] }));
    expect(result).toBe(0);
  });

  it("single cash flow discounts correctly", () => {
    const result = calculateDCF({ cashFlows: [1000], discountRate: 10, terminalGrowthRate: 0 });
    // NPV of 1000 at 10% = 1000/1.1 ≈ 909.09 + terminal value
    expect(result).toBeGreaterThan(909);
  });
});

// ─── Berkus ─────────────────────────────────────────────────────────────────

describe("calculateBerkus", () => {
  it("sums all factor values", () => {
    const factors: BerkusFactor[] = [
      { id: "a", label: "Sound Idea", value: 300_000, maxValue: 500_000 },
      { id: "b", label: "Prototype", value: 200_000, maxValue: 500_000 },
    ];
    expect(calculateBerkus(factors)).toBe(500_000);
  });

  it("caps each factor at its maxValue", () => {
    const factors: BerkusFactor[] = [
      { id: "a", label: "Sound Idea", value: 900_000, maxValue: 500_000 },
    ];
    expect(calculateBerkus(factors)).toBe(500_000);
  });

  it("returns 0 for empty factors", () => {
    expect(calculateBerkus([])).toBe(0);
  });

  it("handles zero-value factors", () => {
    const factors: BerkusFactor[] = [
      { id: "a", label: "Sound Idea", value: 0, maxValue: 500_000 },
      { id: "b", label: "Prototype", value: 500_000, maxValue: 500_000 },
    ];
    expect(calculateBerkus(factors)).toBe(500_000);
  });

  it("total never exceeds sum of maxValues", () => {
    const factors: BerkusFactor[] = [
      { id: "a", label: "A", value: 1_000_000, maxValue: 500_000 },
      { id: "b", label: "B", value: 1_000_000, maxValue: 500_000 },
    ];
    expect(calculateBerkus(factors)).toBe(1_000_000);
  });
});

// ─── Scorecard ──────────────────────────────────────────────────────────────

describe("calculateScorecard", () => {
  it("returns median when all scores are 1.0", () => {
    const factors: ScorecardFactor[] = [
      { id: "a", label: "Team", weight: 30, score: 1.0 },
      { id: "b", label: "Market", weight: 70, score: 1.0 },
    ];
    expect(calculateScorecard(factors, 5_000_000)).toBe(5_000_000);
  });

  it("adjusts valuation based on weighted scores", () => {
    const factors: ScorecardFactor[] = [
      { id: "a", label: "Team", weight: 50, score: 1.5 },
      { id: "b", label: "Market", weight: 50, score: 0.5 },
    ];
    // Weighted: 0.5*1.5 + 0.5*0.5 = 0.75 + 0.25 = 1.0
    expect(calculateScorecard(factors, 5_000_000)).toBe(5_000_000);
  });

  it("above-average scores increase valuation", () => {
    const factors: ScorecardFactor[] = [
      { id: "a", label: "Team", weight: 100, score: 1.5 },
    ];
    expect(calculateScorecard(factors, 5_000_000)).toBe(7_500_000);
  });

  it("returns median when total weight is zero", () => {
    const factors: ScorecardFactor[] = [
      { id: "a", label: "Team", weight: 0, score: 1.5 },
    ];
    expect(calculateScorecard(factors, 5_000_000)).toBe(5_000_000);
  });

  it("normalizes weights that don't sum to 100", () => {
    const factors: ScorecardFactor[] = [
      { id: "a", label: "Team", weight: 25, score: 2.0 },
      { id: "b", label: "Market", weight: 25, score: 1.0 },
    ];
    // Normalized: 0.5*2.0 + 0.5*1.0 = 1.5
    expect(calculateScorecard(factors, 4_000_000)).toBe(6_000_000);
  });
});

// ─── VC Method ──────────────────────────────────────────────────────────────

describe("calculateVCMethod", () => {
  function makeVC(overrides: Partial<VCMethodInputs> = {}): VCMethodInputs {
    return {
      expectedExitValue: 100_000_000,
      targetReturnMultiple: 10,
      expectedDilution: 30,
      ...overrides,
    };
  }

  it("returns positive valuation for valid inputs", () => {
    const result = calculateVCMethod(makeVC());
    expect(result).toBeGreaterThan(0);
  });

  it("higher exit value produces higher valuation", () => {
    const low = calculateVCMethod(makeVC({ expectedExitValue: 50_000_000 }));
    const high = calculateVCMethod(makeVC({ expectedExitValue: 200_000_000 }));
    expect(high).toBeGreaterThan(low);
  });

  it("higher return multiple produces lower valuation", () => {
    const low = calculateVCMethod(makeVC({ targetReturnMultiple: 20 }));
    const high = calculateVCMethod(makeVC({ targetReturnMultiple: 5 }));
    expect(high).toBeGreaterThan(low);
  });

  it("returns 0 when target return multiple is zero", () => {
    expect(calculateVCMethod(makeVC({ targetReturnMultiple: 0 }))).toBe(0);
  });

  it("returns 0 when retention factor is zero (100% dilution)", () => {
    expect(calculateVCMethod(makeVC({ expectedDilution: 100 }))).toBe(0);
  });

  it("higher dilution increases post-money (VC needs more ownership)", () => {
    const highDilution = calculateVCMethod(makeVC({ expectedDilution: 50 }));
    const lowDilution = calculateVCMethod(makeVC({ expectedDilution: 10 }));
    expect(highDilution).toBeGreaterThan(lowDilution);
  });
});

// ─── Revenue Multiple ───────────────────────────────────────────────────────

describe("calculateRevenueMultiple", () => {
  it("multiplies revenue by the multiple", () => {
    const inputs: RevenueMultipleInputs = { annualRevenue: 1_000_000, revenueMultiple: 5 };
    expect(calculateRevenueMultiple(inputs)).toBe(5_000_000);
  });

  it("returns 0 for zero revenue", () => {
    const inputs: RevenueMultipleInputs = { annualRevenue: 0, revenueMultiple: 5 };
    expect(calculateRevenueMultiple(inputs)).toBe(0);
  });

  it("returns 0 for zero multiple", () => {
    const inputs: RevenueMultipleInputs = { annualRevenue: 1_000_000, revenueMultiple: 0 };
    expect(calculateRevenueMultiple(inputs)).toBe(0);
  });

  it("handles SaaS-typical 6x multiple", () => {
    const inputs: RevenueMultipleInputs = { annualRevenue: 2_000_000, revenueMultiple: 6 };
    expect(calculateRevenueMultiple(inputs)).toBe(12_000_000);
  });
});

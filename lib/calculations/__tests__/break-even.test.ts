import { describe, it, expect } from "vitest";
import {
  calculateBreakEven,
  generateBreakEvenChartData,
  type BreakEvenInputs,
} from "../break-even";

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeInputs(overrides: Partial<BreakEvenInputs> = {}): BreakEvenInputs {
  return {
    fixedCostsMonthly: 100_000,
    variableCostPerUnit: 30,
    sellingPricePerUnit: 50,
    ...overrides,
  };
}

// ─── calculateBreakEven ────────────────────────────────────────────────────

describe("calculateBreakEven", () => {
  it("calculates break-even units correctly", () => {
    const result = calculateBreakEven(makeInputs());
    // CM = 50 - 30 = 20. BE = ceil(100K / 20) = 5000
    expect(result!.breakEvenUnits).toBe(5000);
  });

  it("calculates break-even revenue", () => {
    const result = calculateBreakEven(makeInputs());
    expect(result!.breakEvenRevenue).toBe(250_000); // 5000 * 50
  });

  it("calculates contribution margin per unit", () => {
    const result = calculateBreakEven(makeInputs());
    expect(result!.contributionMarginPerUnit).toBe(20);
  });

  it("calculates contribution margin ratio", () => {
    const result = calculateBreakEven(makeInputs());
    expect(result!.contributionMarginRatio).toBe(0.4); // 20/50
  });

  it("returns null when selling price is zero", () => {
    expect(calculateBreakEven(makeInputs({ sellingPricePerUnit: 0 }))).toBeNull();
  });

  it("returns null when selling price is negative", () => {
    expect(calculateBreakEven(makeInputs({ sellingPricePerUnit: -10 }))).toBeNull();
  });

  it("returns null when variable cost exceeds selling price", () => {
    expect(
      calculateBreakEven(makeInputs({ variableCostPerUnit: 60, sellingPricePerUnit: 50 }))
    ).toBeNull();
  });

  it("returns null when variable cost equals selling price", () => {
    expect(
      calculateBreakEven(makeInputs({ variableCostPerUnit: 50, sellingPricePerUnit: 50 }))
    ).toBeNull();
  });

  it("calculates margin of safety when current volume provided", () => {
    const result = calculateBreakEven(makeInputs({ currentMonthlyVolume: 8000 }));
    expect(result!.marginOfSafety).toBe(3000); // 8000 - 5000
    expect(result!.marginOfSafetyPercent).toBeCloseTo(37.5, 1);
  });

  it("margin of safety is null without current volume", () => {
    const result = calculateBreakEven(makeInputs());
    expect(result!.marginOfSafety).toBeNull();
    expect(result!.marginOfSafetyPercent).toBeNull();
  });

  it("calculates target profit units when margin specified", () => {
    const result = calculateBreakEven(makeInputs({ targetProfitMargin: 10 }));
    // Adjusted CM = 20 - (10% * 50) = 20 - 5 = 15
    // Target units = ceil(100K / 15) = 6667
    expect(result!.targetProfitUnits).toBe(6667);
  });

  it("target profit is null when no margin specified", () => {
    const result = calculateBreakEven(makeInputs());
    expect(result!.targetProfitUnits).toBeNull();
    expect(result!.targetProfitRevenue).toBeNull();
  });

  it("target profit is null when adjusted CM is non-positive", () => {
    // CM = 20, target margin = 50% of 50 = 25. Adjusted CM = 20 - 25 = -5
    const result = calculateBreakEven(makeInputs({ targetProfitMargin: 50 }));
    expect(result!.targetProfitUnits).toBeNull();
  });
});

// ─── generateBreakEvenChartData ────────────────────────────────────────────

describe("generateBreakEvenChartData", () => {
  it("returns chart points from 0 to maxUnits", () => {
    const data = generateBreakEvenChartData(makeInputs(), 10000);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].units).toBe(0);
  });

  it("first point has zero revenue and only fixed costs", () => {
    const data = generateBreakEvenChartData(makeInputs(), 10000);
    expect(data[0].revenue).toBe(0);
    expect(data[0].totalCost).toBe(100_000); // fixed costs only
  });

  it("profit transitions from negative to positive at break-even", () => {
    const data = generateBreakEvenChartData(makeInputs(), 10000);
    const negativePoints = data.filter((p) => p.profit < 0);
    const positivePoints = data.filter((p) => p.profit >= 0);
    expect(negativePoints.length).toBeGreaterThan(0);
    expect(positivePoints.length).toBeGreaterThan(0);
  });

  it("revenue increases linearly with units", () => {
    const data = generateBreakEvenChartData(makeInputs(), 10000);
    if (data.length >= 2) {
      const step1 = data[1].revenue - data[0].revenue;
      const step2 = data[2].revenue - data[1].revenue;
      expect(step1).toBeCloseTo(step2, 2);
    }
  });
});

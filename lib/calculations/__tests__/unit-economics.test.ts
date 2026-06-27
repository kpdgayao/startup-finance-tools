import { describe, it, expect } from "vitest";
import {
  calculateUnitEconomics,
  generateSensitivity,
  type UnitEconomicsInputs,
} from "../unit-economics";

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeInputs(overrides: Partial<UnitEconomicsInputs> = {}): UnitEconomicsInputs {
  return {
    monthlyMarketingSpend: 100_000,
    newCustomersPerMonth: 200,
    revenuePerCustomer: 500,
    grossMarginPercent: 60,
    monthlyChurnRate: 5,
    ...overrides,
  };
}

// ─── calculateUnitEconomics ────────────────────────────────────────────────

describe("calculateUnitEconomics", () => {
  it("calculates CAC correctly", () => {
    const result = calculateUnitEconomics(makeInputs());
    expect(result.cac).toBe(500); // 100K / 200
  });

  it("ARPU equals revenue per customer", () => {
    const result = calculateUnitEconomics(makeInputs());
    expect(result.arpu).toBe(500);
  });

  it("average lifetime is 1/churn rate", () => {
    const result = calculateUnitEconomics(makeInputs());
    expect(result.avgLifetimeMonths).toBe(20); // 1 / 0.05
  });

  it("LTV is monthly gross profit times lifetime", () => {
    const result = calculateUnitEconomics(makeInputs());
    // Monthly GP = 500 * 60% = 300. LTV = 300 * 20 = 6000
    expect(result.ltv).toBe(6000);
  });

  it("LTV:CAC ratio is LTV divided by CAC", () => {
    const result = calculateUnitEconomics(makeInputs());
    expect(result.ltvCacRatio).toBe(12); // 6000 / 500
  });

  it("payback months is CAC divided by monthly gross profit", () => {
    const result = calculateUnitEconomics(makeInputs());
    expect(result.paybackMonths).toBeCloseTo(1.667, 2); // 500 / 300
  });

  it("break-even customers is marketing spend divided by monthly GP", () => {
    const result = calculateUnitEconomics(makeInputs());
    expect(result.breakEvenCustomers).toBe(Math.ceil(100_000 / 300)); // 334
  });

  it("zero new customers gives zero CAC", () => {
    const result = calculateUnitEconomics(makeInputs({ newCustomersPerMonth: 0 }));
    expect(result.cac).toBe(0);
  });

  it("zero churn gives Infinity lifetime", () => {
    const result = calculateUnitEconomics(makeInputs({ monthlyChurnRate: 0 }));
    expect(result.avgLifetimeMonths).toBe(Infinity);
    expect(result.ltv).toBe(Infinity);
  });

  it("zero gross margin gives Infinity payback", () => {
    const result = calculateUnitEconomics(makeInputs({ grossMarginPercent: 0 }));
    expect(result.paybackMonths).toBe(Infinity);
    expect(result.breakEvenCustomers).toBe(Infinity);
  });

  it("monthly gross profit is ARPU times margin percent", () => {
    const result = calculateUnitEconomics(makeInputs());
    expect(result.monthlyGrossProfit).toBe(300); // 500 * 60%
  });
});

// ─── generateSensitivity ───────────────────────────────────────────────────

describe("generateSensitivity", () => {
  it("returns one point per churn rate", () => {
    const result = generateSensitivity(makeInputs(), [2, 5, 10]);
    expect(result).toHaveLength(3);
  });

  it("lower churn gives higher LTV", () => {
    const result = generateSensitivity(makeInputs(), [2, 10]);
    expect(result[0].ltv).toBeGreaterThan(result[1].ltv);
  });

  it("Infinity LTV is replaced with 0 in sensitivity", () => {
    const result = generateSensitivity(makeInputs(), [0]);
    expect(result[0].ltv).toBe(0);
    expect(result[0].ltvCacRatio).toBe(0);
  });

  it("each point preserves its churn rate", () => {
    const churns = [1, 3, 5, 8];
    const result = generateSensitivity(makeInputs(), churns);
    expect(result.map((r) => r.churnRate)).toEqual(churns);
  });
});

import { describe, it, expect } from "vitest";
import {
  calculateBurnRate,
  projectCashBalance,
  projectWithAdjustments,
  getRunwayZone,
  type BurnRateInputs,
} from "../burn-rate";

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeInputs(overrides: Partial<BurnRateInputs> = {}): BurnRateInputs {
  return {
    cashBalance: 1_000_000,
    monthlyRevenue: 200_000,
    monthlyExpenses: 300_000,
    ...overrides,
  };
}

// ─── calculateBurnRate ─────────────────────────────────────────────────────

describe("calculateBurnRate", () => {
  it("calculates gross burn as total monthly expenses", () => {
    const result = calculateBurnRate(makeInputs());
    expect(result.grossBurn).toBe(300_000);
  });

  it("calculates net burn as expenses minus revenue", () => {
    const result = calculateBurnRate(makeInputs());
    expect(result.netBurn).toBe(100_000);
  });

  it("calculates runway as cash divided by net burn", () => {
    const result = calculateBurnRate(makeInputs());
    expect(result.runway).toBe(10); // 1M / 100K
  });

  it("returns Infinity runway when revenue exceeds expenses", () => {
    const result = calculateBurnRate(
      makeInputs({ monthlyRevenue: 500_000, monthlyExpenses: 300_000 })
    );
    expect(result.runway).toBe(Infinity);
  });

  it("returns Infinity runway when revenue equals expenses", () => {
    const result = calculateBurnRate(
      makeInputs({ monthlyRevenue: 300_000, monthlyExpenses: 300_000 })
    );
    expect(result.runway).toBe(Infinity);
  });

  it("returns Infinity runway when net burn is zero", () => {
    const result = calculateBurnRate(
      makeInputs({ monthlyRevenue: 0, monthlyExpenses: 0 })
    );
    expect(result.runway).toBe(Infinity);
  });

  it("handles zero cash balance", () => {
    const result = calculateBurnRate(makeInputs({ cashBalance: 0 }));
    expect(result.runway).toBe(0);
  });

  it("preserves monthlyRevenue in result", () => {
    const result = calculateBurnRate(makeInputs({ monthlyRevenue: 420_000 }));
    expect(result.monthlyRevenue).toBe(420_000);
  });
});

// ─── projectCashBalance ────────────────────────────────────────────────────

describe("projectCashBalance", () => {
  it("returns correct number of projections (default 24 months + initial)", () => {
    const result = projectCashBalance(1_000_000, 200_000, 300_000);
    expect(result).toHaveLength(25); // 0..24
  });

  it("month 0 has starting balance with zero flows", () => {
    const result = projectCashBalance(1_000_000, 200_000, 300_000);
    expect(result[0].month).toBe(0);
    expect(result[0].balance).toBe(1_000_000);
    expect(result[0].revenue).toBe(0);
    expect(result[0].expenses).toBe(0);
  });

  it("month 1 reflects first month of operations", () => {
    const result = projectCashBalance(1_000_000, 200_000, 300_000);
    expect(result[1].month).toBe(1);
    expect(result[1].balance).toBe(900_000); // 1M + 200K - 300K
    expect(result[1].netCashFlow).toBe(-100_000);
  });

  it("custom months parameter works", () => {
    const result = projectCashBalance(1_000_000, 200_000, 300_000, 6);
    expect(result).toHaveLength(7); // 0..6
  });

  it("balance chain is consistent across months", () => {
    const result = projectCashBalance(1_000_000, 200_000, 300_000);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].balance).toBeCloseTo(
        result[i - 1].balance + result[i].netCashFlow,
        2
      );
    }
  });

  it("allows negative balance (no floor)", () => {
    const result = projectCashBalance(100_000, 0, 50_000, 3);
    expect(result[3].balance).toBe(-50_000);
  });
});

// ─── projectWithAdjustments ───────────────────────────────────────────────

describe("projectWithAdjustments", () => {
  it("applies expense cut correctly", () => {
    const result = projectWithAdjustments(1_000_000, 200_000, 300_000, 50, 0);
    // Expenses: 300K * 0.5 = 150K, Revenue: 200K, Net: +50K
    expect(result[1].netCashFlow).toBe(50_000);
  });

  it("applies revenue increase correctly", () => {
    const result = projectWithAdjustments(1_000_000, 200_000, 300_000, 0, 100);
    // Revenue: 200K * 2 = 400K, Expenses: 300K, Net: +100K
    expect(result[1].netCashFlow).toBe(100_000);
  });

  it("applies both adjustments simultaneously", () => {
    const result = projectWithAdjustments(1_000_000, 200_000, 300_000, 20, 50);
    // Revenue: 200K * 1.5 = 300K, Expenses: 300K * 0.8 = 240K, Net: +60K
    expect(result[1].netCashFlow).toBe(60_000);
  });

  it("zero adjustments equal unadjusted projection", () => {
    const adjusted = projectWithAdjustments(1_000_000, 200_000, 300_000, 0, 0);
    const original = projectCashBalance(1_000_000, 200_000, 300_000);
    expect(adjusted[1].balance).toBeCloseTo(original[1].balance, 2);
  });
});

// ─── getRunwayZone ─────────────────────────────────────────────────────────

describe("getRunwayZone", () => {
  it("returns red for less than 3 months", () => {
    expect(getRunwayZone(0)).toBe("red");
    expect(getRunwayZone(1)).toBe("red");
    expect(getRunwayZone(2.9)).toBe("red");
  });

  it("returns yellow for 3 to less than 6 months", () => {
    expect(getRunwayZone(3)).toBe("yellow");
    expect(getRunwayZone(4.5)).toBe("yellow");
    expect(getRunwayZone(5.99)).toBe("yellow");
  });

  it("returns green for 6+ months", () => {
    expect(getRunwayZone(6)).toBe("green");
    expect(getRunwayZone(12)).toBe("green");
    expect(getRunwayZone(24)).toBe("green");
  });

  it("returns green for Infinity", () => {
    expect(getRunwayZone(Infinity)).toBe("green");
  });
});

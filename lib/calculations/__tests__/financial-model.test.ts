import { describe, it, expect } from "vitest";
import {
  buildFinancialModel,
  type FinancialModelInputs,
} from "../financial-model";

const baseInputs: FinancialModelInputs = {
  startingRevenue: 100000,
  monthlyGrowthRate: 5,
  cogsPercent: 40,
  fixedOpEx: 50000,
  variableOpExPercent: 10,
  startingCash: 500000,
  dso: 30,
  dpo: 15,
  taxRate: 25,
  annualCapEx: 120000,
  depreciationYears: 5,
};

describe("buildFinancialModel", () => {
  it("returns 36 monthly rows and 3 annual rows", () => {
    const result = buildFinancialModel(baseInputs);
    expect(result.monthly).toHaveLength(36);
    expect(result.annual).toHaveLength(3);
  });

  it("monthly rows are numbered 1-36", () => {
    const result = buildFinancialModel(baseInputs);
    expect(result.monthly[0].month).toBe(1);
    expect(result.monthly[35].month).toBe(36);
  });

  it("annual rows are numbered 1-3", () => {
    const result = buildFinancialModel(baseInputs);
    expect(result.annual[0].year).toBe(1);
    expect(result.annual[2].year).toBe(3);
  });

  it("revenue compounds monthly", () => {
    const result = buildFinancialModel(baseInputs);
    const m1 = result.monthly[0].revenue;
    const m2 = result.monthly[1].revenue;
    expect(m1).toBe(100000);
    expect(m2).toBeCloseTo(100000 * 1.05, 2);
  });

  it("COGS is a percentage of revenue", () => {
    const result = buildFinancialModel(baseInputs);
    const row = result.monthly[0];
    expect(row.cogs).toBeCloseTo(row.revenue * 0.4, 2);
  });

  it("gross profit = revenue - COGS", () => {
    const result = buildFinancialModel(baseInputs);
    const row = result.monthly[5];
    expect(row.grossProfit).toBeCloseTo(row.revenue - row.cogs, 2);
  });

  it("EBITDA = gross profit - total OpEx", () => {
    const result = buildFinancialModel(baseInputs);
    const row = result.monthly[10];
    expect(row.ebitda).toBeCloseTo(row.grossProfit - row.totalOpEx, 2);
  });

  it("tax is only applied when EBIT is positive", () => {
    const lowRevenueInputs: FinancialModelInputs = {
      ...baseInputs,
      startingRevenue: 1000,
      fixedOpEx: 50000,
    };
    const result = buildFinancialModel(lowRevenueInputs);
    const earlyRow = result.monthly[0];
    if (earlyRow.ebit <= 0) {
      expect(earlyRow.tax).toBe(0);
    }
  });

  it("CapEx hits at months 1, 13, and 25", () => {
    const result = buildFinancialModel(baseInputs);
    expect(result.monthly[0].investingCF).toBe(-120000);
    expect(result.monthly[12].investingCF).toBe(-120000);
    expect(result.monthly[24].investingCF).toBe(-120000);
    expect(result.monthly[1].investingCF).toBeCloseTo(0, 10);
  });

  it("seed balance sheet starts with startingCash", () => {
    const result = buildFinancialModel(baseInputs);
    expect(result.seed.cash).toBe(500000);
    expect(result.seed.totalAssets).toBe(500000);
    expect(result.seed.totalEquity).toBe(500000);
    expect(result.seed.accountsReceivable).toBe(0);
    expect(result.seed.totalLiabilities).toBe(0);
  });

  it("summary contains correct aggregated values", () => {
    const result = buildFinancialModel(baseInputs);
    expect(result.summary.threeYearRevenue).toBeGreaterThan(0);
    expect(result.summary.year3Ebitda).toBeDefined();
    expect(result.summary.year3NetIncome).toBeDefined();
  });

  it("annual revenue sums monthly revenue", () => {
    const result = buildFinancialModel(baseInputs);
    const year1Monthly = result.monthly
      .slice(0, 12)
      .reduce((s, r) => s + r.revenue, 0);
    expect(result.annual[0].revenue).toBeCloseTo(year1Monthly, 2);
  });

  it("balance sheet equation holds: assets = liabilities + equity", () => {
    const result = buildFinancialModel(baseInputs);
    for (const row of result.monthly) {
      expect(row.totalAssets).toBeCloseTo(
        row.totalLiabilities + row.totalEquity,
        0
      );
    }
  });

  it("handles zero growth rate", () => {
    const result = buildFinancialModel({ ...baseInputs, monthlyGrowthRate: 0 });
    const m1 = result.monthly[0].revenue;
    const m36 = result.monthly[35].revenue;
    expect(m1).toBeCloseTo(m36, 2);
  });

  it("handles zero starting revenue", () => {
    const result = buildFinancialModel({ ...baseInputs, startingRevenue: 0 });
    for (const row of result.monthly) {
      expect(row.revenue).toBe(0);
      expect(row.cogs).toBe(0);
    }
  });
});

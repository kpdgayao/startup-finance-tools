import { describe, it, expect } from "vitest";
import {
  buildMsmeFinancialPlan,
  DEFAULT_SCENARIOS,
  type MsmeFinancialPlanInputs,
} from "../msme-financial-plan";

function makeInputs(overrides: Partial<MsmeFinancialPlanInputs> = {}): MsmeFinancialPlanInputs {
  return {
    entityType: "cooperative",
    startingCapital: 500_000,
    horizonYears: 5,
    revenueModel: "lump-sum",
    startingAnnualRevenue: 1_500_000,
    annualGrowthRate: 15,
    startingUnits: 5_000,
    unitPrice: 250,
    unitGrowthRate: 12,
    priceGrowthRate: 3,
    cogsPercent: 50,
    opex: {
      rent: 180_000,
      utilities: 60_000,
      salaries: 720_000,
      marketing: 80_000,
      transportation: 40_000,
      supplies: 30_000,
      insurance: 20_000,
      other: 30_000,
    },
    opexAnnualGrowth: 5,
    daysToCollect: 30,
    daysToPay: 30,
    inventoryDays: 45,
    capExSchedule: [300_000, 50_000, 100_000, 0, 50_000],
    usefulLifeYears: 5,
    loanEnabled: true,
    loanPrincipal: 500_000,
    loanInterestRate: 10,
    loanTermYears: 5,
    loanGracePeriodYears: 1,
    taxRate: 20,
    distributionPercent: 25,
    scenarios: DEFAULT_SCENARIOS,
    ...overrides,
  };
}

function bsBalances(annual: { totalAssets: number; totalLiabilities: number; totalEquity: number }[]) {
  return annual.every(
    (r) => Math.abs(r.totalAssets - (r.totalLiabilities + r.totalEquity)) < 1
  );
}

describe("buildMsmeFinancialPlan", () => {
  it("returns three scenarios with the requested horizon length", () => {
    const result = buildMsmeFinancialPlan(makeInputs());
    expect(Object.keys(result.scenarios)).toEqual(["conservative", "base", "optimistic"]);
    expect(result.scenarios.base.annual).toHaveLength(5);
    expect(result.scenarios.base.sce).toHaveLength(5);
  });

  it("balances the Balance Sheet every year, every scenario, under defaults", () => {
    const result = buildMsmeFinancialPlan(makeInputs());
    expect(bsBalances(result.scenarios.conservative.annual)).toBe(true);
    expect(bsBalances(result.scenarios.base.annual)).toBe(true);
    expect(bsBalances(result.scenarios.optimistic.annual)).toBe(true);
  });

  it("balances under zero capex and zero loan", () => {
    const result = buildMsmeFinancialPlan(
      makeInputs({
        loanEnabled: false,
        capExSchedule: [0, 0, 0, 0, 0],
      })
    );
    expect(bsBalances(result.scenarios.base.annual)).toBe(true);
  });

  it("balances under aggressive growth (50%/yr) and 100% distribution", () => {
    const result = buildMsmeFinancialPlan(
      makeInputs({
        annualGrowthRate: 50,
        distributionPercent: 100,
      })
    );
    expect(bsBalances(result.scenarios.optimistic.annual)).toBe(true);
  });

  it("balances under 7-year horizon", () => {
    const result = buildMsmeFinancialPlan(
      makeInputs({
        horizonYears: 7,
        capExSchedule: [300_000, 50_000, 100_000, 0, 50_000, 0, 100_000],
      })
    );
    expect(result.scenarios.base.annual).toHaveLength(7);
    expect(bsBalances(result.scenarios.base.annual)).toBe(true);
  });

  it("amortizes loan to zero by end of term (no grace)", () => {
    const result = buildMsmeFinancialPlan(
      makeInputs({
        loanEnabled: true,
        loanPrincipal: 1_000_000,
        loanTermYears: 5,
        loanGracePeriodYears: 0,
      })
    );
    const finalLoan = result.scenarios.base.annual[4].loanBalance;
    expect(finalLoan).toBeLessThan(1);
  });

  it("respects loan grace period (no principal payment in grace year)", () => {
    const result = buildMsmeFinancialPlan(
      makeInputs({
        loanEnabled: true,
        loanPrincipal: 1_000_000,
        loanTermYears: 5,
        loanGracePeriodYears: 1,
      })
    );
    expect(result.scenarios.base.annual[0].loanBalance).toBe(1_000_000);
  });

  it("computes lump-sum and units-x-price revenue identically when configured equivalently", () => {
    const lump = buildMsmeFinancialPlan(
      makeInputs({
        revenueModel: "lump-sum",
        startingAnnualRevenue: 1_000_000,
        annualGrowthRate: 10,
      })
    );
    const units = buildMsmeFinancialPlan(
      makeInputs({
        revenueModel: "units-x-price",
        startingUnits: 1000,
        unitPrice: 1000,
        unitGrowthRate: 10,
        priceGrowthRate: 0,
      })
    );
    for (let y = 0; y < 5; y++) {
      expect(lump.scenarios.base.annual[y].revenue).toBeCloseTo(
        units.scenarios.base.annual[y].revenue,
        2
      );
    }
  });

  it("conservative scenario has lower final-year revenue than base", () => {
    const result = buildMsmeFinancialPlan(makeInputs());
    expect(result.scenarios.conservative.summary.finalYearNetIncome).toBeLessThan(
      result.scenarios.base.summary.finalYearNetIncome
    );
  });

  it("optimistic scenario has higher final-year cash than conservative", () => {
    const result = buildMsmeFinancialPlan(makeInputs());
    expect(result.scenarios.optimistic.summary.finalYearCash).toBeGreaterThan(
      result.scenarios.conservative.summary.finalYearCash
    );
  });
});

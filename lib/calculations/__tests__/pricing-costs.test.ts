import { describe, it, expect } from "vitest";
import {
  summarizeCosts,
  calculateMonthlyOutcome,
  REFILL_STATION_EXAMPLE,
  MISSED_COSTS,
  type CostLine,
} from "../pricing-costs";

function line(o: Partial<CostLine>): CostLine {
  return { id: "t", name: "t", category: "overhead", behavior: "variable", amount: 0, ...o };
}

describe("pricing-costs", () => {
  it("the refill-station example matches Exercise 2: ₱30,000 fixed and ₱60 per liter", () => {
    const s = summarizeCosts(REFILL_STATION_EXAMPLE);
    expect(s.fixedMonthly).toBe(30_000);
    expect(s.variablePerUnit).toBe(60);
    expect(s.hasTakeBackCosts).toBe(true);
  });

  it("a ₱48,000 dispenser over 24 months is ₱2,000 a month", () => {
    expect(summarizeCosts([line({ behavior: "one-time", amount: 48_000, lifeMonths: 24 })]).fixedMonthly).toBe(2_000);
  });

  it("a ₱50 bottle used 10 times is ₱5 per unit", () => {
    expect(summarizeCosts([line({ behavior: "per-use", amount: 50, uses: 10 })]).variablePerUnit).toBe(5);
  });

  it("0 months or 0 uses count as 1, never Infinity", () => {
    const s = summarizeCosts([
      line({ behavior: "one-time", amount: 1_200, lifeMonths: 0 }),
      line({ behavior: "per-use", amount: 50, uses: 0 }),
    ]);
    expect(s.fixedMonthly).toBe(1_200);
    expect(s.variablePerUnit).toBe(50);
  });

  it("grant-funded lines are counted in the totals and reported separately", () => {
    const s = summarizeCosts([
      line({ behavior: "fixed", amount: 18_000, grantFunded: true }),
      line({ behavior: "fixed", amount: 6_000 }),
      line({ behavior: "variable", amount: 6, grantFunded: true }),
    ]);
    expect(s.fixedMonthly).toBe(24_000);
    expect(s.grantFixedMonthly).toBe(18_000);
    expect(s.grantVariablePerUnit).toBe(6);
  });

  it("byCategory splits the totals", () => {
    const s = summarizeCosts(REFILL_STATION_EXAMPLE);
    expect(s.byCategory.labor.fixedMonthly).toBe(18_000);
    expect(s.byCategory.containers.variablePerUnit).toBe(5);
    expect(s.byCategory.overhead.fixedMonthly).toBe(12_000);
  });

  it("materials-only costs have no take-back costs", () => {
    expect(summarizeCosts([line({ category: "materials", amount: 45 })]).hasTakeBackCosts).toBe(false);
  });

  it("a take-back line at ₱0 does not count as having take-back costs", () => {
    expect(summarizeCosts([line({ category: "cleaning", amount: 0 })]).hasTakeBackCosts).toBe(false);
  });

  it("Exercise 2: 600 liters at ₱143 costs ₱66,000 and earns ₱19,800", () => {
    expect(calculateMonthlyOutcome(30_000, 60, 600, 143)).toEqual({ totalCost: 66_000, revenue: 85_800, profit: 19_800 });
  });

  it("MISSED_COSTS lists the deck's eight commonly missed costs", () => {
    expect(MISSED_COSTS.map((m) => m.name)).toEqual([
      "Your own time", "Lost containers", "Permits and taxes", "Payment fees",
      "Restocking trips", "Spills and waste", "Marketing", "Start-up costs",
    ]);
  });
});

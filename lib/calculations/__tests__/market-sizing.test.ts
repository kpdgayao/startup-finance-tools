import { describe, it, expect } from "vitest";
import {
  calculateTopDown,
  calculateBottomUp,
  projectRevenue,
  type TopDownInputs,
  type BottomUpInputs,
} from "../market-sizing";

// ─── calculateTopDown ──────────────────────────────────────────────────────

describe("calculateTopDown", () => {
  function makeTopDown(overrides: Partial<TopDownInputs> = {}): TopDownInputs {
    return {
      totalMarketSize: 1_000_000_000,
      samPercent: 10,
      somPercent: 5,
      ...overrides,
    };
  }

  it("TAM equals total market size", () => {
    const result = calculateTopDown(makeTopDown());
    expect(result.tam).toBe(1_000_000_000);
  });

  it("SAM is percentage of TAM", () => {
    const result = calculateTopDown(makeTopDown());
    expect(result.sam).toBe(100_000_000); // 10% of 1B
  });

  it("SOM is percentage of SAM", () => {
    const result = calculateTopDown(makeTopDown());
    expect(result.som).toBe(5_000_000); // 5% of 100M
  });

  it("zero percentages produce zero SAM and SOM", () => {
    const result = calculateTopDown(makeTopDown({ samPercent: 0, somPercent: 0 }));
    expect(result.sam).toBe(0);
    expect(result.som).toBe(0);
  });

  it("100% SAM means SAM equals TAM", () => {
    const result = calculateTopDown(makeTopDown({ samPercent: 100 }));
    expect(result.sam).toBe(result.tam);
  });
});

// ─── calculateBottomUp ─────────────────────────────────────────────────────

describe("calculateBottomUp", () => {
  function makeBottomUp(overrides: Partial<BottomUpInputs> = {}): BottomUpInputs {
    return {
      totalCustomers: 100_000,
      targetPercent: 5,
      revenuePerCustomer: 1000,
      ...overrides,
    };
  }

  it("TAM is total customers times revenue per customer", () => {
    const result = calculateBottomUp(makeBottomUp());
    expect(result.tam).toBe(100_000_000); // 100K * 1000
  });

  it("SAM is target customers times revenue per customer", () => {
    const result = calculateBottomUp(makeBottomUp());
    expect(result.sam).toBe(5_000_000); // 5K * 1000
  });

  it("SOM is 10% of SAM", () => {
    const result = calculateBottomUp(makeBottomUp());
    expect(result.som).toBe(500_000); // 10% of 5M
  });

  it("zero target percent produces zero SAM and SOM", () => {
    const result = calculateBottomUp(makeBottomUp({ targetPercent: 0 }));
    expect(result.sam).toBe(0);
    expect(result.som).toBe(0);
  });
});

// ─── projectRevenue ────────────────────────────────────────────────────────

describe("projectRevenue", () => {
  it("returns one projection per market share entry", () => {
    const result = projectRevenue(5_000_000, [1, 3, 5], 60, 40);
    expect(result).toHaveLength(3);
  });

  it("years are numbered sequentially from 1", () => {
    const result = projectRevenue(5_000_000, [1, 3, 5], 60, 40);
    expect(result.map((r) => r.year)).toEqual([1, 2, 3]);
  });

  it("revenue is SOM times market share percentage", () => {
    const result = projectRevenue(5_000_000, [2], 60, 40);
    expect(result[0].revenue).toBe(100_000); // 5M * 2%
  });

  it("gross margin is revenue times margin percentage", () => {
    const result = projectRevenue(5_000_000, [2], 60, 40);
    expect(result[0].grossMargin).toBe(60_000); // 100K * 60%
  });

  it("profit is gross margin minus opex", () => {
    const result = projectRevenue(5_000_000, [2], 60, 40);
    // GM = 60K, OpEx = 60K * 40% = 24K, Profit = 36K
    expect(result[0].profit).toBe(36_000);
  });

  it("handles empty market shares array", () => {
    const result = projectRevenue(5_000_000, [], 60, 40);
    expect(result).toHaveLength(0);
  });
});

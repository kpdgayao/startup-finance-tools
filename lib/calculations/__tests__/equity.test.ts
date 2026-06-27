import { describe, it, expect } from "vitest";
import {
  calculatePostMoney,
  calculateInvestorEquity,
  calculateExistingEquity,
  simulateCapTable,
  type Founder,
  type FundingRound,
} from "../equity";

// ─── Helpers ───────────────────────────────────────────────────────────────

const defaultFounders: Founder[] = [
  { id: "f1", name: "Alice", equity: 60 },
  { id: "f2", name: "Bob", equity: 40 },
];

const defaultRounds: FundingRound[] = [
  { id: "r1", name: "Seed", investment: 2_000_000, preMoneyValuation: 8_000_000, esopPool: 10 },
];

// ─── calculatePostMoney ────────────────────────────────────────────────────

describe("calculatePostMoney", () => {
  it("returns pre-money + investment", () => {
    expect(calculatePostMoney(8_000_000, 2_000_000)).toBe(10_000_000);
  });

  it("handles zero investment", () => {
    expect(calculatePostMoney(5_000_000, 0)).toBe(5_000_000);
  });

  it("handles zero pre-money", () => {
    expect(calculatePostMoney(0, 1_000_000)).toBe(1_000_000);
  });
});

// ─── calculateInvestorEquity ───────────────────────────────────────────────

describe("calculateInvestorEquity", () => {
  it("returns investment / postMoney as percentage", () => {
    expect(calculateInvestorEquity(2_000_000, 10_000_000)).toBe(20);
  });

  it("returns 0 when post-money is zero", () => {
    expect(calculateInvestorEquity(0, 0)).toBe(0);
  });

  it("returns 100 when investment equals post-money", () => {
    expect(calculateInvestorEquity(10_000_000, 10_000_000)).toBe(100);
  });
});

// ─── calculateExistingEquity ───────────────────────────────────────────────

describe("calculateExistingEquity", () => {
  it("returns preMoney / postMoney as percentage", () => {
    expect(calculateExistingEquity(8_000_000, 10_000_000)).toBe(80);
  });

  it("returns 0 when post-money is zero", () => {
    expect(calculateExistingEquity(0, 0)).toBe(0);
  });
});

// ─── simulateCapTable ──────────────────────────────────────────────────────

describe("simulateCapTable", () => {
  it("returns founding round plus one result per funding round", () => {
    const results = simulateCapTable(defaultFounders, defaultRounds);
    expect(results).toHaveLength(2); // Founding + Seed
  });

  it("founding round has correct initial equity", () => {
    const results = simulateCapTable(defaultFounders, defaultRounds);
    const founding = results[0];
    expect(founding.roundName).toBe("Founding");
    expect(founding.entries).toHaveLength(2);
    expect(founding.entries[0].percentage).toBe(60);
    expect(founding.entries[1].percentage).toBe(40);
  });

  it("investor gets correct equity percentage", () => {
    const results = simulateCapTable(defaultFounders, defaultRounds);
    const seed = results[1];
    const investor = seed.entries.find((e) => e.type === "investor");
    expect(investor).toBeDefined();
    expect(investor!.percentage).toBeCloseTo(20, 1); // 2M / 10M
  });

  it("founders are diluted proportionally", () => {
    const results = simulateCapTable(defaultFounders, defaultRounds);
    const seed = results[1];
    const alice = seed.entries.find((e) => e.stakeholder === "Alice");
    const bob = seed.entries.find((e) => e.stakeholder === "Bob");
    // After 20% investor dilution: Alice = 60 * 0.8 = 48, Bob = 40 * 0.8 = 32
    // Then ESOP further dilutes
    expect(alice!.percentage).toBeLessThan(60);
    expect(bob!.percentage).toBeLessThan(40);
  });

  it("ESOP is created when specified", () => {
    const results = simulateCapTable(defaultFounders, defaultRounds);
    const seed = results[1];
    const esop = seed.entries.find((e) => e.type === "esop");
    expect(esop).toBeDefined();
    expect(esop!.percentage).toBeGreaterThan(0);
  });

  it("no ESOP when esopPool is 0", () => {
    const rounds: FundingRound[] = [
      { id: "r1", name: "Seed", investment: 2_000_000, preMoneyValuation: 8_000_000, esopPool: 0 },
    ];
    const results = simulateCapTable(defaultFounders, rounds);
    const seed = results[1];
    const esop = seed.entries.find((e) => e.type === "esop");
    expect(esop).toBeUndefined();
  });

  it("all percentages sum to approximately 100", () => {
    const results = simulateCapTable(defaultFounders, defaultRounds);
    const seed = results[1];
    const total = seed.entries.reduce((sum, e) => sum + e.percentage, 0);
    expect(total).toBeCloseTo(100, 1);
  });

  it("handles multiple rounds with cumulative dilution", () => {
    const rounds: FundingRound[] = [
      { id: "r1", name: "Seed", investment: 1_000_000, preMoneyValuation: 4_000_000 },
      { id: "r2", name: "Series A", investment: 5_000_000, preMoneyValuation: 20_000_000 },
    ];
    const results = simulateCapTable(defaultFounders, rounds);
    expect(results).toHaveLength(3); // Founding + Seed + Series A
    const seriesA = results[2];
    const total = seriesA.entries.reduce((sum, e) => sum + e.percentage, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it("skips rounds with zero valuation and zero investment", () => {
    const rounds: FundingRound[] = [
      { id: "r1", name: "Empty", investment: 0, preMoneyValuation: 0 },
    ];
    const results = simulateCapTable(defaultFounders, rounds);
    expect(results).toHaveLength(1); // Only founding
  });

  it("handles empty founders array", () => {
    const results = simulateCapTable([], defaultRounds);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

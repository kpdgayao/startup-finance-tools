import { describe, it, expect } from "vitest";
import {
  calculateSafeConversion,
  type SafeInputs,
  type PricedRoundInputs,
} from "../safe-calculator";

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeSafe(overrides: Partial<SafeInputs> = {}): SafeInputs {
  return {
    investmentAmount: 500_000,
    valuationCap: 5_000_000,
    discountRate: 20,
    ...overrides,
  };
}

function makeRound(overrides: Partial<PricedRoundInputs> = {}): PricedRoundInputs {
  return {
    preMoneyValuation: 10_000_000,
    roundSize: 2_000_000,
    ...overrides,
  };
}

// ─── calculateSafeConversion ───────────────────────────────────────────────

describe("calculateSafeConversion", () => {
  it("returns null when pre-money valuation is zero", () => {
    expect(calculateSafeConversion(makeSafe(), makeRound({ preMoneyValuation: 0 }))).toBeNull();
  });

  it("returns null when round size is zero", () => {
    expect(calculateSafeConversion(makeSafe(), makeRound({ roundSize: 0 }))).toBeNull();
  });

  it("returns null when investment amount is zero", () => {
    expect(calculateSafeConversion(makeSafe({ investmentAmount: 0 }), makeRound())).toBeNull();
  });

  it("returns a valid result for standard inputs", () => {
    const result = calculateSafeConversion(makeSafe(), makeRound());
    expect(result).not.toBeNull();
    expect(result!.sharesIssued).toBeGreaterThan(0);
    expect(result!.ownershipPercent).toBeGreaterThan(0);
  });

  it("cap conversion gives better price when cap < round valuation", () => {
    const result = calculateSafeConversion(
      makeSafe({ valuationCap: 5_000_000 }),
      makeRound({ preMoneyValuation: 10_000_000 })
    );
    expect(result!.conversionMethod).toBe("cap");
  });

  it("discount conversion when cap is very high", () => {
    const result = calculateSafeConversion(
      makeSafe({ valuationCap: 100_000_000 }),
      makeRound({ preMoneyValuation: 10_000_000 })
    );
    expect(result!.conversionMethod).toBe("discount");
  });

  it("ownership percent is reasonable (less than 50%)", () => {
    const result = calculateSafeConversion(makeSafe(), makeRound());
    expect(result!.ownershipPercent).toBeLessThan(50);
  });

  it("scenarios array has 3 entries", () => {
    const result = calculateSafeConversion(makeSafe(), makeRound());
    expect(result!.scenarios).toHaveLength(3);
  });

  it("pie data includes Founders, SAFE Holder, and New Investors", () => {
    const result = calculateSafeConversion(makeSafe(), makeRound());
    const names = result!.pieData.map((p) => p.name);
    expect(names).toContain("Founders");
    expect(names).toContain("SAFE Holder");
    expect(names).toContain("New Investors");
  });

  it("higher investment produces more shares", () => {
    const small = calculateSafeConversion(makeSafe({ investmentAmount: 100_000 }), makeRound());
    const large = calculateSafeConversion(makeSafe({ investmentAmount: 1_000_000 }), makeRound());
    expect(large!.sharesIssued).toBeGreaterThan(small!.sharesIssued);
  });

  it("lower valuation cap gives more shares (better for investor)", () => {
    const highCap = calculateSafeConversion(makeSafe({ valuationCap: 10_000_000 }), makeRound());
    const lowCap = calculateSafeConversion(makeSafe({ valuationCap: 3_000_000 }), makeRound());
    expect(lowCap!.sharesIssued).toBeGreaterThan(highCap!.sharesIssued);
  });
});

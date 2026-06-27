import { describe, it, expect } from "vitest";
import {
  validatePercentage,
  validatePositiveInteger,
  sanitizePercentage,
  sanitizePositiveInteger,
} from "../validation";

describe("validatePercentage", () => {
  it("defaults to the [0, 100] range", () => {
    expect(validatePercentage(50).valid).toBe(true);
    expect(validatePercentage(-1).error).toBe("Must be at least 0%");
    expect(validatePercentage(101).error).toBe("Must be at most 100%");
  });

  it("rejects non-finite values", () => {
    expect(validatePercentage(NaN).error).toBe("Please enter a valid number");
  });

  it("accepts a custom max (e.g. cost-plus markup up to 500%)", () => {
    expect(validatePercentage(200, { max: 500 }).valid).toBe(true);
    expect(validatePercentage(501, { max: 500 }).error).toBe(
      "Must be at most 500%"
    );
  });

  it("accepts a custom min (e.g. what-if adjustment down to -50%)", () => {
    expect(validatePercentage(-30, { min: -50, max: 50 }).valid).toBe(true);
    expect(validatePercentage(-51, { min: -50, max: 50 }).error).toBe(
      "Must be at least -50%"
    );
  });
});

describe("sanitizePercentage", () => {
  it("clamps to [0, 100] by default", () => {
    expect(sanitizePercentage(150)).toBe(100);
    expect(sanitizePercentage(-5)).toBe(0);
    expect(sanitizePercentage(NaN)).toBe(0);
  });

  it("preserves negative adjustments within a custom range", () => {
    expect(sanitizePercentage(-30, { min: -50, max: 50 })).toBe(-30);
    expect(sanitizePercentage(-80, { min: -50, max: 50 })).toBe(-50);
  });

  it("preserves markups above 100 within a custom max", () => {
    expect(sanitizePercentage(200, { max: 500 })).toBe(200);
    expect(sanitizePercentage(600, { max: 500 })).toBe(500);
  });
});

describe("validatePositiveInteger", () => {
  it("requires at least 1 by default", () => {
    expect(validatePositiveInteger(1).valid).toBe(true);
    expect(validatePositiveInteger(0).error).toBe("Must be at least 1");
    expect(validatePositiveInteger(2.5).error).toBe("Must be a whole number");
  });

  it("treats 0 as valid for optional fields", () => {
    expect(validatePositiveInteger(0, { allowZero: true }).valid).toBe(true);
    expect(validatePositiveInteger(5, { allowZero: true }).valid).toBe(true);
  });
});

describe("sanitizePositiveInteger", () => {
  it("forces a minimum of 1 by default", () => {
    expect(sanitizePositiveInteger(0)).toBe(1);
    expect(sanitizePositiveInteger(-3)).toBe(1);
    expect(sanitizePositiveInteger(4.9)).toBe(4);
    expect(sanitizePositiveInteger(NaN)).toBe(1);
  });

  it("allows 0 (unset) for optional fields", () => {
    expect(sanitizePositiveInteger(0, { allowZero: true })).toBe(0);
    expect(sanitizePositiveInteger(-3, { allowZero: true })).toBe(0);
    expect(sanitizePositiveInteger(600, { allowZero: true })).toBe(600);
    expect(sanitizePositiveInteger(NaN, { allowZero: true })).toBe(0);
  });
});

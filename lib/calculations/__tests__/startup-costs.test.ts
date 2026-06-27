import { describe, it, expect } from "vitest";
import {
  calculateRegistrationCosts,
  calculateTotalStartupCosts,
  getDefaultCategories,
  PH_STARTUP_BENCHMARKS,
  type StartupCostInputs,
} from "../startup-costs";

describe("calculateRegistrationCosts", () => {
  it("returns costs for sole-proprietorship", () => {
    const result = calculateRegistrationCosts("sole-proprietorship");
    expect(result.costMin).toBeGreaterThan(0);
    expect(result.costMax).toBeGreaterThan(result.costMin);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("returns costs for partnership", () => {
    const result = calculateRegistrationCosts("partnership");
    expect(result.costMin).toBeGreaterThan(0);
    expect(result.costMax).toBeGreaterThan(result.costMin);
  });

  it("returns costs for corporation", () => {
    const result = calculateRegistrationCosts("corporation");
    expect(result.costMin).toBeGreaterThan(0);
    expect(result.costMax).toBeGreaterThan(result.costMin);
  });

  it("corporation registration costs more than sole-proprietorship", () => {
    const sole = calculateRegistrationCosts("sole-proprietorship");
    const corp = calculateRegistrationCosts("corporation");
    expect(corp.costMin).toBeGreaterThanOrEqual(sole.costMin);
    expect(corp.costMax).toBeGreaterThanOrEqual(sole.costMax);
  });

  it("each item has name, costMin, costMax", () => {
    const result = calculateRegistrationCosts("sole-proprietorship");
    for (const item of result.items) {
      expect(item.name).toBeDefined();
      expect(typeof item.costMin).toBe("number");
      expect(typeof item.costMax).toBe("number");
      expect(item.costMax).toBeGreaterThanOrEqual(item.costMin);
    }
  });
});

describe("calculateTotalStartupCosts", () => {
  const defaultCategories = getDefaultCategories();

  const baseInputs: StartupCostInputs = {
    businessType: "sole-proprietorship",
    categories: defaultCategories,
    bufferMonths: 3,
    contingencyPercent: 20,
  };

  it("returns all required fields", () => {
    const result = calculateTotalStartupCosts(baseInputs);
    expect(result.totalOneTime).toBeDefined();
    expect(result.totalMonthlyRecurring).toBeDefined();
    expect(result.registrationCostMin).toBeDefined();
    expect(result.registrationCostMax).toBeDefined();
    expect(result.recommendedCapital).toBeDefined();
    expect(result.bufferAmount).toBeDefined();
    expect(result.contingencyAmount).toBeDefined();
    expect(result.byCategory).toBeDefined();
  });

  it("buffer amount = monthly recurring * buffer months", () => {
    const result = calculateTotalStartupCosts(baseInputs);
    expect(result.bufferAmount).toBe(result.totalMonthlyRecurring * 3);
  });

  it("contingency is applied to one-time + buffer", () => {
    const result = calculateTotalStartupCosts(baseInputs);
    const expected = Math.round(
      (result.totalOneTime + result.bufferAmount) * 0.2
    );
    expect(result.contingencyAmount).toBe(expected);
  });

  it("recommended capital = one-time + buffer + contingency", () => {
    const result = calculateTotalStartupCosts(baseInputs);
    const expected =
      result.totalOneTime + result.bufferAmount + result.contingencyAmount;
    expect(result.recommendedCapital).toBe(expected);
  });

  it("byCategory has one entry per category", () => {
    const result = calculateTotalStartupCosts(baseInputs);
    expect(result.byCategory.length).toBe(defaultCategories.length);
  });

  it("higher buffer months increases recommended capital", () => {
    const low = calculateTotalStartupCosts({ ...baseInputs, bufferMonths: 3 });
    const high = calculateTotalStartupCosts({ ...baseInputs, bufferMonths: 6 });
    expect(high.recommendedCapital).toBeGreaterThan(low.recommendedCapital);
  });

  it("zero contingency still returns valid result", () => {
    const result = calculateTotalStartupCosts({
      ...baseInputs,
      contingencyPercent: 0,
    });
    expect(result.contingencyAmount).toBe(0);
    expect(result.recommendedCapital).toBe(
      result.totalOneTime + result.bufferAmount
    );
  });
});

describe("getDefaultCategories", () => {
  it("returns categories with registration as read-only", () => {
    const cats = getDefaultCategories();
    const reg = cats.find((c) => c.id === "registration");
    expect(reg).toBeDefined();
    expect(reg!.isReadOnly).toBe(true);
  });

  it("all categories have id, label, and items", () => {
    const cats = getDefaultCategories();
    for (const cat of cats) {
      expect(cat.id).toBeDefined();
      expect(cat.label).toBeDefined();
      expect(Array.isArray(cat.items)).toBe(true);
    }
  });
});

describe("PH_STARTUP_BENCHMARKS", () => {
  it("has benchmarks for all three business types", () => {
    expect(PH_STARTUP_BENCHMARKS["sole-proprietorship"]).toBeDefined();
    expect(PH_STARTUP_BENCHMARKS["partnership"]).toBeDefined();
    expect(PH_STARTUP_BENCHMARKS["corporation"]).toBeDefined();
  });

  it("each benchmark has category, min, max", () => {
    for (const type of ["sole-proprietorship", "partnership", "corporation"] as const) {
      for (const bench of PH_STARTUP_BENCHMARKS[type]) {
        expect(bench.category).toBeDefined();
        expect(typeof bench.min).toBe("number");
        expect(typeof bench.max).toBe("number");
        expect(bench.max).toBeGreaterThanOrEqual(bench.min);
      }
    }
  });
});

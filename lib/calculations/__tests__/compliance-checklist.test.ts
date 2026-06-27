import { describe, it, expect } from "vitest";
import {
  getFilteredChecklist,
  areDependenciesMet,
  groupByPhase,
  computeComplianceSummary,
  COMPLIANCE_ITEMS,
  type ComplianceItem,
} from "../compliance-checklist";

describe("getFilteredChecklist", () => {
  it("returns items for sole-proprietorship", () => {
    const items = getFilteredChecklist("sole-proprietorship");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.appliesTo).toContain("sole-proprietorship");
    }
  });

  it("returns items for partnership", () => {
    const items = getFilteredChecklist("partnership");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.appliesTo).toContain("partnership");
    }
  });

  it("returns items for corporation", () => {
    const items = getFilteredChecklist("corporation");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.appliesTo).toContain("corporation");
    }
  });

  it("sole-proprietorship includes DTI but not SEC registration", () => {
    const items = getFilteredChecklist("sole-proprietorship");
    const ids = items.map((i) => i.id);
    expect(ids).toContain("dti-business-name");
    expect(ids).not.toContain("sec-registration");
  });

  it("corporation includes SEC but not DTI registration", () => {
    const items = getFilteredChecklist("corporation");
    const ids = items.map((i) => i.id);
    expect(ids).toContain("sec-registration");
    expect(ids).not.toContain("dti-business-name");
  });
});

describe("areDependenciesMet", () => {
  const items = getFilteredChecklist("sole-proprietorship");

  it("returns true for items with no dependencies", () => {
    const noDeps = items.find((i) => !i.dependsOn || i.dependsOn.length === 0);
    if (noDeps) {
      expect(areDependenciesMet(noDeps, new Set(), items)).toBe(true);
    }
  });

  it("returns false when dependencies are not met", () => {
    const withDeps = items.find(
      (i) => i.dependsOn && i.dependsOn.length > 0
    );
    if (withDeps) {
      expect(areDependenciesMet(withDeps, new Set(), items)).toBe(false);
    }
  });

  it("returns true when all dependencies are completed", () => {
    const withDeps = items.find(
      (i) => i.dependsOn && i.dependsOn.length > 0
    );
    if (withDeps && withDeps.dependsOn) {
      const completed = new Set(withDeps.dependsOn);
      expect(areDependenciesMet(withDeps, completed, items)).toBe(true);
    }
  });
});

describe("groupByPhase", () => {
  it("groups items into three phases", () => {
    const items = getFilteredChecklist("sole-proprietorship");
    const grouped = groupByPhase(items);
    expect(grouped.registration).toBeDefined();
    expect(grouped["post-registration"]).toBeDefined();
    expect(grouped.ongoing).toBeDefined();
  });

  it("total items across phases equals input", () => {
    const items = getFilteredChecklist("corporation");
    const grouped = groupByPhase(items);
    const total =
      grouped.registration.length +
      grouped["post-registration"].length +
      grouped.ongoing.length;
    expect(total).toBe(items.length);
  });

  it("each item is in the correct phase", () => {
    const items = getFilteredChecklist("sole-proprietorship");
    const grouped = groupByPhase(items);
    for (const item of grouped.registration) {
      expect(item.phase).toBe("registration");
    }
    for (const item of grouped.ongoing) {
      expect(item.phase).toBe("ongoing");
    }
  });
});

describe("computeComplianceSummary", () => {
  const items = getFilteredChecklist("sole-proprietorship");

  it("returns correct totals with no completions", () => {
    const summary = computeComplianceSummary(items, new Set());
    expect(summary.totalItems).toBe(items.length);
    expect(summary.completedItems).toBe(0);
    expect(summary.progressPercent).toBe(0);
  });

  it("returns 100% when all items completed", () => {
    const allIds = new Set(items.map((i) => i.id));
    const summary = computeComplianceSummary(items, allIds);
    expect(summary.completedItems).toBe(items.length);
    expect(summary.progressPercent).toBe(100);
    expect(summary.remainingDays).toBe(0);
  });

  it("costs are summed from all items", () => {
    const summary = computeComplianceSummary(items, new Set());
    const expectedMin = items.reduce((s, i) => s + i.costMin, 0);
    const expectedMax = items.reduce((s, i) => s + i.costMax, 0);
    expect(summary.costMin).toBe(expectedMin);
    expect(summary.costMax).toBe(expectedMax);
  });

  it("completed costs only include completed items", () => {
    const firstItem = items[0];
    const completed = new Set([firstItem.id]);
    const summary = computeComplianceSummary(items, completed);
    expect(summary.completedCostMin).toBe(firstItem.costMin);
    expect(summary.completedCostMax).toBe(firstItem.costMax);
  });

  it("remaining days excludes completed items", () => {
    const firstItem = items[0];
    const completed = new Set([firstItem.id]);
    const summary = computeComplianceSummary(items, completed);
    const expectedDays = items
      .filter((i) => i.id !== firstItem.id)
      .reduce((s, i) => s + i.estimatedDays, 0);
    expect(summary.remainingDays).toBe(expectedDays);
  });

  it("byPhase and byAgency breakdowns are populated", () => {
    const summary = computeComplianceSummary(items, new Set());
    expect(summary.byPhase.registration).toBeDefined();
    expect(summary.byPhase["post-registration"]).toBeDefined();
    expect(summary.byPhase.ongoing).toBeDefined();
    expect(summary.byAgency.DTI).toBeDefined();
    expect(summary.byAgency.BIR).toBeDefined();
  });

  it("nextSteps contains uncompleted items", () => {
    const summary = computeComplianceSummary(items, new Set());
    expect(summary.nextSteps.length).toBeGreaterThan(0);
  });
});

describe("COMPLIANCE_ITEMS", () => {
  it("is a non-empty array", () => {
    expect(COMPLIANCE_ITEMS.length).toBeGreaterThan(0);
  });

  it("every item has required fields", () => {
    for (const item of COMPLIANCE_ITEMS) {
      expect(item.id).toBeDefined();
      expect(item.title).toBeDefined();
      expect(item.agency).toBeDefined();
      expect(item.phase).toBeDefined();
      expect(item.appliesTo.length).toBeGreaterThan(0);
      expect(typeof item.costMin).toBe("number");
      expect(typeof item.costMax).toBe("number");
      expect(typeof item.estimatedDays).toBe("number");
    }
  });

  it("all IDs are unique", () => {
    const ids = COMPLIANCE_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

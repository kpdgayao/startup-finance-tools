import { describe, it, expect } from "vitest";
import {
  getStageInfo,
  getStageChecklist,
  computeStageSummary,
  areDependenciesMet,
  STAGE_ORDER,
  type FundraisingStage,
} from "../fundraising-guide";

describe("STAGE_ORDER", () => {
  it("has 5 stages", () => {
    expect(STAGE_ORDER).toHaveLength(5);
  });

  it("starts with research and ends with scaling", () => {
    expect(STAGE_ORDER[0]).toBe("research");
    expect(STAGE_ORDER[4]).toBe("scaling");
  });

  it("contains all expected stages", () => {
    expect(STAGE_ORDER).toContain("research");
    expect(STAGE_ORDER).toContain("proof-of-concept");
    expect(STAGE_ORDER).toContain("fundraising");
    expect(STAGE_ORDER).toContain("operations");
    expect(STAGE_ORDER).toContain("scaling");
  });
});

describe("getStageInfo", () => {
  it("returns info for each stage", () => {
    for (const stage of STAGE_ORDER) {
      const info = getStageInfo(stage);
      expect(info.id).toBe(stage);
      expect(info.label).toBeDefined();
      expect(info.description).toBeDefined();
      expect(info.valuationRange.min).toBeDefined();
      expect(info.valuationRange.max).toBeDefined();
      expect(info.fundingSources.length).toBeGreaterThan(0);
      expect(info.keyMetrics.length).toBeGreaterThan(0);
    }
  });

  it("valuation ranges increase with stage progression", () => {
    const infos = STAGE_ORDER.map(getStageInfo);
    for (let i = 1; i < infos.length; i++) {
      expect(infos[i].valuationRange.min).toBeGreaterThanOrEqual(
        infos[i - 1].valuationRange.min
      );
    }
  });
});

describe("getStageChecklist", () => {
  it("returns checklist items for each stage", () => {
    for (const stage of STAGE_ORDER) {
      const items = getStageChecklist(stage);
      expect(items.length).toBeGreaterThan(0);
    }
  });

  it("each item has required fields", () => {
    for (const stage of STAGE_ORDER) {
      const items = getStageChecklist(stage);
      for (const item of items) {
        expect(item.id).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.description).toBeDefined();
      }
    }
  });

  it("all item IDs are unique within a stage", () => {
    for (const stage of STAGE_ORDER) {
      const items = getStageChecklist(stage);
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("computeStageSummary", () => {
  const items = getStageChecklist("research");

  it("returns correct totals with no completions", () => {
    const summary = computeStageSummary(items, new Set());
    expect(summary.totalItems).toBe(items.length);
    expect(summary.completedItems).toBe(0);
    expect(summary.progressPercent).toBe(0);
    expect(summary.itemsRemaining).toBe(items.length);
  });

  it("returns 100% when all items completed", () => {
    const allIds = new Set(items.map((i) => i.id));
    const summary = computeStageSummary(items, allIds);
    expect(summary.completedItems).toBe(items.length);
    expect(summary.progressPercent).toBe(100);
    expect(summary.itemsRemaining).toBe(0);
  });

  it("handles partial completion", () => {
    const half = new Set(items.slice(0, Math.floor(items.length / 2)).map((i) => i.id));
    const summary = computeStageSummary(items, half);
    expect(summary.completedItems).toBe(half.size);
    expect(summary.itemsRemaining).toBe(items.length - half.size);
    expect(summary.progressPercent).toBeGreaterThan(0);
    expect(summary.progressPercent).toBeLessThan(100);
  });

  it("handles empty items list", () => {
    const summary = computeStageSummary([], new Set());
    expect(summary.totalItems).toBe(0);
    expect(summary.progressPercent).toBe(0);
  });
});

describe("areDependenciesMet", () => {
  const allItems = STAGE_ORDER.flatMap(getStageChecklist);

  it("returns true for items with no dependencies", () => {
    const noDeps = allItems.find(
      (i) => !i.dependsOn || i.dependsOn.length === 0
    );
    if (noDeps) {
      expect(areDependenciesMet(noDeps, new Set(), allItems)).toBe(true);
    }
  });

  it("returns false when dependencies are not completed", () => {
    const withDeps = allItems.find(
      (i) => i.dependsOn && i.dependsOn.length > 0
    );
    if (withDeps) {
      expect(areDependenciesMet(withDeps, new Set(), allItems)).toBe(false);
    }
  });

  it("returns true when all dependencies are completed", () => {
    const withDeps = allItems.find(
      (i) => i.dependsOn && i.dependsOn.length > 0
    );
    if (withDeps && withDeps.dependsOn) {
      const completed = new Set(withDeps.dependsOn);
      expect(areDependenciesMet(withDeps, completed, allItems)).toBe(true);
    }
  });

  it("returns true if dependency references an item not in the list", () => {
    const fakeItem = {
      id: "fake",
      title: "Fake",
      description: "test",
      dependsOn: ["nonexistent-item"],
    };
    expect(areDependenciesMet(fakeItem, new Set(), allItems)).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";
import { FIELD_IDS, visibleFieldIds, isFieldDisabled } from "@/lib/speaking/intake-state";
import { QUESTIONS } from "@/lib/speaking/questions";

const TODAY = "2026-01-15";
const WEDNESDAY = "2026-04-15";

function input(overrides: Partial<QuotationInput> = {}): QuotationInput {
  return { ...DEFAULT_INPUT, today: TODAY, startDate: WEDNESDAY, ...overrides };
}

describe("FIELD_IDS", () => {
  it("has an entry in QUESTIONS for every id", () => {
    for (const id of FIELD_IDS) {
      expect(QUESTIONS[id], `QUESTIONS is missing ${id}`).toBeDefined();
    }
  });

  it("contains no duplicates", () => {
    expect(new Set(FIELD_IDS).size).toBe(FIELD_IDS.length);
  });
});

describe("visibleFieldIds", () => {
  it("shows the subject tier for a talk and hides the facilitation ladder", () => {
    const ids = visibleFieldIds(input({ engagementType: "speaking" }));
    expect(ids).toContain("complexity");
    expect(ids).not.toContain("facilitationScope");
    expect(ids).not.toContain("preparation");
    expect(ids).not.toContain("output");
  });

  it("shows the facilitation ladder and hides the subject tier", () => {
    const ids = visibleFieldIds(input({ engagementType: "facilitation" }));
    expect(ids).toContain("facilitationScope");
    expect(ids).toContain("preparation");
    expect(ids).toContain("output");
    expect(ids).not.toContain("complexity");
  });

  it("hides who is in the room for team building", () => {
    expect(visibleFieldIds(input({ engagementType: "team-building" }))).not.toContain(
      "audienceProfile"
    );
  });

  it("gates the two revenue fields on ticketed", () => {
    expect(visibleFieldIds(input({ ticketed: false }))).not.toContain("participantFee");
    expect(visibleFieldIds(input({ ticketed: true }))).toContain("participantFee");
    expect(visibleFieldIds(input({ ticketed: true }))).toContain("expectedPaidAttendees");
  });

  it("hides the logistics switches for a remote format but keeps region visible", () => {
    const remote = input({ engagementType: "speaking", format: "webinar" });
    const ids = visibleFieldIds(remote);
    expect(ids).not.toContain("earlyStart");
    expect(ids).not.toContain("travelCovered");
    expect(ids).not.toContain("accommodationCovered");
    expect(ids).toContain("region");
    expect(isFieldDisabled("region", remote)).toBe(true);
  });

  it("leaves region enabled for an in-person format", () => {
    expect(isFieldDisabled("region", input())).toBe(false);
  });

  it("preserves the canonical order", () => {
    const ids = visibleFieldIds(input());
    const positions = ids.map((id) => FIELD_IDS.indexOf(id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

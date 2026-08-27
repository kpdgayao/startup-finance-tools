import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";
import {
  FIELD_IDS,
  visibleFieldIds,
  isFieldDisabled,
  fieldProvenance,
  assumptionFor,
  noteToShow,
  mergeDrafts,
  type FieldId,
  type IntakeDraft,
  type FieldStatus,
  materialBlanks,
} from "@/lib/speaking/intake-state";
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

function draft(over: Partial<IntakeDraft> = {}): IntakeDraft {
  return { assumptions: [], ...over };
}

describe("fieldProvenance", () => {
  it("marks a field the note stated as read", () => {
    const p = fieldProvenance(draft({ organizerType: "cooperative" }), new Set());
    expect(p.organizerType).toBe("read");
  });

  it("marks a field the model inferred as assumed", () => {
    const p = fieldProvenance(
      draft({
        organizerType: "cooperative",
        assumptions: [{ field: "organizerType", note: "Read 'our co-op' as a cooperative." }],
      }),
      new Set()
    );
    expect(p.organizerType).toBe("assumed");
  });

  it("marks an untouched field as blank", () => {
    expect(fieldProvenance(draft(), new Set()).region).toBe("blank");
  });

  it("marks an edited field as edited, whatever it was before", () => {
    const d = draft({
      organizerType: "cooperative",
      region: "baguio",
      assumptions: [{ field: "organizerType", note: "Guessed." }],
    });
    const p = fieldProvenance(d, new Set<FieldId>(["organizerType", "region"]));
    expect(p.organizerType).toBe("edited");
    expect(p.region).toBe("edited");
  });

  it("drops an assumption naming a field the draft never set", () => {
    const p = fieldProvenance(
      draft({ assumptions: [{ field: "region", note: "Nothing set this." }] }),
      new Set()
    );
    expect(p.region).toBe("blank");
  });

  it("treats a null draft as everything blank", () => {
    const p = fieldProvenance(null, new Set());
    for (const id of FIELD_IDS) expect(p[id]).toBe("blank");
  });

  it("returns an entry for every field id", () => {
    const p = fieldProvenance(draft({ sessions: 2 }), new Set());
    expect(Object.keys(p).sort()).toEqual([...FIELD_IDS].sort());
  });
});

describe("assumptionFor", () => {
  it("returns the note attached to a field", () => {
    const d = draft({
      region: "baguio",
      assumptions: [{ field: "region", note: "Took Tarlac as the nearest region." }],
    });
    expect(assumptionFor(d, "region")).toBe("Took Tarlac as the nearest region.");
  });

  it("returns null when there is no note, and for a null draft", () => {
    expect(assumptionFor(draft({ region: "baguio" }), "region")).toBeNull();
    expect(assumptionFor(null, "region")).toBeNull();
  });
});

const allBlank = () => fieldProvenance(null, new Set());

describe("materialBlanks", () => {
  it("always asks for the date when it is blank, first", () => {
    expect(materialBlanks(input(), allBlank())[0]).toBe("startDate");
  });

  it("asks for the sector, which is the largest lever on the rate card", () => {
    expect(materialBlanks(input(), allBlank())).toContain("organizerType");
  });

  it("never asks for the budget - a blank budget is an answer", () => {
    expect(materialBlanks(input(), allBlank())).not.toContain("budget");
  });

  it("does not ask about a field that is already read", () => {
    const p = fieldProvenance(draft({ organizerType: "cooperative" }), new Set());
    expect(materialBlanks(input({ organizerType: "cooperative" }), p)).not.toContain(
      "organizerType"
    );
  });

  it("does not ask about a field that does not apply", () => {
    const facilitation = input({ engagementType: "facilitation" });
    expect(materialBlanks(facilitation, allBlank())).not.toContain("complexity");
  });

  it("does not ask about a disabled field", () => {
    const remote = input({ engagementType: "speaking", format: "webinar" });
    expect(materialBlanks(remote, allBlank())).not.toContain("region");
  });

  it("leaves the small switches out", () => {
    expect(materialBlanks(input(), allBlank())).not.toContain("invoiceRequired");
  });

  it("returns at most five", () => {
    expect(materialBlanks(input(), allBlank()).length).toBeLessThanOrEqual(5);
  });

  it("orders by how much the answer could move the total", () => {
    const ids = materialBlanks(input(), allBlank());
    expect(ids[0]).toBe("startDate");
    expect(ids.length).toBeGreaterThan(1);
  });

  it("returns nothing when everything is answered", () => {
    const answered = {} as Record<FieldId, FieldStatus>;
    for (const id of FIELD_IDS) answered[id] = "read";
    expect(materialBlanks(input(), answered)).toEqual([]);
  });
});

describe("the field registry", () => {
  const registry = readFileSync(
    join(process.cwd(), "app/tools/speaker-quotation/components/quotation-fields.tsx"),
    "utf8"
  );

  it("has a renderer for every field id", () => {
    for (const id of FIELD_IDS) {
      expect(registry, `quotation-fields.tsx has no case for ${id}`).toContain(`case "${id}":`);
    }
  });

  it("is the only place the controls are defined", () => {
    // Two copies of a control drift, and a sector select that differs between
    // two states of one page produces two different prices for one event.
    const page = readFileSync(
      join(process.cwd(), "app/tools/speaker-quotation/speaker-quotation-client.tsx"),
      "utf8"
    );
    expect(page).not.toContain("<RateFactorField");
  });
});

describe("noteToShow", () => {
  const withNote = () =>
    draft({
      sessions: 2,
      organizerType: "cooperative",
      assumptions: [
        { field: "sessions", note: "You described a two-day training." },
        { field: "organizerType", note: "Read 'our co-op' as a cooperative." },
      ],
    });

  it("shows the note on a field the model inferred", () => {
    const p = fieldProvenance(withNote(), new Set());
    expect(noteToShow(withNote(), p, "sessions")).toBe("You described a two-day training.");
  });

  it("drops the note the moment the organizer corrects the field", () => {
    // The note said "I set this to 2 full-day sessions" beside a field the
    // organizer had just changed to 3 — confidently wrong about what the page
    // was pricing, which is worse than showing nothing.
    const p = fieldProvenance(withNote(), new Set<FieldId>(["sessions"]));
    expect(noteToShow(withNote(), p, "sessions")).toBeNull();
    // ...and leaves its neighbours alone.
    expect(noteToShow(withNote(), p, "organizerType")).not.toBeNull();
  });

  it("shows nothing on a field that was stated outright", () => {
    const d = draft({ sessions: 2 });
    expect(noteToShow(d, fieldProvenance(d, new Set()), "sessions")).toBeNull();
  });

  it("shows nothing on a blank field", () => {
    expect(noteToShow(null, fieldProvenance(null, new Set()), "region")).toBeNull();
  });
});

describe("mergeDrafts", () => {
  const first = () =>
    draft({
      organizerType: "corporate",
      sessions: 2,
      accommodationCovered: true,
      assumptions: [
        { field: "sessions", note: "You described a two-day training." },
        { field: "organizerType", note: "A rural bank, so corporate." },
      ],
    });

  it("keeps what the first note answered", () => {
    // The regression this exists for: a one-line follow-up replaced the whole
    // draft, so eleven read fields collapsed to two and the page re-asked
    // four questions the organizer had already answered.
    const merged = mergeDrafts(first(), draft({ accommodationCovered: false }));
    expect(merged.organizerType).toBe("corporate");
    expect(merged.sessions).toBe(2);
  });

  it("lets the newer message win on what it actually mentions", () => {
    const merged = mergeDrafts(first(), draft({ accommodationCovered: false }));
    expect(merged.accommodationCovered).toBe(false);
  });

  it("keeps the earlier notes for fields the follow-up did not mention", () => {
    const merged = mergeDrafts(first(), draft({ accommodationCovered: false }));
    expect(merged.assumptions.map((a) => a.field).sort()).toEqual([
      "organizerType",
      "sessions",
    ]);
  });

  it("replaces a note when the follow-up speaks about that field again", () => {
    const merged = mergeDrafts(
      first(),
      draft({ sessions: 3, assumptions: [{ field: "sessions", note: "Three days now." }] })
    );
    expect(merged.sessions).toBe(3);
    expect(merged.assumptions.filter((a) => a.field === "sessions")).toHaveLength(1);
    expect(merged.assumptions.find((a) => a.field === "sessions")?.note).toBe("Three days now.");
  });

  it("drops a stale note when the follow-up states the field outright", () => {
    const merged = mergeDrafts(first(), draft({ sessions: 4 }));
    expect(merged.sessions).toBe(4);
    expect(merged.assumptions.some((a) => a.field === "sessions")).toBe(false);
  });

  it("returns the incoming draft when there is nothing to merge into", () => {
    const d = draft({ sessions: 1 });
    expect(mergeDrafts(null, d)).toEqual(d);
  });
});

import { describe, it, expect } from "vitest";
import {
  ADD_ONS,
  AUDIENCE_BANDS,
  BASE_DAY_RATE,
  COMPLEXITY_TIERS,
  ENGAGEMENT_FORMATS,
  LEAD_TIME_BANDS,
  MISSION_FLOOR_DAY_RATE,
  ORGANIZER_TYPES,
  REGIONS,
  audienceBandFor,
  leadTimeBandFor,
} from "@/lib/speaking/rate-card";
import { QUESTIONS } from "@/lib/speaking/questions";

const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe("rate card integrity", () => {
  it("gives every option list unique ids", () => {
    expect(unique(ENGAGEMENT_FORMATS.map((f) => f.id))).toBe(true);
    expect(unique(COMPLEXITY_TIERS.map((c) => c.id))).toBe(true);
    expect(unique(ORGANIZER_TYPES.map((o) => o.id))).toBe(true);
    expect(unique(REGIONS.map((r) => r.id))).toBe(true);
    expect(unique(ADD_ONS.map((a) => a.id))).toBe(true);
    expect(unique(AUDIENCE_BANDS.map((b) => b.id))).toBe(true);
  });

  it("gives every option a label and an explanation", () => {
    for (const list of [ENGAGEMENT_FORMATS, COMPLEXITY_TIERS, ORGANIZER_TYPES, REGIONS, ADD_ONS]) {
      for (const option of list) {
        expect(option.label.trim(), `${option.id} has no label`).not.toBe("");
        expect(
          (option as { detail: string }).detail.trim(),
          `${option.id} has no detail — the form shows it beside the label`
        ).not.toBe("");
      }
    }
  });

  it("prices every add-on either as a percentage or as an amount, never both", () => {
    for (const addOn of ADD_ONS) {
      const hasFactor = typeof addOn.factor === "number";
      const hasAmount = typeof addOn.amount === "number";
      expect(hasFactor !== hasAmount, `${addOn.id} must set exactly one of factor/amount`).toBe(
        true
      );
      expect((addOn.factor ?? addOn.amount)!).toBeGreaterThan(0);
    }
  });

  it("keeps the mission floor below the standard day rate", () => {
    // A concession that is not actually cheaper is a bug in the rate card,
    // not a rounding detail — it would quote mission organisers the standard
    // rate while telling them they got a discount.
    expect(MISSION_FLOOR_DAY_RATE).toBeLessThan(BASE_DAY_RATE);
  });

  it("orders the audience bands so every size lands in exactly one", () => {
    const maxima = AUDIENCE_BANDS.map((b) => b.max);
    expect([...maxima].sort((a, b) => a - b)).toEqual(maxima);
    expect(maxima[maxima.length - 1]).toBe(Infinity);

    expect(audienceBandFor(1).id).toBe("intimate");
    expect(audienceBandFor(30).id).toBe("intimate");
    expect(audienceBandFor(31).id).toBe("standard");
    expect(audienceBandFor(1_000).id).toBe("hall");
  });

  it("orders the lead-time bands from most notice to least", () => {
    const minima = LEAD_TIME_BANDS.map((b) => b.minDays);
    expect([...minima].sort((a, b) => b - a)).toEqual(minima);
    expect(minima[minima.length - 1]).toBe(0);

    expect(leadTimeBandFor(365).id).toBe("planned");
    expect(leadTimeBandFor(30).id).toBe("planned");
    expect(leadTimeBandFor(29).id).toBe("tight");
    expect(leadTimeBandFor(0).id).toBe("emergency");
  });

  it("never discounts below the standard rate through a factor", () => {
    // Every multiplier is a premium or neutral. A factor below 1 would be a
    // silent discount with no line explaining it — concessions go through the
    // mission discount, which is itemised.
    for (const tier of COMPLEXITY_TIERS) expect(tier.factor).toBeGreaterThanOrEqual(1);
    for (const band of AUDIENCE_BANDS) expect(band.factor).toBeGreaterThanOrEqual(1);
    for (const band of LEAD_TIME_BANDS) expect(band.factor).toBeGreaterThanOrEqual(1);
    for (const type of ORGANIZER_TYPES) expect(type.factor).toBeGreaterThanOrEqual(1);
  });

  it("gives exactly one organiser type the concessionary rate", () => {
    expect(ORGANIZER_TYPES.filter((o) => o.mission)).toHaveLength(1);
  });
});

describe("why-we-ask copy", () => {
  it("gives every question a hint, a rationale and a stated effect", () => {
    for (const question of Object.values(QUESTIONS)) {
      expect(question.label.trim(), `${question.id} has no label`).not.toBe("");
      expect(question.hint.trim(), `${question.id} has no hint`).not.toBe("");
      expect(question.why.length, `${question.id}'s rationale is too thin`).toBeGreaterThan(80);
      expect(question.impact.trim(), `${question.id} does not say what it costs`).not.toBe("");
    }
  });

  // The copy interpolates the rate card rather than restating it, so a change
  // to BASE_DAY_RATE cannot leave the form quoting last year's number. This
  // fails if someone replaces an interpolation with a typed literal.
  it("quotes the live day rate rather than a typed literal", () => {
    expect(QUESTIONS.format.impact).toContain(BASE_DAY_RATE.toLocaleString("en-PH"));
    expect(QUESTIONS.sessions.impact).toContain((BASE_DAY_RATE * 2).toLocaleString("en-PH"));
    expect(QUESTIONS.organizerType.impact).toContain(
      MISSION_FLOOR_DAY_RATE.toLocaleString("en-PH")
    );
  });

  // The margin notes are held to the same rule (see lib/__tests__/margin-notes
  // .test.ts): authority is inferred from the reasoning, never asserted. The
  // form copy is read by strangers deciding whether to book, which is exactly
  // where a credential claim would be most tempting and least persuasive.
  it("asserts no credentials and names nobody", () => {
    const forbidden = ["kevin", "gayao", "iol", "cpa", "mba", "expert", "renowned"];
    for (const question of Object.values(QUESTIONS)) {
      const text = `${question.label} ${question.hint} ${question.why} ${question.impact}`.toLowerCase();
      for (const term of forbidden) {
        expect(text.includes(term), `${question.id} mentions "${term}"`).toBe(false);
      }
    }
  });
});

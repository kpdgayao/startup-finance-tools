import { describe, it, expect } from "vitest";
import { buildQuotation, DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";
import {
  BASE_DAY_RATE,
  MINIMUM_ENGAGEMENT_FEE,
  MISSION_FLOOR_DAY_RATE,
  REVENUE_SHARE_FLOOR,
} from "@/lib/speaking/rate-card";

// 2026-04-15 is a Wednesday and not a Philippine holiday; every fixture builds
// from it so a test that means to isolate one factor is not silently also
// paying a weekend premium. TODAY sits 90 days earlier so the lead-time factor
// is 1.0 unless a test deliberately moves it.
const WEDNESDAY = "2026-04-15";
const SATURDAY = "2026-04-18";
const HOLIDAY = "2026-05-01"; // Labor Day, a Friday
const TODAY = "2026-01-15";

/**
 * Quoted amounts are rounded to the nearest ₱100 by the engine — nobody
 * invoices ₱38,749.99. Expectations that multiply a fee by a factor have to
 * round the same way, or they fail on float dust rather than on behaviour.
 */
const toPeso = (amount: number) => Math.round(amount / 100) * 100;

function input(overrides: Partial<QuotationInput> = {}): QuotationInput {
  return {
    ...DEFAULT_INPUT,
    today: TODAY,
    startDate: WEDNESDAY,
    // Neutral baseline: every factor at 1.0 so a test can move exactly one.
    complexity: "existing",
    organizerType: "government",
    audienceSize: 20,
    region: "baguio",
    earlyStart: false,
    ...overrides,
  };
}

describe("base fee", () => {
  it("prices a full day at the standard day rate when every factor is neutral", () => {
    const quote = buildQuotation(input({ format: "full-day", sessions: 1 }));
    expect(quote.professionalFee).toBe(BASE_DAY_RATE);
    expect(quote.effectiveDayRate).toBe(BASE_DAY_RATE);
  });

  it("scales linearly with session count", () => {
    const quote = buildQuotation(input({ format: "full-day", sessions: 2 }));
    expect(quote.dayEquivalents).toBe(2);
    expect(quote.professionalFee).toBe(BASE_DAY_RATE * 2);
  });

  // The engagement this whole tool exists to price correctly: a two-day
  // "bookkeeping for non-accountants" workshop that was offered ₱10,000.
  it("quotes a two-day custom workshop far above a five-figure honorarium", () => {
    const quote = buildQuotation(
      input({
        format: "full-day",
        sessions: 2,
        complexity: "custom",
        audienceSize: 40,
        organizerType: "corporate",
        region: "metro-manila",
        earlyStart: true,
      })
    );
    expect(quote.professionalFee).toBeGreaterThan(80_000);
    expect(quote.effectiveDayRate).toBeGreaterThanOrEqual(BASE_DAY_RATE);
  });

  it("never quotes below the minimum engagement fee", () => {
    const quote = buildQuotation(input({ format: "panel", sessions: 1 }));
    // A panel is 0.4 of a day — ₱10,000 — which the floor lifts.
    expect(quote.professionalFee).toBe(MINIMUM_ENGAGEMENT_FEE);
    expect(quote.lines.some((l) => l.id === "minimum")).toBe(true);
  });
});

describe("factors", () => {
  it("lists every factor, including the ones that changed nothing", () => {
    const quote = buildQuotation(input());
    const factorIds = quote.lines.filter((l) => l.kind === "factor").map((l) => l.id);
    expect(factorIds).toEqual([
      "complexity",
      "audience",
      "schedule",
      "lead-time",
      "organizer",
    ]);
    // A neutral factor is present at zero pesos rather than omitted: the
    // breakdown should read as a rate card, not as a list of surcharges.
    expect(quote.lines.find((l) => l.id === "complexity")?.amount).toBe(0);
  });

  it("charges a weekend premium", () => {
    const weekday = buildQuotation(input({ startDate: WEDNESDAY }));
    const weekend = buildQuotation(input({ startDate: SATURDAY }));
    expect(weekend.professionalFee).toBeGreaterThan(weekday.professionalFee);
    expect(weekend.schedule.id).toBe("weekend");
  });

  it("charges a holiday premium and names the holiday", () => {
    const quote = buildQuotation(input({ startDate: HOLIDAY }));
    expect(quote.schedule.id).toBe("holiday");
    expect(quote.schedule.reason).toContain("Labor Day");
  });

  it("takes the strongest premium when a multi-day run spans both", () => {
    // Friday 17th through Sunday 19th April: weekdays and a weekend.
    const quote = buildQuotation(input({ startDate: "2026-04-17", sessions: 3 }));
    expect(quote.schedule.id).toBe("weekend");
  });

  it("adds a rush premium for short notice", () => {
    const planned = buildQuotation(input({ today: TODAY }));
    const rush = buildQuotation(input({ today: "2026-04-12" })); // 3 days out
    expect(rush.professionalFee).toBeGreaterThan(planned.professionalFee);
    expect(rush.daysOfNotice).toBe(3);
  });

  it("compounds complexity onto the base rather than replacing it", () => {
    const existing = buildQuotation(input({ complexity: "existing" }));
    const technical = buildQuotation(input({ complexity: "technical" }));
    expect(technical.professionalFee).toBe(toPeso(existing.professionalFee * 1.55));
  });
});

describe("mission tier", () => {
  it("discounts a mission organiser", () => {
    const standard = buildQuotation(input({ organizerType: "government" }));
    const mission = buildQuotation(input({ organizerType: "mission" }));
    expect(mission.professionalFee).toBeLessThan(standard.professionalFee);
    expect(mission.lines.some((l) => l.id === "mission-discount")).toBe(true);
  });

  it("stops the discount at the concessionary floor", () => {
    // A neutral full day is ₱25,000; −20% is ₱20,000, above the ₱18,000 floor.
    // Stacking nothing else, the floor should bind only when factors are low.
    const quote = buildQuotation(input({ organizerType: "mission", format: "full-day" }));
    expect(quote.effectiveDayRate).toBeGreaterThanOrEqual(MISSION_FLOOR_DAY_RATE);
  });

  it("never lets the concession push the day rate under the floor", () => {
    const quote = buildQuotation(
      input({ organizerType: "mission", format: "full-day", sessions: 3 })
    );
    expect(quote.effectiveDayRate).toBeGreaterThanOrEqual(MISSION_FLOOR_DAY_RATE);
  });

  it("does not withhold tax for a mission organiser", () => {
    expect(buildQuotation(input({ organizerType: "mission" })).withholding.applies).toBe(false);
    expect(buildQuotation(input({ organizerType: "corporate" })).withholding.applies).toBe(true);
  });
});

describe("revenue-share floor", () => {
  it("lifts the fee when ticket revenue dwarfs the rate-card number", () => {
    const quote = buildQuotation(
      input({
        format: "full-day",
        ticketed: true,
        participantFee: 3_500,
        expectedPaidAttendees: 80,
      })
    );
    // ₱280,000 gate → a ₱42,000 floor against a ₱25,000 rate-card fee.
    expect(quote.projectedGate).toBe(280_000);
    expect(quote.professionalFee).toBe(toPeso(280_000 * REVENUE_SHARE_FLOOR));
    expect(quote.lines.some((l) => l.id === "revenue-share")).toBe(true);
  });

  it("never lowers a fee that already exceeds the floor", () => {
    const quote = buildQuotation(
      input({ ticketed: true, participantFee: 200, expectedPaidAttendees: 30 })
    );
    expect(quote.professionalFee).toBe(BASE_DAY_RATE);
    expect(quote.lines.some((l) => l.id === "revenue-share")).toBe(false);
  });

  it("caps the uplift at twice the rate-card fee and says so", () => {
    const quote = buildQuotation(
      input({ ticketed: true, participantFee: 10_000, expectedPaidAttendees: 500 })
    );
    // A ₱5,000,000 gate would floor at ₱750,000; the cap holds it to 3×.
    expect(quote.professionalFee).toBe(BASE_DAY_RATE * 3);
    expect(quote.flags.some((f) => f.includes("capped"))).toBe(true);
  });

  it("falls back to the participant count when paid seats are left blank", () => {
    const quote = buildQuotation(
      input({ ticketed: true, participantFee: 3_500, audienceSize: 80, expectedPaidAttendees: 0 })
    );
    expect(quote.projectedGate).toBe(280_000);
  });

  it("ignores ticket figures entirely when the event is free", () => {
    const quote = buildQuotation(
      input({ ticketed: false, participantFee: 3_500, expectedPaidAttendees: 80 })
    );
    expect(quote.projectedGate).toBe(0);
    expect(quote.professionalFee).toBe(BASE_DAY_RATE);
  });
});

describe("travel and reimbursables", () => {
  it("adds no travel cost at home base", () => {
    const quote = buildQuotation(input({ region: "baguio" }));
    expect(quote.lines.some((l) => l.kind === "travel")).toBe(false);
    expect(quote.reimbursables.some((r) => r.id === "accommodation")).toBe(false);
  });

  it("bills travel days for an out-of-town engagement", () => {
    const quote = buildQuotation(input({ region: "visayas-mindanao" }));
    const travel = quote.lines.find((l) => l.kind === "travel");
    expect(travel?.amount).toBe(BASE_DAY_RATE * 0.5);
  });

  it("shows covered logistics at zero billed but keeps the estimate visible", () => {
    const quote = buildQuotation(
      input({ region: "metro-manila", travelCovered: true, accommodationCovered: true, earlyStart: true })
    );
    expect(quote.reimbursablesBilled).toBe(0);
    expect(quote.reimbursablesCovered).toBeGreaterThan(0);
    expect(quote.total).toBe(quote.professionalFee);
  });

  it("bills logistics the organiser will not arrange", () => {
    const quote = buildQuotation(
      input({ region: "metro-manila", travelCovered: false, accommodationCovered: false, earlyStart: true })
    );
    expect(quote.reimbursablesBilled).toBeGreaterThan(0);
    expect(quote.total).toBe(quote.professionalFee + quote.reimbursablesBilled);
  });

  it("adds an arrival night for an early start and none for an afternoon one", () => {
    const early = buildQuotation(input({ region: "metro-manila", earlyStart: true }));
    const late = buildQuotation(input({ region: "metro-manila", earlyStart: false }));
    const nightsOf = (q: ReturnType<typeof buildQuotation>) =>
      q.reimbursables.find((r) => r.id === "accommodation")?.amount ?? 0;
    expect(nightsOf(early)).toBeGreaterThan(0);
    expect(nightsOf(late)).toBe(0);
  });

  it("counts a night between each day of a multi-day engagement", () => {
    const quote = buildQuotation(
      input({ region: "metro-manila", sessions: 3, earlyStart: true, accommodationCovered: false })
    );
    // Three session days plus an arrival night = 3 nights.
    expect(quote.reimbursables.find((r) => r.id === "accommodation")?.amount).toBe(6_000 * 3);
  });

  it("ignores the selected region entirely for an online session", () => {
    const quote = buildQuotation(
      input({ format: "webinar", region: "visayas-mindanao", travelCovered: false })
    );
    expect(quote.reimbursables).toEqual([]);
    expect(quote.lines.some((l) => l.kind === "travel")).toBe(false);
  });

  it("flags an international engagement as needing a separate travel quote", () => {
    const quote = buildQuotation(input({ region: "international" }));
    expect(quote.customQuoteRequired).toBe(true);
    expect(quote.flags.some((f) => f.includes("International"))).toBe(true);
  });
});

describe("add-ons", () => {
  it("applies percentage add-ons to the fee before other add-ons", () => {
    const plain = buildQuotation(input());
    const recorded = buildQuotation(input({ addOns: ["recording-internal"] }));
    expect(recorded.professionalFee).toBe(toPeso(plain.professionalFee * 1.2));
  });

  it("adds flat add-ons at face value", () => {
    const plain = buildQuotation(input());
    const withWorkbook = buildQuotation(input({ addOns: ["workbook"] }));
    expect(withWorkbook.professionalFee).toBe(plain.professionalFee + 8_000);
  });

  it("charges both percentage add-ons off the same pre-add-on fee", () => {
    const plain = buildQuotation(input());
    const both = buildQuotation(input({ addOns: ["recording-internal", "recording-public"] }));

    // Asserted on the lines rather than on the total: the second add-on must
    // read the fee BEFORE the first one was added, not compound on top of it.
    // Checking the total instead would pass even if they compounded, and here
    // it lands on an exact ₱x50 boundary where float dust decides the rounding.
    const internal = both.lines.find((l) => l.id === "addon-recording-internal");
    const publicUse = both.lines.find((l) => l.id === "addon-recording-public");
    expect(internal?.amount).toBe(toPeso(plain.professionalFee * 0.2));
    expect(publicUse?.amount).toBe(toPeso(plain.professionalFee * 0.35));
  });

  it("ignores an unknown add-on id", () => {
    const quote = buildQuotation(
      input({ addOns: ["not-a-real-addon" as never] })
    );
    expect(quote.professionalFee).toBe(BASE_DAY_RATE);
  });
});

describe("running totals and structure", () => {
  it("ends the line items on the professional fee", () => {
    const quote = buildQuotation(
      input({ organizerType: "corporate", complexity: "custom", addOns: ["workbook"] })
    );
    expect(quote.lines[quote.lines.length - 1].runningTotal).toBe(quote.professionalFee);
  });

  it("derives a stable reference from the inputs alone", () => {
    const a = buildQuotation(input());
    const b = buildQuotation(input());
    expect(a.reference).toBe(b.reference);
    expect(a.reference).toMatch(/^SFT-\d{6}-[0-9A-Z]{5}$/);
  });

  it("changes the reference when the engagement changes", () => {
    const a = buildQuotation(input({ sessions: 1 }));
    const b = buildQuotation(input({ sessions: 2 }));
    expect(a.reference).not.toBe(b.reference);
  });

  it("reports withholding as informational, not deducted from the total", () => {
    const quote = buildQuotation(input({ organizerType: "corporate" }));
    expect(quote.withholding.amount).toBe(toPeso(quote.professionalFee * 0.1));
    expect(quote.withholding.net).toBe(quote.professionalFee - quote.withholding.amount);
    expect(quote.total).toBe(quote.professionalFee + quote.reimbursablesBilled);
  });

  it("holds the date for less time than the quote stays valid", () => {
    const quote = buildQuotation(input());
    expect(quote.holdUntil < quote.validUntil).toBe(true);
    expect(quote.validUntil).toBe("2026-02-14");
  });
});

describe("hostile input", () => {
  it("clamps a negative session count to one", () => {
    const quote = buildQuotation(input({ sessions: -5 }));
    expect(quote.dayEquivalents).toBe(1);
  });

  it("clamps an absurd session count rather than looping forever", () => {
    const quote = buildQuotation(input({ sessions: 10_000 }));
    expect(quote.dayEquivalents).toBe(30);
    expect(quote.dates).toHaveLength(30);
  });

  it("survives NaN audience and fee values", () => {
    const quote = buildQuotation(
      input({ audienceSize: NaN, participantFee: NaN, expectedPaidAttendees: NaN, ticketed: true })
    );
    expect(Number.isFinite(quote.professionalFee)).toBe(true);
    expect(quote.professionalFee).toBeGreaterThan(0);
  });

  it("treats a past date as zero notice rather than negative", () => {
    const quote = buildQuotation(input({ today: "2026-06-01", startDate: WEDNESDAY }));
    expect(quote.daysOfNotice).toBe(0);
  });
});

describe("effective day rate", () => {
  // The denominator is days COMMITTED, not days delivered. A fee that already
  // includes travel-day compensation, divided by delivery days alone, reports
  // a day rate nobody is being paid — a one-day Metro Manila trip read as
  // ₱48,200/day when the engagement actually consumed two working days.
  it("counts travel days in the denominator", () => {
    const quote = buildQuotation(input({ region: "metro-manila", format: "full-day" }));
    expect(quote.dayEquivalents).toBe(1);
    expect(quote.daysCommitted).toBe(2);
    expect(quote.effectiveDayRate).toBe(toPeso(quote.professionalFee / 2));
  });

  it("equals the day rate exactly when there is no travel", () => {
    const quote = buildQuotation(input({ region: "baguio", format: "full-day" }));
    expect(quote.daysCommitted).toBe(1);
    expect(quote.effectiveDayRate).toBe(BASE_DAY_RATE);
  });

  it("commits no travel days to an online session", () => {
    const quote = buildQuotation(input({ format: "webinar", region: "visayas-mindanao" }));
    expect(quote.daysCommitted).toBe(quote.dayEquivalents);
  });
});

describe("floor interactions", () => {
  // The minimum engagement fee is applied before the mission concession, so
  // the lowest a mission quote can go is the minimum less the discount. Pinned
  // because the two floors are computed in different steps and the order
  // between them is the whole reason this number exists.
  it("floors a mission-tier quote at the minimum less the concession", () => {
    const quote = buildQuotation(
      input({ organizerType: "mission", format: "panel", audienceSize: 10 })
    );
    expect(quote.professionalFee).toBe(MINIMUM_ENGAGEMENT_FEE * (1 - 0.2));
  });

  it("keeps a mission concession from ever falling below that", () => {
    for (const format of ["panel", "keynote", "webinar", "half-day", "full-day"] as const) {
      const quote = buildQuotation(input({ organizerType: "mission", format, audienceSize: 5 }));
      expect(
        quote.professionalFee,
        `${format} fell below the mission minimum`
      ).toBeGreaterThanOrEqual(MINIMUM_ENGAGEMENT_FEE * (1 - 0.2));
    }
  });
});

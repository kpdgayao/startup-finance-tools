import { describe, it, expect } from "vitest";
import { buildQuotation, DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";
import {
  ABSOLUTE_MINIMUM_FEE,
  COMPLEXITY_TIERS,
  DESK_DAY_FACTOR,
  EWT_RATE,
  EWT_RATE_FIRM,
  INVOICING_ENTITY,
  MINIMUM_ENGAGEMENT_FEE,
  MISSION_DISCOUNT,
  RETURNING_CLIENT_DISCOUNT,
  MISSION_FLOOR_DAY_RATE,
  REVENUE_SHARE_FLOOR,
  FACILITATION_SCOPES,
  TEAM_BUILDING_DAY_RATE,
  TRAVEL_DAY_FEE,
  complexityTierFor,
  deriveDayRate,
  facilitationScopeFor,
  formatsFor,
  organizerTypeFor,
  regionFor,
  sectorMultiplier,
} from "@/lib/speaking/rate-card";

// The rate is set by the topic, so the fixtures name the two ends of the
// ladder rather than a single anchor.
const ROUTINE_RATE = complexityTierFor("routine").dayRate;
const FRONTIER_RATE = complexityTierFor("frontier").dayRate;

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
    // The topic tier is the cheapest rung, so a test that does not mention the
    // topic is reading the routine day rate.
    complexity: "routine",
    organizerType: "government",
    audienceSize: 20,
    region: "baguio",
    earlyStart: false,
    ...overrides,
  };
}

describe("base fee", () => {
  it("prices a full day at the topic's day rate when every factor is neutral", () => {
    const quote = buildQuotation(input({ format: "full-day", sessions: 1 }));
    expect(quote.professionalFee).toBe(ROUTINE_RATE);
    expect(quote.effectiveDayRate).toBe(ROUTINE_RATE);
    expect(quote.dayRate).toBe(ROUTINE_RATE);
  });

  it("prices the same day higher when the topic needs research", () => {
    const routine = buildQuotation(input({ format: "full-day", complexity: "routine" }));
    const frontier = buildQuotation(input({ format: "full-day", complexity: "frontier" }));
    expect(routine.professionalFee).toBe(ROUTINE_RATE);
    expect(frontier.professionalFee).toBe(FRONTIER_RATE);
  });

  it("scales linearly with session count", () => {
    const quote = buildQuotation(input({ format: "full-day", sessions: 2 }));
    expect(quote.dayEquivalents).toBe(2);
    expect(quote.professionalFee).toBe(ROUTINE_RATE * 2);
  });

  // The engagement this whole tool exists to price correctly: a two-day
  // "bookkeeping for non-accountants" workshop that was offered ₱10,000.
  // Bookkeeping is a core catalogue topic, so it prices at the routine rate —
  // the gap to ₱10,000 comes from counting two days honestly, not from
  // classifying a basic subject as difficult.
  it("quotes the two-day bookkeeping workshop far above the honorarium offered", () => {
    const quote = buildQuotation(
      input({
        format: "full-day",
        sessions: 2,
        complexity: "routine",
        audienceSize: 45,
        organizerType: "corporate",
        region: "north-luzon",
        earlyStart: true,
      })
    );
    expect(quote.professionalFee).toBeGreaterThan(40_000);
    expect(quote.professionalFee).toBeGreaterThan(10_000 * 4);
  });

  it("never quotes below the minimum engagement fee", () => {
    const quote = buildQuotation(input({ format: "panel", sessions: 1 }));
    // A panel on a routine topic is 0.4 of a ₱15,000 day — ₱6,000 — which the
    // floor lifts.
    expect(quote.professionalFee).toBe(MINIMUM_ENGAGEMENT_FEE);
    expect(quote.lines.some((l) => l.id === "minimum")).toBe(true);
  });

  // The floor must sit BELOW the cheapest day rate, or every format on a core
  // topic collapses to the same number and the format dropdown stops meaning
  // anything.
  it("keeps the format ladder intact on a routine topic", () => {
    const fees = (["panel", "keynote", "half-day", "full-day"] as const).map(
      (format) => buildQuotation(input({ format })).professionalFee
    );
    expect(new Set(fees).size).toBeGreaterThan(1);
    expect(fees[fees.length - 1]).toBeGreaterThan(fees[0]);
  });
});

describe("factors", () => {
  it("lists every factor, including the ones that changed nothing", () => {
    const quote = buildQuotation(input());
    const factorIds = quote.lines.filter((l) => l.kind === "factor").map((l) => l.id);
    // No "complexity" line: the topic sets the base rate, so it is named on the
    // base line rather than charged as a premium on top of one.
    // No "organizer" line either: the sector scales the day rate rather than
    // multiplying a settled one, so it is named on the base line beside the
    // rate it produced.
    expect(factorIds).toEqual(["audience", "audience-profile", "schedule", "lead-time"]);
    // A neutral factor is present at zero pesos rather than omitted: the
    // breakdown should read as a rate card, not as a list of surcharges.
    expect(quote.lines.find((l) => l.id === "audience")?.amount).toBe(0);
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

  it("names the topic tier on the base line and charges no separate premium", () => {
    const quote = buildQuotation(input({ complexity: "frontier" }));
    const base = quote.lines.find((l) => l.id === "base");
    expect(base?.amount).toBe(FRONTIER_RATE);
    expect(base?.detail).toContain(FRONTIER_RATE.toLocaleString("en-PH"));
    expect(quote.topicTier).toBe(complexityTierFor("frontier").label);
  });

  it("scales the topic rate by the sector rather than surcharging it", () => {
    const corporate = organizerTypeFor("corporate").rateMultiplier;
    const routine = buildQuotation(input({ complexity: "routine", organizerType: "corporate" }));
    const frontier = buildQuotation(input({ complexity: "frontier", organizerType: "corporate" }));
    expect(routine.professionalFee).toBe(deriveDayRate(ROUTINE_RATE, corporate));
    expect(frontier.professionalFee).toBe(deriveDayRate(FRONTIER_RATE, corporate));
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
    // The floor is the routine rate less the concession, so a routine full day
    // lands exactly on it and no tier can fall through it.
    const quote = buildQuotation(input({ organizerType: "mission", format: "full-day" }));
    expect(quote.effectiveDayRate).toBe(MISSION_FLOOR_DAY_RATE);
    expect(MISSION_FLOOR_DAY_RATE).toBe(ROUTINE_RATE * (1 - MISSION_DISCOUNT));
  });

  it("never lets the concession push the day rate under the floor", () => {
    const quote = buildQuotation(
      input({ organizerType: "mission", format: "full-day", sessions: 3 })
    );
    expect(quote.effectiveDayRate).toBeGreaterThanOrEqual(MISSION_FLOOR_DAY_RATE);
  });

  // Public schools, SUCs and registered NGOs are withholding agents just as
  // government offices are. Marking the tier exempt suppressed the note on the
  // quote and left the speaker short at payout with no warning.
  it("still shows withholding for a mission organiser", () => {
    expect(buildQuotation(input({ organizerType: "mission" })).withholding.applies).toBe(true);
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
    expect(quote.professionalFee).toBe(ROUTINE_RATE);
    expect(quote.lines.some((l) => l.id === "revenue-share")).toBe(false);
  });

  it("caps the uplift at twice the rate-card fee and says so", () => {
    const quote = buildQuotation(
      input({ ticketed: true, participantFee: 10_000, expectedPaidAttendees: 500 })
    );
    // A ₱5,000,000 gate would floor at ₱750,000; the cap holds it to 3×.
    expect(quote.professionalFee).toBe(ROUTINE_RATE * 3);
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
    expect(quote.professionalFee).toBe(ROUTINE_RATE);
  });
});

describe("travel and reimbursables", () => {
  it("adds no travel cost at home base", () => {
    const quote = buildQuotation(input({ region: "baguio" }));
    expect(quote.lines.some((l) => l.kind === "travel")).toBe(false);
    expect(quote.reimbursables.some((r) => r.id === "accommodation")).toBe(false);
  });

  it("bills travel time for an out-of-town engagement", () => {
    const quote = buildQuotation(input({ region: "metro-manila" }));
    const travel = quote.lines.find((l) => l.kind === "travel");
    // The flat travel-day fee, not a share of this engagement's rate.
    expect(travel?.amount).toBe(TRAVEL_DAY_FEE);
  });

  it("counts a day and a half to Visayas or Mindanao", () => {
    // Baguio is not an airport city. Reaching a Visayas or Mindanao venue is a
    // road trip to Manila or Clark, a flight, and a transfer at the far end —
    // further than Metro Manila by any measure, so it cannot cost the same
    // number of travel days.
    const far = regionFor("visayas-mindanao");
    expect(far.travelDays).toBe(1.5);
    expect(far.travelDays).toBeGreaterThan(regionFor("metro-manila").travelDays);

    const quote = buildQuotation(input({ region: "visayas-mindanao" }));
    const travel = quote.lines.find((l) => l.kind === "travel")!;
    expect(travel.amount).toBe(toPeso(TRAVEL_DAY_FEE * 1.5));
    expect(travel.label).toBe("Travel time, 1.5 days");
    // And it lands in the days committed, so the reported cost per day is
    // measured against every day the trip actually takes.
    expect(quote.daysCommitted).toBe(quote.dayEquivalents + 1.5);
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
    expect(quote.professionalFee).toBe(ROUTINE_RATE);
  });
});

describe("running totals and structure", () => {
  it("ends the line items on the professional fee", () => {
    const quote = buildQuotation(
      input({ organizerType: "corporate", complexity: "applied", addOns: ["workbook"] })
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
    const quote = buildQuotation(input({ organizerType: "corporate", invoiceRequired: false }));
    // To the nearest peso, not the nearest hundred: a tax is arithmetic the
    // reader can check against the rate printed beside it.
    expect(quote.withholding.amount).toBe(Math.round(quote.professionalFee * EWT_RATE));
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
    expect(quote.effectiveDayRate).toBe(ROUTINE_RATE);
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
    expect(quote.professionalFee).toBe(MINIMUM_ENGAGEMENT_FEE * (1 - MISSION_DISCOUNT));
  });

  it("keeps a mission concession from ever falling below that", () => {
    for (const format of ["panel", "keynote", "webinar", "half-day", "full-day"] as const) {
      const quote = buildQuotation(input({ organizerType: "mission", format, audienceSize: 5 }));
      expect(
        quote.professionalFee,
        `${format} fell below the mission minimum`
      ).toBeGreaterThanOrEqual(MINIMUM_ENGAGEMENT_FEE * (1 - MISSION_DISCOUNT));
    }
  });
});


describe("the breakdown reconciles", () => {
  // Rounding each line independently of its running total let the two columns
  // disagree — lines summing to ₱31,300 under a stated fee of ₱31,400, on
  // screen and in the exported PDF. An organiser checking the arithmetic finds
  // that before you do.
  it("sums the effect column exactly to the professional fee", () => {
    const cases: Partial<QuotationInput>[] = [
      {},
      { organizerType: "corporate", region: "metro-manila", audienceSize: 45 },
      { complexity: "frontier", sessions: 3, audienceSize: 200, startDate: SATURDAY },
      { addOns: ["recording-internal", "workbook", "clinic"], organizerType: "association" },
      { organizerType: "mission", format: "keynote" },
      { ticketed: true, participantFee: 3_500, expectedPaidAttendees: 300, format: "keynote" },
      { region: "visayas-mindanao", sessions: 2, today: "2026-04-12" },
    ];

    for (const overrides of cases) {
      const quote = buildQuotation(input(overrides));
      const sum = quote.lines.reduce((total, line) => total + line.amount, 0);
      expect(sum, `lines do not sum to the fee for ${JSON.stringify(overrides)}`).toBe(
        quote.professionalFee
      );
    }
  });

  it("keeps every line's running total equal to the lines before it", () => {
    const quote = buildQuotation(
      input({ organizerType: "corporate", region: "metro-manila", addOns: ["workbook"] })
    );
    let running = 0;
    for (const line of quote.lines) {
      running += line.amount;
      expect(line.runningTotal, `${line.label} breaks the running total`).toBe(running);
    }
  });
});

describe("quotation reference", () => {
  // Two quotes ₱22,800 apart shared SFT-261015-5H9RQ before the seed covered
  // the add-ons and the travel arrangements. The reference is the handle the
  // organiser quotes back by email and the one printed on the PDF.
  it("distinguishes quotes that differ only in what is bundled", () => {
    const base = input();
    const references = new Set(
      [
        base,
        { ...base, addOns: ["recording-public" as const] },
        { ...base, travelCovered: false },
        { ...base, accommodationCovered: false },
        { ...base, earlyStart: !base.earlyStart },
        { ...base, ticketed: true, participantFee: 3_500, expectedPaidAttendees: 80 },
      ].map((i) => buildQuotation(i).reference)
    );
    expect(references.size).toBe(6);
  });

  it("does not depend on the order add-ons were ticked", () => {
    const a = buildQuotation(input({ addOns: ["workbook", "clinic"] }));
    const b = buildQuotation(input({ addOns: ["clinic", "workbook"] }));
    expect(a.reference).toBe(b.reference);
  });
});


describe("invoicing", () => {
  // The whole point of the answer to "should an invoice change the price?":
  // issuing a proper invoice is not extra work worth charging for. What it
  // changes is the withholding basis, and — if the firm ever registers for
  // VAT — whether VAT sits on top.
  it("does not move the professional fee", () => {
    const billedPersonally = buildQuotation(input({ invoiceRequired: false }));
    const billedByTheFirm = buildQuotation(input({ invoiceRequired: true }));
    expect(billedByTheFirm.professionalFee).toBe(billedPersonally.professionalFee);
    expect(billedByTheFirm.total).toBe(billedPersonally.total);
  });

  it("switches the withholding basis to the firm's rate", () => {
    const personal = buildQuotation(input({ organizerType: "corporate", invoiceRequired: false }));
    const firm = buildQuotation(input({ organizerType: "corporate", invoiceRequired: true }));

    expect(personal.withholding.basis).toBe("individual");
    expect(personal.withholding.rate).toBe(EWT_RATE);
    expect(firm.withholding.basis).toBe("firm");
    expect(firm.withholding.rate).toBe(EWT_RATE_FIRM);
    // Materially different take-home, which is why showing the wrong one
    // would misstate the payout rather than merely mislabel it.
    expect(firm.withholding.net).toBeGreaterThan(personal.withholding.net);
  });

  it("names the issuing entity only when an invoice was asked for", () => {
    expect(buildQuotation(input({ invoiceRequired: true })).invoicing.entity).toBe(
      INVOICING_ENTITY.name
    );
    expect(buildQuotation(input({ invoiceRequired: false })).invoicing.entity).toBeNull();
  });

  it("adds no VAT while the firm is below the threshold", () => {
    const quote = buildQuotation(input({ invoiceRequired: true }));
    expect(INVOICING_ENTITY.vatRegistered).toBe(false);
    expect(quote.invoicing.vat).toBe(0);
    expect(quote.total).toBe(quote.professionalFee + quote.reimbursablesBilled);
  });

  it("reports percentage tax as the firm's cost, never on the organiser's total", () => {
    const quote = buildQuotation(input({ invoiceRequired: true }));
    expect(quote.invoicing.percentageTax).toBeGreaterThan(0);
    // The organiser's total is untouched by it — it is the firm's cost.
    expect(quote.total).toBe(quote.professionalFee + quote.reimbursablesBilled);
  });

  it("carries no percentage tax when nothing is invoiced", () => {
    expect(buildQuotation(input({ invoiceRequired: false })).invoicing.percentageTax).toBe(0);
  });

  // A corporate or government payor cannot release funds without one, so
  // finding out afterwards is a delayed payment rather than a surprise.
  it("flags a withholding organiser who did not ask for an invoice", () => {
    const quote = buildQuotation(input({ organizerType: "corporate", invoiceRequired: false }));
    expect(quote.flags.some((f) => f.includes(INVOICING_ENTITY.name))).toBe(true);
  });

  it("does not nag a mission organiser about it", () => {
    const quote = buildQuotation(input({ organizerType: "mission", invoiceRequired: false }));
    expect(quote.flags.some((f) => f.includes(INVOICING_ENTITY.name))).toBe(false);
  });

  it("changes the reference when the invoicing arrangement changes", () => {
    const a = buildQuotation(input({ invoiceRequired: true }));
    const b = buildQuotation(input({ invoiceRequired: false }));
    expect(a.reference).not.toBe(b.reference);
  });
});


describe("audience composition", () => {
  // Priced separately from audience SIZE, and answering a different question:
  // size is a logistics cost (materials, breakout support, marking), whereas
  // composition is a content cost — what the material has to survive.
  it("is neutral for the two most common rooms", () => {
    for (const audienceProfile of ["students", "non-specialist"] as const) {
      const quote = buildQuotation(input({ audienceProfile }));
      expect(quote.professionalFee, audienceProfile).toBe(ROUTINE_RATE);
    }
  });

  it("charges for a room that has to hold up to standards-level questioning", () => {
    const plain = buildQuotation(input({ audienceProfile: "non-specialist" }));
    const peers = buildQuotation(input({ audienceProfile: "practitioners" }));
    expect(peers.professionalFee).toBe(toPeso(plain.professionalFee * 1.1));
  });

  it("charges most for a board-level room", () => {
    const plain = buildQuotation(input({ audienceProfile: "non-specialist" }));
    const board = buildQuotation(input({ audienceProfile: "leadership" }));
    expect(board.professionalFee).toBe(toPeso(plain.professionalFee * 1.15));
  });

  it("charges a mixed room for being pitched twice", () => {
    const plain = buildQuotation(input({ audienceProfile: "non-specialist" }));
    const mixed = buildQuotation(input({ audienceProfile: "mixed" }));
    expect(mixed.professionalFee).toBeGreaterThan(plain.professionalFee);
  });

  it("is independent of how many people are in the room", () => {
    // 20 practitioners and 20 non-specialists differ; 20 and 200
    // non-specialists differ for an unrelated reason. The two must not be
    // conflated into one lever.
    const small = buildQuotation(input({ audienceSize: 20, audienceProfile: "practitioners" }));
    const large = buildQuotation(input({ audienceSize: 200, audienceProfile: "practitioners" }));
    const sizeLine = (q: ReturnType<typeof buildQuotation>) =>
      q.lines.find((l) => l.id === "audience");
    const profileLine = (q: ReturnType<typeof buildQuotation>) =>
      q.lines.find((l) => l.id === "audience-profile");

    expect(profileLine(small)?.factor).toBe(profileLine(large)?.factor);
    expect(sizeLine(small)?.factor).not.toBe(sizeLine(large)?.factor);
  });

  it("changes the reference", () => {
    const a = buildQuotation(input({ audienceProfile: "non-specialist" }));
    const b = buildQuotation(input({ audienceProfile: "leadership" }));
    expect(a.reference).not.toBe(b.reference);
  });

  it("keeps the breakdown reconciling", () => {
    for (const audienceProfile of ["students", "practitioners", "leadership", "mixed"] as const) {
      const quote = buildQuotation(input({ audienceProfile, organizerType: "corporate" }));
      const sum = quote.lines.reduce((total, line) => total + line.amount, 0);
      expect(sum, audienceProfile).toBe(quote.professionalFee);
    }
  });
});

describe("the rate card never calls an engagement off-the-shelf", () => {
  // Every session is adapted to the room, so wording that implies a canned
  // delivery is both untrue and bad positioning on a page a paying organiser
  // reads. The cheapest tier means the SUBJECT is settled, not the delivery.
  it("avoids canned-delivery language in the tier copy and on the quote", () => {
    const forbidden = [
      "already in the catalogue",
      "delivered as it stands",
      "off the shelf",
      "off-the-shelf",
      "canned",
      "generic",
      "standard talk",
    ];

    const surfaces = COMPLEXITY_TIERS.flatMap((t) => [t.label, t.detail]);
    for (const tier of COMPLEXITY_TIERS) {
      const quote = buildQuotation(input({ complexity: tier.id }));
      surfaces.push(quote.lines.find((l) => l.id === "base")?.detail ?? "");
      surfaces.push(quote.topicTier);
    }

    for (const text of surfaces) {
      for (const term of forbidden) {
        expect(text.toLowerCase(), `"${term}" in: ${text}`).not.toContain(term);
      }
    }
  });
});


describe("engagement types", () => {
  // A talk and a planning session are not variations on one service, and the
  // subject-complexity ladder cannot price work that is bespoke by definition.
  it("takes the day rate from the facilitation ladder, not the subject one", () => {
    const quote = buildQuotation(
      input({ engagementType: "facilitation", facilitationScope: "board", complexity: "routine" })
    );
    expect(quote.dayRate).toBe(facilitationScopeFor("board").dayRate);
    // The routine subject tier must have no influence at all here.
    const other = buildQuotation(
      input({ engagementType: "facilitation", facilitationScope: "board", complexity: "frontier" })
    );
    expect(other.professionalFee).toBe(quote.professionalFee);
  });

  it("prices every facilitation scope above every speaking tier", () => {
    const dearestTalk = Math.max(...COMPLEXITY_TIERS.map((t) => t.dayRate));
    for (const scope of FACILITATION_SCOPES) {
      expect(scope.dayRate, scope.id).toBeGreaterThan(dearestTalk);
    }
  });

  it("uses the team building rate and ignores the subject tier", () => {
    const quote = buildQuotation(
      input({ engagementType: "team-building", complexity: "frontier", region: "baguio" })
    );
    expect(quote.dayRate).toBe(TEAM_BUILDING_DAY_RATE);
  });

  // The audience profiles describe how much finance the room already knows.
  // That changes how a session on cash flow is built and changes nothing about
  // running a day of activities, so charging for it there would be a factor
  // with no work behind it.
  it("drops the audience-composition factor for team building", () => {
    const teamBuilding = buildQuotation(
      input({ engagementType: "team-building", audienceProfile: "leadership" })
    );
    expect(teamBuilding.lines.some((l) => l.id === "audience-profile")).toBe(false);

    const speaking = buildQuotation(input({ audienceProfile: "leadership" }));
    expect(speaking.lines.some((l) => l.id === "audience-profile")).toBe(true);
  });

  it("offers only formats that make sense for the type", () => {
    const facilitation = formatsFor("facilitation").map((f) => f.id);
    expect(facilitation).not.toContain("keynote");
    expect(facilitation).not.toContain("panel");
    expect(formatsFor("speaking")).toHaveLength(5);
    for (const type of ["speaking", "facilitation", "team-building"] as const) {
      expect(formatsFor(type).length, type).toBeGreaterThan(0);
    }
  });

  it("names the format the way the type names it", () => {
    const facilitation = buildQuotation(input({ engagementType: "facilitation" }));
    const speaking = buildQuotation(input({ engagementType: "speaking" }));
    expect(facilitation.lines[0].label).toContain("session");
    expect(speaking.lines[0].label).toContain("workshop");
  });
});

describe("facilitation desk days", () => {
  const facilitating = (overrides: Partial<QuotationInput> = {}) =>
    buildQuotation(
      input({
        engagementType: "facilitation",
        facilitationScope: "team",
        region: "baguio",
        organizerType: "government",
        audienceProfile: "non-specialist",
        ...overrides,
      })
    );

  it("bills nothing extra when neither is asked for", () => {
    const quote = facilitating({ preparation: "none", output: "none" });
    expect(quote.deskDays).toBe(0);
    expect(quote.professionalFee).toBe(FACILITATION_SCOPES[0].dayRate);
  });

  // The half of a planning engagement that is normally absorbed for free.
  it("prices interviews and the written plan as their own lines", () => {
    const quote = facilitating({ preparation: "interviews", output: "plan" });
    const rate = FACILITATION_SCOPES[0].dayRate;

    expect(quote.deskDays).toBe(3);
    expect(quote.lines.find((l) => l.id === "preparation")?.amount).toBe(
      toPeso(rate * DESK_DAY_FACTOR * 1)
    );
    expect(quote.lines.find((l) => l.id === "output")?.amount).toBe(
      toPeso(rate * DESK_DAY_FACTOR * 2)
    );
  });

  // Desk work is real work, but it is not the room. Billing a day of writing
  // at the price of a day of facilitating is a line an organiser is right to
  // query.
  it("bills desk days below the room rate", () => {
    expect(DESK_DAY_FACTOR).toBeLessThan(1);
    expect(DESK_DAY_FACTOR).toBeGreaterThan(0);
  });

  it("counts desk days as days committed", () => {
    const bare = facilitating({ preparation: "none", output: "none" });
    const full = facilitating({ preparation: "deep", output: "plan" });
    expect(full.daysCommitted).toBe(bare.daysCommitted + 4);
  });

  it("never bills desk days for a talk or for team building", () => {
    for (const engagementType of ["speaking", "team-building"] as const) {
      const quote = buildQuotation(
        input({ engagementType, preparation: "deep", output: "plan" })
      );
      expect(quote.deskDays, engagementType).toBe(0);
      expect(quote.lines.some((l) => l.id === "output"), engagementType).toBe(false);
    }
  });

  it("flags a planning engagement with no groundwork and no write-up", () => {
    const quote = facilitating({ preparation: "none", output: "none" });
    expect(quote.flags.some((f) => f.includes("written output"))).toBe(true);
    expect(quote.flags.some((f) => f.includes("groundwork"))).toBe(true);
  });

  it("keeps the breakdown reconciling with desk days in it", () => {
    const quote = facilitating({
      preparation: "deep",
      output: "plan",
      organizerType: "corporate",
      region: "visayas-mindanao",
      sessions: 2,
    });
    const sum = quote.lines.reduce((total, line) => total + line.amount, 0);
    expect(sum).toBe(quote.professionalFee);
  });

  it("changes the reference when the scope of work changes", () => {
    const references = new Set(
      [
        facilitating({ preparation: "none", output: "none" }),
        facilitating({ preparation: "interviews", output: "none" }),
        facilitating({ preparation: "none", output: "plan" }),
        buildQuotation(input({ engagementType: "team-building" })),
      ].map((q) => q.reference)
    );
    expect(references.size).toBe(4);
  });
});

describe("line factors mean different things", () => {
  // A multiplier and an add-on's share of the fee are both stored in `factor`,
  // and the display layer rendered both as "×n" — printing a +20% recording
  // licence as "×0.20", which reads as an 80% discount.
  it("keeps multiplier factors at or above one, and add-on shares below it", () => {
    const quote = buildQuotation(
      input({ organizerType: "corporate", addOns: ["recording-internal", "recording-public"] })
    );

    for (const line of quote.lines.filter((l) => l.kind === "factor")) {
      expect(line.factor, line.label).toBeGreaterThanOrEqual(1);
    }
    for (const line of quote.lines.filter((l) => l.kind === "addon" && l.factor !== undefined)) {
      expect(line.factor, line.label).toBeLessThan(1);
    }
  });
});

describe("the day rate a quote reports", () => {
  it("resolves the day rate from the engagement type, not the speaking ladder", () => {
    // The form once showed a chip computed from the speaking ladder while the
    // engine charged the facilitation rate — two numbers on the same page.
    for (const [engagementType, expected] of [
      ["speaking", complexityTierFor("tailored").dayRate],
      ["facilitation", facilitationScopeFor("organisation").dayRate],
      ["team-building", TEAM_BUILDING_DAY_RATE],
    ] as const) {
      const quote = buildQuotation(
        input({ engagementType, complexity: "tailored", region: "metro-manila" })
      );
      expect(quote.dayRate, engagementType).toBe(expected);
    }
  });
});

describe("travel time is priced as time, not as a share of the client's rate", () => {
  const travelLine = (overrides: Partial<QuotationInput>) =>
    buildQuotation(input({ region: "metro-manila", ...overrides })).lines.find(
      (l) => l.kind === "travel"
    );

  it("charges the same journey the same, whoever booked it", () => {
    // The defect this replaced: half of the CLIENT'S day rate made the
    // identical bus ride to Manila cost a company ₱29,000 and a government
    // agency ₱7,500. There is no answer to an organiser who asks why their
    // travel is worth more than someone else's.
    for (const organizerType of [
      "government",
      "academic",
      "cooperative",
      "association",
      "corporate",
      "mission",
    ] as const) {
      expect(travelLine({ organizerType })?.amount, organizerType).toBe(TRAVEL_DAY_FEE);
    }
  });

  it("charges the same journey the same whatever the work is", () => {
    for (const engagementType of ["speaking", "facilitation", "team-building"] as const) {
      expect(travelLine({ engagementType })?.amount, engagementType).toBe(TRAVEL_DAY_FEE);
    }
    for (const complexity of ["routine", "frontier"] as const) {
      expect(travelLine({ complexity })?.amount, complexity).toBe(TRAVEL_DAY_FEE);
    }
  });

  it("scales with the journey, which is the thing that actually differs", () => {
    // Half a travel day is ₱3,750, which the engine quotes to the nearest ₱100.
    expect(travelLine({ region: "north-luzon" })?.amount).toBe(toPeso(TRAVEL_DAY_FEE * 0.5));
    expect(travelLine({ region: "international" })?.amount).toBe(TRAVEL_DAY_FEE * 2);
    expect(travelLine({ region: "baguio" })).toBeUndefined();
  });

  it("never lets travel time dominate a one-day corporate fee", () => {
    // It was a third of the whole professional fee on a single-day corporate
    // booking — the most objectionable thing on the quote, and the first thing
    // an organiser sees charged before any work has been done.
    const quote = buildQuotation(
      input({ organizerType: "corporate", region: "metro-manila", complexity: "routine" })
    );
    const travel = quote.lines.find((l) => l.kind === "travel")!.amount;
    expect(travel / quote.professionalFee).toBeLessThan(0.15);
  });

  it("labels it as time lost rather than a day sold", () => {
    // "One travel day" on a quote reads as a day being sold, which invites
    // exactly the objection this line attracts: being billed a working day
    // before any work has happened.
    expect(travelLine({})?.label).toContain("Travel time");
    expect(travelLine({ region: "north-luzon" })?.label).toBe("Travel time, half a day");
    expect(travelLine({ region: "international" })?.label).toBe("Travel time, 2 days");
  });

  it("says the rate is flat, and that the fare is billed elsewhere", () => {
    const line = travelLine({ organizerType: "corporate" })!;
    expect(line.detail).toContain("the same for every client");
    // Billing the journey here as well as in the reimbursables would be
    // billing it twice, so the line says which is which.
    expect(line.detail).toContain("fare");
  });
});


describe("returning clients", () => {
  it("costs nothing to answer no", () => {
    const first = buildQuotation(input({ returningClient: false }));
    expect(first.professionalFee).toBe(ROUTINE_RATE);
    expect(first.lines.some((l) => l.id === "returning-client")).toBe(false);
  });

  it("recognises a returning client with a modest reduction", () => {
    const first = buildQuotation(input({ returningClient: false }));
    const again = buildQuotation(input({ returningClient: true }));
    expect(again.professionalFee).toBe(
      toPeso(first.professionalFee * (1 - RETURNING_CLIENT_DISCOUNT))
    );
  });

  // Small on purpose: a large returning-client discount only says the first
  // quote was padded.
  it("stays small enough to be a thank-you rather than a correction", () => {
    expect(RETURNING_CLIENT_DISCOUNT).toBeGreaterThan(0);
    expect(RETURNING_CLIENT_DISCOUNT).toBeLessThanOrEqual(0.1);
  });

  // Applied before the mission concession so the concessionary floor, which is
  // checked afterwards, is still the last word on how low a quote can go.
  it("cannot combine with the mission rate to breach the concessionary floor", () => {
    for (const format of ["panel", "keynote", "half-day", "full-day"] as const) {
      const quote = buildQuotation(
        input({ organizerType: "mission", returningClient: true, format, audienceSize: 8 })
      );
      expect(quote.professionalFee, format).toBeGreaterThanOrEqual(ABSOLUTE_MINIMUM_FEE);
    }
  });

  it("keeps the breakdown reconciling", () => {
    const quote = buildQuotation(
      input({ returningClient: true, organizerType: "corporate", addOns: ["workbook"] })
    );
    const sum = quote.lines.reduce((total, line) => total + line.amount, 0);
    expect(sum).toBe(quote.professionalFee);
  });

  it("changes the reference", () => {
    expect(buildQuotation(input({ returningClient: true })).reference).not.toBe(
      buildQuotation(input({ returningClient: false })).reference
    );
  });
});


describe("tax figures are exact", () => {
  // "withheld at 2% — ₱200 here" against a ₱8,000 fee is a quote contradicting
  // itself in one sentence, on a page whose entire argument is that the
  // numbers add up. Fees round to ₱100; taxes round to ₱1.
  it("matches the rate printed beside it", () => {
    const quote = buildQuotation(
      input({
        organizerType: "mission",
        returningClient: true,
        format: "panel",
        audienceSize: 8,
        region: "baguio",
      })
    );
    expect(quote.withholding.amount).toBe(
      Math.round(quote.professionalFee * quote.withholding.rate)
    );
    expect(quote.invoicing.percentageTax).toBe(Math.round(quote.professionalFee * 0.03));
    expect(quote.withholding.net).toBe(quote.professionalFee - quote.withholding.amount);
  });

  it("holds across every organiser tier", () => {
    for (const organizerType of [
      "corporate",
      "association",
      "government",
      "academic",
      "mission",
    ] as const) {
      for (const invoiceRequired of [true, false]) {
        const quote = buildQuotation(input({ organizerType, invoiceRequired }));
        expect(quote.withholding.amount, `${organizerType}/${invoiceRequired}`).toBe(
          quote.withholding.applies
            ? Math.round(quote.professionalFee * quote.withholding.rate)
            : 0
        );
      }
    }
  });
});

describe("expected paid seats keeps zero as its default", () => {
  // 0 is a sentinel meaning "use the participant count", so an integer field
  // that refills a cleared box with its previous value would make the default
  // impossible to get back to.
  it("falls back to the audience size when left at zero", () => {
    const quote = buildQuotation(
      input({ ticketed: true, participantFee: 1_000, audienceSize: 60, expectedPaidAttendees: 0 })
    );
    expect(quote.projectedGate).toBe(60_000);
  });
});

describe("sector rates", () => {
  it("prices a corporate planning day at ₱70,000 at the middle rung", () => {
    // The number this ladder was rebuilt around. Scaled by the speaking
    // multiplier it came out at ₱90,000, a figure extrapolated from
    // international facilitation rates and above any observed Philippine
    // training day.
    const quote = buildQuotation(
      input({
        engagementType: "facilitation",
        facilitationScope: "organisation",
        organizerType: "corporate",
        format: "full-day",
      })
    );
    expect(quote.dayRate).toBe(70_000);
  });

  it("leaves the corporate teaching ladder where it was", () => {
    // The facilitation change must not touch it: the two ladders are scaled
    // separately precisely so one can move without the other.
    const quote = buildQuotation(input({ organizerType: "corporate", complexity: "routine" }));
    expect(quote.dayRate).toBe(deriveDayRate(ROUTINE_RATE, 3.2));
  });

  it("prices a cooperative between a private school and a chamber", () => {
    const rate = (organizerType: QuotationInput["organizerType"]) =>
      buildQuotation(input({ organizerType, complexity: "routine" })).dayRate;

    expect(rate("cooperative")).toBeGreaterThan(rate("academic"));
    expect(rate("cooperative")).toBeLessThan(rate("association"));
    expect(rate("cooperative")).toBe(
      deriveDayRate(ROUTINE_RATE, organizerTypeFor("cooperative").rateMultiplier)
    );
  });

  it("charges a cooperative the standard rate, not the concessionary one", () => {
    // A co-op has a statutory education and training fund, so it is not a
    // mission organiser — marking it one would have quietly discounted every
    // cooperative enquiry by a further 20%.
    const quote = buildQuotation(input({ organizerType: "cooperative" }));
    expect(quote.lines.some((l) => l.id === "mission-discount")).toBe(false);
    expect(quote.withholding.applies).toBe(true);
  });

  it("tells a cooperative that one rate cannot fit the whole sector", () => {
    // Co-ops run from a village store to a multi-billion-peso bank. The flag
    // is the honest alternative to a rate card that silently prices them all
    // the same and loses the small ones without ever hearing from them.
    const quote = buildQuotation(input({ organizerType: "cooperative" }));
    const flag = quote.flags.find((f) => f.includes("cooperative rate"));
    expect(flag).toBeDefined();
    expect(flag).toContain("small primary co-op");
    // And nobody else is told about it.
    expect(
      buildQuotation(input({ organizerType: "corporate" })).flags.some((f) =>
        f.includes("cooperative rate")
      )
    ).toBe(false);
  });

  it("prices a corporate team-building day as facilitated work", () => {
    // ₱55,000, not the ₱70,000 the speaking multiplier produced — which was
    // above a corporate one-team planning day and so contradicted the ladder.
    const teamBuilding = buildQuotation(
      input({ engagementType: "team-building", organizerType: "corporate" })
    );
    const planning = buildQuotation(
      input({ engagementType: "facilitation", facilitationScope: "team", organizerType: "corporate" })
    );
    expect(teamBuilding.dayRate).toBe(55_000);
    expect(teamBuilding.dayRate).toBeLessThan(planning.dayRate);
  });

  it("names the cooperative sector on the base line", () => {
    const quote = buildQuotation(input({ organizerType: "cooperative" }));
    expect(quote.lines[0].detail).toContain("cooperative rate");
  });

  it("resolves the facilitation multiplier for every sector", () => {
    for (const organizer of ["government", "academic", "cooperative", "association", "corporate"] as const) {
      const quote = buildQuotation(
        input({ engagementType: "facilitation", facilitationScope: "team", organizerType: organizer })
      );
      expect(quote.dayRate, organizer).toBe(
        deriveDayRate(
          facilitationScopeFor("team").dayRate,
          sectorMultiplier(organizerTypeFor(organizer), "facilitation")
        )
      );
    }
  });
});

describe("per participant", () => {
  // The unit the summary now leads with. A day rate invites "for ONE day?";
  // a per-head figure invites a comparison with what a seat costs elsewhere,
  // and both are the same quote.
  it("divides the whole total, not the professional fee", () => {
    const quote = buildQuotation(
      input({ audienceSize: 40, region: "metro-manila", travelCovered: false })
    );
    expect(quote.reimbursablesBilled).toBeGreaterThan(0);
    expect(quote.perParticipant).toBe(Math.round(quote.total / 40));
  });

  it("reports the clamped head count it actually divided by", () => {
    // The form shows this count beside the amount. Reporting the raw input
    // while dividing by the clamped one would print a divisor that does not
    // produce the figure next to it.
    expect(buildQuotation(input({ audienceSize: 0 })).audienceSize).toBe(1);
    expect(buildQuotation(input({ audienceSize: Number.NaN })).audienceSize).toBe(1);
    const huge = buildQuotation(input({ audienceSize: 250_000 }));
    expect(huge.audienceSize).toBe(100_000);
    expect(huge.perParticipant).toBe(Math.round(huge.total / huge.audienceSize));
  });

  it("rounds to the peso, not the hundred", () => {
    // At 300 participants a ₱169 figure rounded to ₱200 would be a fifth out,
    // on the one number a reader is most likely to multiply back up and check.
    const quote = buildQuotation(
      input({ format: "keynote", audienceSize: 300, region: "baguio" })
    );
    expect(quote.perParticipant).toBe(Math.round(quote.total / 300));
    expect(quote.perParticipant % 100).not.toBe(0);
  });
});

describe("the honorarium ceiling", () => {
  // The card quotes above the DBM ceiling in two places — the top of the
  // subject ladder and all of facilitation — on the basis that work at that
  // level is procured as a service contract rather than paid as an honorarium.
  // That is a different rule, not an exemption, so the quote has to say it.
  const ceilingFlag = (quote: ReturnType<typeof buildQuotation>) =>
    quote.flags.find((f) => f.includes("honorarium"));

  it("warns a government organiser quoted above it", () => {
    const quote = buildQuotation(input({ organizerType: "government", complexity: "frontier" }));
    expect(quote.dayRate).toBe(FRONTIER_RATE);
    expect(ceilingFlag(quote)).toContain("procured as a service or consultancy contract");
  });

  it("says nothing when the public rate stays under it", () => {
    expect(ceilingFlag(buildQuotation(input({ organizerType: "government" })))).toBeUndefined();
  });

  it("warns on public-sector facilitation, which always clears it", () => {
    const quote = buildQuotation(
      input({ organizerType: "government", engagementType: "facilitation" })
    );
    expect(ceilingFlag(quote)).toBeDefined();
  });

  it("compares the concessionary rate for a mission organiser, not the list one", () => {
    // ₱24,000 less the 20% concession is ₱19,200, under the ceiling. Comparing
    // the pre-concession rate would warn about a price never being asked for.
    const quote = buildQuotation(input({ organizerType: "mission", complexity: "frontier" }));
    expect(ceilingFlag(quote)).toBeUndefined();
  });

  it("says nothing to an organiser the circular does not govern", () => {
    for (const organizerType of ["corporate", "association", "cooperative", "academic"] as const) {
      const quote = buildQuotation(input({ organizerType, complexity: "frontier" }));
      expect(ceilingFlag(quote), organizerType).toBeUndefined();
    }
  });
});

describe("budget", () => {
  // A corporate two-day workshop with the logistics billed and an add-on on
  // top: comfortably above a ₱60,000 budget, and carrying several levers.
  const overBudget = () =>
    input({
      organizerType: "corporate",
      complexity: "routine",
      sessions: 2,
      region: "metro-manila",
      travelCovered: false,
      accommodationCovered: false,
      addOns: ["workbook"],
      budget: 60_000,
    });

  it("reports nothing when no budget was given", () => {
    expect(buildQuotation(input()).budgetFit).toBeNull();
    expect(buildQuotation(input({ budget: 0 })).budgetFit).toBeNull();
  });

  it("ignores a negative or nonsensical budget", () => {
    expect(buildQuotation(input({ budget: -50_000 })).budgetFit).toBeNull();
    expect(buildQuotation(input({ budget: Number.NaN })).budgetFit).toBeNull();
  });

  it("never moves the fee, whatever the organiser says they have", () => {
    // The whole point. A fee that bends to a stated budget makes the rate card
    // fiction and punishes the organiser who answered honestly.
    const base = buildQuotation(input());
    for (const budget of [1, 5_000, 50_000, 5_000_000]) {
      const quoted = buildQuotation(input({ budget }));
      expect(quoted.professionalFee, `budget ${budget}`).toBe(base.professionalFee);
      expect(quoted.total, `budget ${budget}`).toBe(base.total);
    }
  });

  it("keeps the same reference, since the quote itself is unchanged", () => {
    expect(buildQuotation(input({ budget: 40_000 })).reference).toBe(
      buildQuotation(input()).reference
    );
  });

  it("says so plainly when the quote already fits", () => {
    const base = buildQuotation(input());
    const fit = buildQuotation(input({ budget: base.total + 25_000 })).budgetFit!;
    expect(fit.withinBudget).toBe(true);
    expect(fit.difference).toBe(25_000);
    expect(fit.levers).toEqual([]);
    expect(fit.reachable).toBe(true);
  });

  it("treats a budget exactly equal to the total as fitting", () => {
    const base = buildQuotation(input());
    const fit = buildQuotation(input({ budget: base.total })).budgetFit!;
    expect(fit.withinBudget).toBe(true);
    expect(fit.difference).toBe(0);
  });

  it("lists what could change when the quote is above it", () => {
    const fit = buildQuotation(overBudget()).budgetFit!;
    expect(fit.withinBudget).toBe(false);
    expect(fit.difference).toBe(fit.total - fit.budget);
    expect(fit.levers.length).toBeGreaterThan(1);
    for (const lever of fit.levers) {
      expect(lever.saving, lever.id).toBeGreaterThan(0);
      expect(lever.total, lever.id).toBe(fit.total - lever.saving);
    }
  });

  it("orders the levers by what they save", () => {
    const savings = buildQuotation(overBudget()).budgetFit!.levers.map((l) => l.saving);
    expect([...savings].sort((a, b) => b - a)).toEqual(savings);
  });

  it("states a saving the form actually reproduces", () => {
    // The property that makes this panel worth having: pulling a lever on the
    // real form has to land on the total the lever promised. An estimated
    // saving that turns out wrong is worse than no lever at all.
    const raw = overBudget();
    const fit = buildQuotation(raw).budgetFit!;

    const logistics = fit.levers.find((l) => l.id === "logistics")!;
    expect(logistics.total).toBe(
      buildQuotation({ ...raw, travelCovered: true, accommodationCovered: true }).total
    );

    const addOns = fit.levers.find((l) => l.id === "add-ons")!;
    expect(addOns.total).toBe(buildQuotation({ ...raw, addOns: [] }).total);

    const sessions = fit.levers.find((l) => l.id === "sessions")!;
    expect(sessions.total).toBe(buildQuotation({ ...raw, sessions: 1 }).total);
  });

  it("offers the online lever only where an online format exists", () => {
    const speaking = buildQuotation(overBudget()).budgetFit!;
    expect(speaking.levers.some((l) => l.id === "online")).toBe(true);

    // Team building has no online format on the card, so proposing one would
    // be proposing an engagement that cannot be booked.
    const teamBuilding = buildQuotation(
      input({
        engagementType: "team-building",
        organizerType: "corporate",
        region: "metro-manila",
        travelCovered: false,
        budget: 10_000,
      })
    ).budgetFit!;
    expect(teamBuilding.levers.some((l) => l.id === "online")).toBe(false);
  });

  it("offers the facilitation levers only for facilitation", () => {
    const fit = buildQuotation(
      input({
        engagementType: "facilitation",
        organizerType: "corporate",
        preparation: "deep",
        output: "plan",
        budget: 50_000,
      })
    ).budgetFit!;
    expect(fit.levers.map((l) => l.id)).toEqual(
      expect.arrayContaining(["preparation", "output"])
    );

    const speaking = buildQuotation(overBudget()).budgetFit!;
    expect(speaking.levers.some((l) => l.id === "preparation" || l.id === "output")).toBe(false);
  });

  it("offers a better date only when the current one carries a premium", () => {
    const weekday = buildQuotation(overBudget()).budgetFit!;
    expect(weekday.levers.some((l) => l.id === "date")).toBe(false);

    const weekend = buildQuotation({ ...overBudget(), startDate: SATURDAY }).budgetFit!;
    const dateLever = weekend.levers.find((l) => l.id === "date")!;
    expect(dateLever).toBeDefined();
    // The proposed date is carried as data, not parsed back out of the label —
    // the label is prose, in the same form as every other date on the quote.
    expect(dateLever.label).toContain("Move it to");
    expect(dateLever.startDate).toBeDefined();
    expect(dateLever.total).toBe(
      buildQuotation({ ...overBudget(), startDate: dateLever.startDate! }).total
    );
  });

  it("counts only one of two alternatives in the floor", () => {
    // A shorter format and an online one both rewrite the same field, so a
    // floor claiming both would state a total the form cannot produce — and
    // the copy reads off `combined`, so it would say "all of these" untruthfully.
    const fit = buildQuotation(overBudget()).budgetFit!;
    expect(fit.levers.some((l) => l.id === "online")).toBe(true);
    expect(fit.levers.some((l) => l.id === "shorter-format")).toBe(true);
    expect(fit.combined).toContain("online");
    expect(fit.combined).not.toContain("shorter-format");
    expect(fit.combined.length).toBeLessThan(fit.levers.length);
  });

  it("prices the floor as a real quote rather than a sum of savings", () => {
    // Levers interact — dropping a session also drops a hotel night — and two
    // of them rewrite the same field. Summing them would state a total the
    // form can never produce.
    const fit = buildQuotation(overBudget()).budgetFit!;
    const cheapestLever = Math.min(...fit.levers.map((l) => l.total));
    expect(fit.floor).toBeLessThanOrEqual(cheapestLever);
    expect(fit.reachable).toBe(fit.floor <= fit.budget);
  });

  it("admits when a budget cannot be reached at all", () => {
    const fit = buildQuotation({ ...overBudget(), budget: 5_000 }).budgetFit!;
    expect(fit.reachable).toBe(false);
    expect(fit.floor).toBeGreaterThan(fit.budget);
  });

  it("has nothing to offer on an engagement already at its smallest", () => {
    const fit = buildQuotation(
      input({
        organizerType: "government",
        complexity: "routine",
        format: "panel",
        sessions: 1,
        region: "baguio",
        addOns: [],
        budget: 1_000,
      })
    ).budgetFit!;
    expect(fit.levers).toEqual([]);
    expect(fit.floor).toBe(fit.total);
    expect(fit.reachable).toBe(false);
  });
});

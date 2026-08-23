import { describe, it, expect } from "vitest";
import { buildQuotation, DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";
import {
  EWT_RATE,
  EWT_RATE_FIRM,
  INVOICING_ENTITY,
  MINIMUM_ENGAGEMENT_FEE,
  MISSION_DISCOUNT,
  MISSION_FLOOR_DAY_RATE,
  REVENUE_SHARE_FLOOR,
  complexityTierFor,
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
    expect(factorIds).toEqual(["audience", "schedule", "lead-time", "organizer"]);
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

  it("applies the remaining factors on top of whichever rate the topic set", () => {
    const routine = buildQuotation(input({ complexity: "routine", organizerType: "corporate" }));
    const frontier = buildQuotation(input({ complexity: "frontier", organizerType: "corporate" }));
    expect(routine.professionalFee).toBe(toPeso(ROUTINE_RATE * 1.15));
    expect(frontier.professionalFee).toBe(toPeso(FRONTIER_RATE * 1.15));
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

  it("bills travel days for an out-of-town engagement", () => {
    const quote = buildQuotation(input({ region: "visayas-mindanao" }));
    const travel = quote.lines.find((l) => l.kind === "travel");
    expect(travel?.amount).toBe(ROUTINE_RATE * 0.5);
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
    expect(quote.withholding.amount).toBe(toPeso(quote.professionalFee * EWT_RATE));
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

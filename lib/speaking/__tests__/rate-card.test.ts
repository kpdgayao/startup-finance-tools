import { describe, it, expect } from "vitest";
import {
  ADD_ONS,
  AUDIENCE_BANDS,
  AUDIENCE_PROFILES,
  COMPLEXITY_TIERS,
  DAY_RATE_MAX,
  FACILITATION_SCOPES,
  TEAM_BUILDING_DAY_RATE,
  TOP_SECTOR_MULTIPLIER,
  TOP_SECTOR_FACILITATION_MULTIPLIER,
  facilitationScopeFor,
  organizerTypeFor,
  sectorMultiplier,
  DAY_RATE_MIN,
  deriveDayRate,
  ENGAGEMENT_FORMATS,
  LEAD_TIME_BANDS,
  MISSION_DISCOUNT,
  MISSION_FLOOR_DAY_RATE,
  MINIMUM_ENGAGEMENT_FEE,
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
    expect(unique(AUDIENCE_PROFILES.map((p) => p.id))).toBe(true);
  });

  it("gives every option a label and an explanation", () => {
    for (const list of [
      ENGAGEMENT_FORMATS,
      COMPLEXITY_TIERS,
      ORGANIZER_TYPES,
      REGIONS,
      ADD_ONS,
      AUDIENCE_PROFILES,
    ]) {
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

  it("keeps the mission floor below the cheapest day rate", () => {
    // A concession that is not actually cheaper is a bug in the rate card,
    // not a rounding detail — it would quote mission organisers the standard
    // rate while telling them they got a discount.
    expect(MISSION_FLOOR_DAY_RATE).toBeLessThan(DAY_RATE_MIN);
    expect(MISSION_FLOOR_DAY_RATE).toBe(DAY_RATE_MIN * (1 - MISSION_DISCOUNT));
  });

  it("keeps the minimum engagement fee below the cheapest day rate", () => {
    // At or above it, every format on a core topic prices identically and the
    // format ladder stops meaning anything.
    expect(MINIMUM_ENGAGEMENT_FEE).toBeLessThan(DAY_RATE_MIN);
  });

  it("orders the topic rate ladder cheapest first", () => {
    const rates = COMPLEXITY_TIERS.map((t) => t.dayRate);
    expect([...rates].sort((a, b) => a - b)).toEqual(rates);
    expect(rates[0]).toBe(DAY_RATE_MIN);
    expect(rates[rates.length - 1]).toBe(DAY_RATE_MAX);
    for (const rate of rates) expect(rate).toBeGreaterThan(0);
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

  it("never discounts below the topic rate through a factor", () => {
    // Every multiplier is a premium or neutral. A factor below 1 would be a
    // silent discount with no line explaining it — concessions go through the
    // mission discount, which is itemised. The topic tiers are not in this
    // list: they set the rate rather than multiplying one.
    for (const band of AUDIENCE_BANDS) expect(band.factor).toBeGreaterThanOrEqual(1);
    for (const band of LEAD_TIME_BANDS) expect(band.factor).toBeGreaterThanOrEqual(1);
    // Organiser tiers are no longer in this list: the sector sets the day
    // rate rather than multiplying a settled one, so its scaling is checked
    // against the benchmarks below instead.
    for (const profile of AUDIENCE_PROFILES) expect(profile.factor).toBeGreaterThanOrEqual(1);
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
  it("quotes the live rate ladder rather than typed literals", () => {
    // Since the sector scales the ladder, copy that quotes only the public end
    // contradicts the number a corporate reader is actually shown. Each of
    // these should carry both ends of the spread they describe.
    const topOfLadder = deriveDayRate(DAY_RATE_MAX, TOP_SECTOR_MULTIPLIER).toLocaleString(
      "en-PH"
    );

    for (const q of [QUESTIONS.format, QUESTIONS.complexity, QUESTIONS.engagementType]) {
      expect(q.impact, `${q.id} omits the public-sector end`).toContain(
        DAY_RATE_MIN.toLocaleString("en-PH")
      );
      expect(q.impact, `${q.id} omits the corporate end`).toContain(topOfLadder);
    }

    expect(QUESTIONS.sessions.impact).toContain((DAY_RATE_MIN * 2).toLocaleString("en-PH"));
    expect(QUESTIONS.sessions.impact).toContain(
      (deriveDayRate(DAY_RATE_MIN, TOP_SECTOR_MULTIPLIER) * 2).toLocaleString("en-PH")
    );
    expect(QUESTIONS.organizerType.impact).toContain(
      MISSION_FLOOR_DAY_RATE.toLocaleString("en-PH")
    );

    // The facilitation copy has to quote the facilitation scaling. Quoting the
    // speaking one told a corporate reader their board retreat topped out at
    // ₱96,000 a day, against a page that would have quoted them ₱75,000.
    expect(QUESTIONS.facilitationScope.impact).toContain(
      deriveDayRate(
        FACILITATION_SCOPES[FACILITATION_SCOPES.length - 1].dayRate,
        TOP_SECTOR_FACILITATION_MULTIPLIER
      ).toLocaleString("en-PH")
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


describe("audience composition is a separate lever from audience size", () => {
  it("keeps at least one neutral profile so the default quote is unmoved", () => {
    expect(AUDIENCE_PROFILES.some((p) => p.factor === 1)).toBe(true);
  });

  // Gentle on purpose: a sixth multiplier that behaved like the others would
  // make a quote read as a stack of surcharges rather than a rate card.
  it("stays modest", () => {
    for (const profile of AUDIENCE_PROFILES) {
      expect(profile.factor, profile.id).toBeLessThanOrEqual(1.15);
    }
  });

  it("explains itself in terms of the work, not the people", () => {
    // The premium is for what the material has to survive. Copy that reads as
    // a judgement about the attendees would be indefensible on a page they may
    // well be the ones reading.
    const forbidden = ["difficult", "demanding audience", "fussy", "important people", "vip"];
    for (const profile of AUDIENCE_PROFILES) {
      const text = `${profile.label} ${profile.detail}`.toLowerCase();
      for (const term of forbidden) expect(text, profile.id).not.toContain(term);
    }
  });
});

describe("sector rates against the market benchmarks", () => {
  // Researched August 2026. The public rate is a CEILING, not a discount:
  // DBM BC 2007-1 pays a resource person twice the hourly rate of the salary
  // grade they are pegged to, for delivery hours plus equal preparation hours
  // — roughly ₱18,700–21,200 a day at SG-24 to SG-25 on the 2026 table.
  // Corporate is a different market: Philippine in-house training is quoted at
  // ₱40,000–280,000 a session and ₱100,000–500,000 for a two-day programme.
  const dayRate = (organizer: string, base: number) =>
    deriveDayRate(base, ORGANIZER_TYPES.find((o) => o.id === organizer)!.rateMultiplier);

  // Cheapest sector first. A cooperative sits between a private school and a
  // chamber: RA 9520 already reserves part of its net surplus for members'
  // education and training, so the budget exists, but it is members' money
  // rather than corporate profit.
  const SECTOR_ORDER = ["government", "academic", "cooperative", "association", "corporate"];

  /** Every base rate on the card, paired with the multiplier that prices it. */
  const ladderRates = (type: (typeof ORGANIZER_TYPES)[number]) =>
    [
      ...COMPLEXITY_TIERS.map((t) => [t.id, t.dayRate, type.rateMultiplier] as const),
      ...FACILITATION_SCOPES.map((f) => [f.id, f.dayRate, type.facilitationMultiplier] as const),
      ["team-building", TEAM_BUILDING_DAY_RATE, type.rateMultiplier] as const,
    ] as const;

  it("leaves the public sector at the ladder, which is where its ceiling is", () => {
    for (const id of ["government", "mission"]) {
      expect(dayRate(id, DAY_RATE_MIN), id).toBe(DAY_RATE_MIN);
      expect(dayRate(id, DAY_RATE_MAX), id).toBe(DAY_RATE_MAX);
    }
    // The computed government ceiling sits inside the public band.
    expect(DAY_RATE_MAX).toBeGreaterThanOrEqual(21_200);
  });

  it("puts a corporate day inside the observed corporate market", () => {
    // A single in-house session starts at ₱40,000; a day should not undercut it.
    expect(dayRate("corporate", DAY_RATE_MIN)).toBeGreaterThanOrEqual(40_000);
    // And should stay well under the ₱280,000 top of the session range, which
    // buys far more than one speaker's day.
    expect(dayRate("corporate", DAY_RATE_MAX)).toBeLessThan(120_000);
  });

  it("orders the sectors public < academic < cooperative < association < corporate", () => {
    const order = SECTOR_ORDER.map((id) => dayRate(id, DAY_RATE_MIN));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(new Set(order).size).toBe(order.length);
  });

  it("never scales a sector below the public rate", () => {
    for (const type of ORGANIZER_TYPES) {
      expect(type.rateMultiplier, type.id).toBeGreaterThanOrEqual(1);
    }
  });

  // Asserting `deriveDayRate` output lands on a thousand only restates its own
  // implementation. What is worth pinning is that rounding never distorts the
  // rate enough to matter, across EVERY ladder — including facilitation and
  // team building, which the first version of this test skipped.
  it("rounds without moving a rate more than half a thousand", () => {
    // Each ladder is paired with the multiplier that actually prices it —
    // facilitation has its own, and checking it against the speaking one would
    // pin a number no quote can produce.
    for (const type of ORGANIZER_TYPES) {
      for (const [id, base, multiplier] of ladderRates(type)) {
        const exact = base * multiplier;
        const rounded = deriveDayRate(base, multiplier);
        expect(Math.abs(rounded - exact), `${type.id}/${id}`).toBeLessThanOrEqual(500);
        expect(rounded, `${type.id}/${id}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every ladder's sector ordering intact after rounding", () => {
    // Rounding could in principle collapse two adjacent sectors onto the same
    // figure, which would make the sector question look like it did nothing.
    const ladders: Array<[string, number, "speaking" | "facilitation"]> = [
      ...COMPLEXITY_TIERS.map((t) => [t.id, t.dayRate, "speaking"] as [string, number, "speaking"]),
      ...FACILITATION_SCOPES.map(
        (f) => [f.id, f.dayRate, "facilitation"] as [string, number, "facilitation"]
      ),
      ["team-building", TEAM_BUILDING_DAY_RATE, "speaking"],
    ];

    for (const [id, base, type] of ladders) {
      const rates = SECTOR_ORDER.map((sector) =>
        deriveDayRate(base, sectorMultiplier(organizerTypeFor(sector as never), type))
      );
      expect(new Set(rates).size, `${id} collapses two sectors onto one rate`).toBe(rates.length);
      expect([...rates].sort((a, b) => a - b), id).toEqual(rates);
    }
  });
});

describe("facilitation is scaled by its own sector multipliers", () => {
  // The two ladders track different markets. Teaching scales with the
  // corporate training budget, which is well evidenced here; facilitation had
  // only international comparables, and scaling it by the speaking multiplier
  // imported that range wholesale — a ₱90,000 corporate planning day, above
  // any observed Philippine training day, on no Philippine evidence.
  it("prices a corporate planning day at ₱70,000 at the middle rung", () => {
    expect(
      deriveDayRate(
        facilitationScopeFor("organisation").dayRate,
        sectorMultiplier(organizerTypeFor("corporate"), "facilitation")
      )
    ).toBe(70_000);
  });

  it("keeps the top corporate facilitation day inside the training-day market", () => {
    const top = deriveDayRate(
      Math.max(...FACILITATION_SCOPES.map((f) => f.dayRate)),
      TOP_SECTOR_FACILITATION_MULTIPLIER
    );
    expect(top).toBeLessThanOrEqual(80_000);
    expect(top).toBeGreaterThan(deriveDayRate(FACILITATION_SCOPES[0].dayRate, 1));
  });

  it("never scales facilitation below the public rate, or above the speaking scaling", () => {
    for (const type of ORGANIZER_TYPES) {
      expect(type.facilitationMultiplier, type.id).toBeGreaterThanOrEqual(1);
      expect(type.facilitationMultiplier, type.id).toBeLessThanOrEqual(type.rateMultiplier);
    }
  });

  it("keeps facilitation above every speaking tier at the public rate", () => {
    // The ordering that justifies a separate ladder at all. It is deliberately
    // asserted at the PUBLIC rate only: at the corporate end a research-heavy
    // teaching day now costs more than a planning day, which is the intended
    // consequence of pricing the two markets separately.
    const publicSector = organizerTypeFor("government");
    const cheapestFacilitation = deriveDayRate(
      Math.min(...FACILITATION_SCOPES.map((f) => f.dayRate)),
      sectorMultiplier(publicSector, "facilitation")
    );
    expect(cheapestFacilitation).toBeGreaterThan(
      deriveDayRate(DAY_RATE_MAX, sectorMultiplier(publicSector, "speaking"))
    );
  });

  it("prices team building off the speaking ladder, not the facilitation one", () => {
    // Team building's rate is set inside the speaking range on purpose. Moving
    // it onto the facilitation multipliers would drop its corporate rate by
    // ₱15,000 a day as a side effect of a change that was never about it.
    for (const type of ORGANIZER_TYPES) {
      expect(sectorMultiplier(type, "team-building"), type.id).toBe(type.rateMultiplier);
    }
  });
});

/**
 * The published rate card for speaking engagements.
 *
 * SINGLE SOURCE OF TRUTH. The quotation engine, the intake form, the "why we
 * ask" copy, the AI prompt and the printed quote all read this file — nothing
 * downstream re-types a number or a rationale. Change a rate here and every
 * surface moves together.
 *
 * The anchor is BASE_DAY_RATE. Everything else is a multiplier on it or a
 * pass-through cost. The multipliers exist so that a two-day custom workshop
 * for a ticketed corporate audience cannot quietly settle at the same number
 * as a 45-minute campus talk — which is the failure this whole tool was built
 * to stop.
 */

// ---------------------------------------------------------------------------
// Anchors
// ---------------------------------------------------------------------------

/**
 * There is no single day rate. The rate is set by the TOPIC — see
 * COMPLEXITY_TIERS below, which carries a day rate per tier rather than a
 * multiplier on a shared anchor.
 *
 * The reasoning: what a day costs is decided by what has to happen before it.
 * Basic accounting is ground already covered many times over, so the day is
 * mostly delivery. A topic sitting outside that ground — AI applied to
 * accounting, a standard that has just changed — costs days of reading and
 * testing before a single slide exists, and none of that work is visible to
 * the organiser. Pricing it as a premium on a flat rate hid that; pricing the
 * topic directly does not.
 *
 * DAY_RATE_MIN and DAY_RATE_MAX are derived from the tiers so copy elsewhere
 * cannot quote a rate the card no longer offers.
 */
export const TRAVEL_DAY_FACTOR = 0.5;

/**
 * No engagement is quoted below this, however short. Below it the preparation,
 * the correspondence and the slot itself stop paying for themselves.
 *
 * Deliberately below the lowest day rate: a floor set AT the routine day rate
 * would price a 45-minute panel and a full-day workshop identically for every
 * core topic, which collapses the format ladder into a single number.
 *
 * Applied BEFORE any concession: they apply to the whole fee, the minimum
 * included, rather than being clawed back by a floor the discounted organiser
 * never qualified for. ABSOLUTE_MINIMUM_FEE is what catches the bottom once
 * the concessions have compounded.
 */
export const MINIMUM_ENGAGEMENT_FEE = 10_000;

/** Concessionary discount for the mission tier (see ORGANIZER_TYPES). */
export const MISSION_DISCOUNT = 0.2;

/**
 * The lowest a quote can go after every concession, whatever they combine to.
 *
 * The mission floor is expressed as a DAY RATE, so on a short format it stops
 * binding — a 0.4-day panel floors at ₱4,800, well under the minimum
 * engagement fee. Once a second concession existed, mission and returning
 * client compounded past the documented "minimum less the concession" and a
 * panel quoted ₱7,600. This is the answer to "how low can this possibly go",
 * in one number, checked last.
 */
export const ABSOLUTE_MINIMUM_FEE = Math.round(MINIMUM_ENGAGEMENT_FEE * (1 - MISSION_DISCOUNT));

/**
 * Recognition for an organiser who has booked before.
 *
 * A real saving rather than a loyalty gimmick: the discovery is already done.
 * Their sector, their constraints, what landed last time and what did not — all
 * of it is known, so the preparation genuinely costs less. Small on purpose. A
 * large returning-client discount says the first quote was padded.
 */
export const RETURNING_CLIENT_DISCOUNT = 0.05;

/**
 * If the organizer sells tickets, the speaker fee is floored at this share of
 * projected gross gate. A ₱3,500 × 80-seat workshop grosses ₱280,000; a
 * ₱10,000 speaker fee is 3.6% of that. This line is what makes the imbalance
 * visible on the quote instead of in a private complaint afterwards.
 */
export const REVENUE_SHARE_FLOOR = 0.15;

/**
 * Ceiling on the revenue-share uplift, as a multiple of the fee it lifts.
 * A very large gate should raise the fee, not replace the rate card with a
 * percentage of someone else's business.
 */
export const REVENUE_SHARE_UPLIFT_CAP = 2;

/**
 * Creditable withholding on professional fees paid to an INDIVIDUAL.
 *
 * 10% is the default; it drops to 5% where a sworn declaration of gross
 * receipts under ₱3M is on file with the payor. The quote shows 10% and says
 * so, because assuming the lower rate understates what the organiser will
 * actually deduct.
 */
export const EWT_RATE = 0.1;

/**
 * Creditable withholding when the training firm issues the invoice.
 *
 * A seminar and training provider billing as a corporation is ordinarily
 * withheld at 2% as a contractor. A payor that instead classifies the billing
 * as professional fees of a juridical entity withholds 10% (15% above ₱720K of
 * gross income). The classification is the ORGANISER'S to make, so the quote
 * names the rate it used and says the payor's own treatment governs, rather
 * than asserting a single correct answer.
 */
export const EWT_RATE_FIRM = 0.02;

/**
 * Percentage tax on the gross receipts of a non-VAT entity.
 *
 * This is the firm's own cost, not the organiser's, so it appears as a note
 * and never on the invoice. It is NOT built into the day rates: if you decide
 * to stay whole by passing it on, gross the rate ladder up rather than adding
 * a surcharge line an organiser will read as a tax they are being charged.
 */
export const PERCENTAGE_TAX_RATE = 0.03;

/**
 * The entity that issues a formal invoice when an organiser needs one.
 *
 * `vatRegistered: false` — the firm is below the ₱3M VAT threshold, so no 12%
 * is added to the organiser's total. If it crosses that threshold and
 * registers for VAT, flip this: VAT then has to be added on top of the fee as
 * its own line, claimable by the organiser as input VAT, and the quotation
 * total changes for every ticket this touches.
 */
export const INVOICING_ENTITY = {
  name: "1Punch Inc.",
  vatRegistered: false,
  vatRate: 0.12,
} as const;

/** Quote validity, and how long the requested date is held without a deposit. */
export const QUOTE_VALID_DAYS = 30;
export const DATE_HOLD_DAYS = 7;

/** Home base. Everything in REGIONS is measured as travel away from here. */
export const HOME_BASE = "Baguio City";

// ---------------------------------------------------------------------------
// Engagement type
// ---------------------------------------------------------------------------

export type EngagementTypeId = "speaking" | "facilitation" | "team-building";

export interface EngagementType {
  id: EngagementTypeId;
  label: string;
  detail: string;
}

/**
 * What kind of work this is. It decides where the day rate comes from, and
 * which questions the form asks at all.
 *
 * These are not variations on one service. A talk is prepared once and
 * delivered; facilitation is designed for one specific room, and the day in
 * that room is often HALF the engagement — the interviews before it and the
 * written plan after it are the rest, and they are exactly the parts that get
 * absorbed for free when everything is priced as "a day". So facilitation
 * carries its own rate ladder and its own pre-work and output lines, rather
 * than borrowing the subject-complexity ladder, which cannot apply to work
 * that is bespoke by definition.
 */
export const ENGAGEMENT_TYPES: EngagementType[] = [
  {
    id: "speaking",
    label: "Talk, workshop or training",
    detail: "You want a subject taught — a keynote, a session, a multi-day course",
    },
  {
    id: "facilitation",
    label: "Planning facilitation",
    detail:
      "Strategic or business planning, a board retreat — you want a room guided to a decision, not a lecture",
  },
  {
    id: "team-building",
    label: "Team building",
    detail: "Designed activities and facilitation, built around what the group actually needs",
  },
];

export function engagementTypeFor(id: EngagementTypeId): EngagementType {
  return ENGAGEMENT_TYPES.find((t) => t.id === id) ?? ENGAGEMENT_TYPES[0];
}

// ---------------------------------------------------------------------------
// Facilitation
// ---------------------------------------------------------------------------

export type FacilitationScopeId = "team" | "organisation" | "board";

export interface FacilitationScope {
  id: FacilitationScopeId;
  label: string;
  detail: string;
  dayRate: number;
}

/**
 * Facilitation rates, at PUBLIC-SECTOR level like every other ladder here.
 * The sector scales them by its OWN facilitation multiplier, not by the
 * speaking one — see OrganizerType.facilitationMultiplier.
 *
 * Two caveats worth knowing, because this ladder rests on the weakest evidence
 * on the card. First, the only day rates found for comparable facilitation were
 * international, roughly ₱70,000–440,000 a day; no reliable Philippine figure
 * turned up. An earlier version scaled this ladder by the speaking multipliers
 * and produced a ₱90,000 corporate day from that international range — a price
 * imported from a market this one is not in. The corporate facilitation day is
 * now ₱70,000 at the middle rung, which sits at the top of the Philippine
 * in-house training day range rather than above it, and is a hypothesis to test
 * against real enquiries rather than an observed price.
 * Second, these sit above the ~₱21,000 DBM honorarium ceiling even at the
 * public rate, on the basis that a planning engagement is normally procured as
 * a consultancy contract rather than paid as a resource-person honorarium —
 * which is a different rule, not an exemption from that one.
 *
 * Above every speaking tier at the public rate, because facilitation is bespoke
 * by definition — nothing is reusable, the process is designed for one room,
 * and the facilitator carries the outcome rather than the content. That
 * ordering is a property of the ladders, not of every sector: a corporate
 * research-heavy teaching day now costs more than a corporate planning day,
 * because teaching scales with the corporate training market and facilitation
 * is anchored to what a facilitation day is actually worth here.
 *
 * The ladder is about how many principals have to be reconciled, which is what
 * actually makes a room hard to run.
 */
export const FACILITATION_SCOPES: FacilitationScope[] = [
  {
    id: "team",
    label: "One team or department",
    detail: "A single planning session, clear scope, one set of decision-makers",
    dayRate: 25_000,
  },
  {
    id: "organisation",
    label: "A whole organisation or cooperative",
    detail:
      "Several departments or member groups whose priorities have to be reconciled in the room",
    dayRate: 28_000,
  },
  {
    id: "board",
    label: "A board, or several entities at once",
    detail:
      "Governance-level decisions with competing principals, where the facilitator carries the outcome",
    dayRate: 30_000,
  },
];

export function facilitationScopeFor(id: FacilitationScopeId): FacilitationScope {
  return FACILITATION_SCOPES.find((f) => f.id === id) ?? FACILITATION_SCOPES[0];
}

/**
 * Day rate for team building.
 *
 * Sits inside the speaking range rather than above it — above a settled subject
 * (₱15,000), because activity design and a room on its feet are more work than
 * a lecture, and below both the research tier (₱24,000) and all of facilitation,
 * because nothing has to be read up on first and no decision rests on the day.
 * Group size is already priced by AUDIENCE_BANDS, so it is not doubled up here.
 */
export const TEAM_BUILDING_DAY_RATE = 22_000;

/**
 * Desk days — interviews, document review, writing up — bill at this share of
 * the room day rate.
 *
 * Not the full rate: time in the room is the premium, and quoting a day of
 * writing at the same price as a day of facilitating is the kind of line an
 * organiser is right to query. Not zero either, which is what happens when
 * pre-work and write-ups are folded into "the day" and quietly absorbed.
 */
export const DESK_DAY_FACTOR = 0.7;

export interface FacilitationStage {
  id: string;
  label: string;
  detail: string;
  /** Desk days this implies, billed at DESK_DAY_FACTOR of the day rate. */
  days: number;
}

/** What happens before the room — the invisible half of a planning engagement. */
export const PREPARATION_OPTIONS: FacilitationStage[] = [
  {
    id: "none",
    label: "None — we will brief you on a call",
    detail: "You arrive with what we send you and we start from there",
    days: 0,
  },
  {
    id: "review",
    label: "Read our documents beforehand",
    detail: "Financial statements, the previous plan, board papers, an organisation chart",
    days: 0.5,
  },
  {
    id: "interviews",
    label: "Interview up to five of our people first",
    detail: "Short one-to-one conversations, so the session opens with the real disagreements",
    days: 1,
  },
  {
    id: "deep",
    label: "Interview six to twelve, and read the documents",
    detail: "Enough groundwork to design the session around what is actually contested",
    days: 2,
  },
];

/** What happens after the room. */
export const OUTPUT_OPTIONS: FacilitationStage[] = [
  {
    id: "none",
    label: "None — we will write it up ourselves",
    detail: "You leave with the outputs from the room, photographed and handed over",
    days: 0,
  },
  {
    id: "summary",
    label: "A facilitator's summary",
    detail: "What was decided, what was left open, and the agreed priorities in order",
    days: 0.5,
  },
  {
    id: "plan",
    label: "The written plan itself",
    detail: "The full document, drafted and formatted, ready to circulate or present",
    days: 2,
  },
];

export function preparationOptionFor(id: string): FacilitationStage {
  return PREPARATION_OPTIONS.find((o) => o.id === id) ?? PREPARATION_OPTIONS[0];
}

export function outputOptionFor(id: string): FacilitationStage {
  return OUTPUT_OPTIONS.find((o) => o.id === id) ?? OUTPUT_OPTIONS[0];
}

// ---------------------------------------------------------------------------
// Engagement format
// ---------------------------------------------------------------------------

export type EngagementFormatId =
  | "keynote"
  | "panel"
  | "webinar"
  | "half-day"
  | "full-day";

export interface EngagementFormat {
  id: EngagementFormatId;
  label: string;
  detail: string;
  /** Share of a full engagement day this format consumes, prep included. */
  dayEquivalent: number;
  /** True when the format is delivered online and never incurs travel. */
  remote: boolean;
  /** Engagement types this format is offered for. A keynote is not a retreat. */
  types: EngagementTypeId[];
  /**
   * Per-type wording. "Full-day workshop" is the right name for a training day
   * and the wrong one for a board retreat, and the label is what appears on the
   * quote's base line.
   */
  altLabels?: Partial<Record<EngagementTypeId, string>>;
}

export const ENGAGEMENT_FORMATS: EngagementFormat[] = [
  {
    id: "keynote",
    label: "Keynote or plenary talk",
    detail: "Up to 90 minutes, single delivery, Q&A included",
    dayEquivalent: 0.5,
    remote: false,
    types: ["speaking"],
  },
  {
    id: "panel",
    label: "Panel, fireside or reactor",
    detail: "Up to 90 minutes, shared stage, light preparation",
    dayEquivalent: 0.4,
    remote: false,
    types: ["speaking"],
  },
  {
    id: "webinar",
    label: "Online session",
    detail: "Up to 2 hours delivered over video, no travel",
    dayEquivalent: 0.45,
    remote: true,
    types: ["speaking", "facilitation"],
  },
  {
    id: "half-day",
    label: "Half-day workshop",
    detail: "Up to 4 hours, exercises and facilitation included",
    dayEquivalent: 0.6,
    remote: false,
    altLabels: { facilitation: "Half-day session", "team-building": "Half-day programme" },
    types: ["speaking", "facilitation", "team-building"],
  },
  {
    id: "full-day",
    label: "Full-day workshop",
    detail: "6 to 8 hours, hands-on, materials and facilitation included",
    dayEquivalent: 1,
    remote: false,
    altLabels: { facilitation: "Full-day session", "team-building": "Full-day programme" },
    types: ["speaking", "facilitation", "team-building"],
  },
];

// ---------------------------------------------------------------------------
// Preparation load
// ---------------------------------------------------------------------------

export type ComplexityId = "routine" | "tailored" | "applied" | "frontier";

export interface ComplexityTier {
  id: ComplexityId;
  label: string;
  detail: string;
  /**
   * The professional fee for one full engagement day on a topic at this tier.
   * This IS the base rate — there is no separate anchor it multiplies.
   */
  dayRate: number;
}

/**
 * The rate ladder, cheapest first.
 *
 * The two ends are the real anchors: an established subject is a ₱15,000 day,
 * and one needing substantial research beyond core expertise is a ₱24,000 day.
 * The middle tiers interpolate, so an engagement that is neither settled ground
 * nor a research project need not round to whichever end is nearer.
 *
 * NOTHING HERE SAYS "OFF THE SHELF". Every engagement is adapted to the room —
 * the examples, the figures and the exercises change even when the subject does
 * not. The earlier wording ("already in the catalogue", "delivered as it
 * stands") was both untrue and bad positioning: it told a paying organiser they
 * were booking a canned talk, and it understated the work behind the cheapest
 * tier. What the ladder prices is how much NEW GROUND the subject covers, not
 * whether a deck already exists.
 */
export const COMPLEXITY_TIERS: ComplexityTier[] = [
  {
    id: "routine",
    label: "Established subject",
    detail:
      "Bookkeeping, cash flow, pricing, valuation — settled ground, adapted to your people and their numbers",
    dayRate: 15_000,
  },
  {
    id: "tailored",
    label: "Established subject, rebuilt around your sector",
    detail:
      "The same ground, with the cases and worked figures redrawn from your industry",
    dayRate: 18_000,
  },
  {
    id: "applied",
    label: "New programme, within finance and accounting",
    detail:
      "Designed from scratch for this engagement — outline, deck, exercises, assessment",
    dayRate: 21_000,
  },
  {
    id: "frontier",
    label: "New programme needing fresh research",
    detail:
      "AI applied to accounting, a standard that has just changed, an unfamiliar domain — days of reading and testing before any of it can be taught",
    dayRate: 24_000,
  },
];

/** The cheapest and dearest day rates on offer. Derived so copy cannot drift. */
export const DAY_RATE_MIN = Math.min(...COMPLEXITY_TIERS.map((t) => t.dayRate));
export const DAY_RATE_MAX = Math.max(...COMPLEXITY_TIERS.map((t) => t.dayRate));

export function complexityTierFor(id: ComplexityId): ComplexityTier {
  return COMPLEXITY_TIERS.find((t) => t.id === id) ?? COMPLEXITY_TIERS[0];
}

/**
 * Hard floor under the mission discount, expressed as a day rate.
 *
 * Derived rather than typed: it is exactly the routine rate less the
 * concession, so the discount reaches its floor precisely at the cheapest tier
 * and never bites into the dearer ones. A typed literal here drifted below the
 * rate card the moment the rates moved.
 */
export const MISSION_FLOOR_DAY_RATE = Math.round(DAY_RATE_MIN * (1 - MISSION_DISCOUNT));

// ---------------------------------------------------------------------------
// Who is in the room
// ---------------------------------------------------------------------------

export type AudienceProfileId =
  | "students"
  | "non-specialist"
  | "practitioners"
  | "leadership"
  | "mixed";

export interface AudienceProfile {
  id: AudienceProfileId;
  label: string;
  detail: string;
  factor: number;
}

/**
 * Audience COMPOSITION, priced separately from audience SIZE.
 *
 * Different question, different cost. Size is a logistics problem — materials,
 * breakout support, marking. Composition is a content problem: teaching cash
 * flow to the people who prepare the statements is a different build from
 * teaching it to the people who only ever see the summary. One has to survive
 * standards-level questioning; the other needs translation and worked analogies.
 *
 * Deliberately gentle, and neutral for the two most common rooms, so a quote
 * does not read as a stack of surcharges. Only the cases where preparation
 * genuinely changes carry a premium.
 */
export const AUDIENCE_PROFILES: AudienceProfile[] = [
  {
    id: "students",
    label: "Students or fresh graduates",
    detail: "Undergraduate, graduate or entry-level, learning the subject for the first time",
    factor: 1,
  },
  {
    id: "non-specialist",
    label: "Staff and managers without a finance background",
    detail: "Branch staff, operations, sales, founders — people who use the numbers but do not prepare them",
    factor: 1,
  },
  {
    id: "practitioners",
    label: "Finance, accounting or audit practitioners",
    detail: "Peers who prepare the statements — the material has to hold up to standards-level questioning",
    factor: 1.1,
  },
  {
    id: "leadership",
    label: "Owners, executives or board members",
    detail: "Decision-makers with little time — the material is distilled, and usually briefed with the sponsor beforehand",
    factor: 1.15,
  },
  {
    id: "mixed",
    label: "Several of these in one room",
    detail: "A mixed room has to be pitched twice — once for the people who prepare the numbers, once for the people who read them",
    factor: 1.1,
  },
];

export function audienceProfileFor(id: AudienceProfileId): AudienceProfile {
  return AUDIENCE_PROFILES.find((p) => p.id === id) ?? AUDIENCE_PROFILES[1];
}

// ---------------------------------------------------------------------------
// Audience size
// ---------------------------------------------------------------------------

export interface AudienceBand {
  id: string;
  label: string;
  max: number; // inclusive upper bound; Infinity for the last band
  factor: number;
}

export const AUDIENCE_BANDS: AudienceBand[] = [
  { id: "intimate", label: "Up to 30 participants", max: 30, factor: 1 },
  { id: "standard", label: "31 to 75 participants", max: 75, factor: 1.08 },
  { id: "large", label: "76 to 150 participants", max: 150, factor: 1.15 },
  { id: "very-large", label: "151 to 300 participants", max: 300, factor: 1.25 },
  { id: "hall", label: "Over 300 participants", max: Infinity, factor: 1.35 },
];

export function audienceBandFor(size: number): AudienceBand {
  return AUDIENCE_BANDS.find((b) => size <= b.max) ?? AUDIENCE_BANDS[AUDIENCE_BANDS.length - 1];
}

// ---------------------------------------------------------------------------
// Schedule premium
// ---------------------------------------------------------------------------

export const SCHEDULE_FACTORS = {
  weekday: { id: "weekday", label: "Weekday", factor: 1 },
  weekend: { id: "weekend", label: "Weekend", factor: 1.15 },
  holiday: { id: "holiday", label: "Philippine holiday", factor: 1.3 },
} as const;

export type ScheduleFactorId = keyof typeof SCHEDULE_FACTORS;

// ---------------------------------------------------------------------------
// Lead time
// ---------------------------------------------------------------------------

export interface LeadTimeBand {
  id: string;
  label: string;
  /** Minimum days of notice for this band. */
  minDays: number;
  factor: number;
}

/** Ordered from most notice to least. */
export const LEAD_TIME_BANDS: LeadTimeBand[] = [
  { id: "planned", label: "30 days' notice or more", minDays: 30, factor: 1 },
  { id: "tight", label: "14 to 29 days' notice", minDays: 14, factor: 1.1 },
  { id: "rush", label: "7 to 13 days' notice", minDays: 7, factor: 1.2 },
  { id: "emergency", label: "Under 7 days' notice", minDays: 0, factor: 1.35 },
];

export function leadTimeBandFor(daysOfNotice: number): LeadTimeBand {
  return (
    LEAD_TIME_BANDS.find((b) => daysOfNotice >= b.minDays) ??
    LEAD_TIME_BANDS[LEAD_TIME_BANDS.length - 1]
  );
}

// ---------------------------------------------------------------------------
// Organizer type
// ---------------------------------------------------------------------------

export type OrganizerTypeId =
  | "corporate"
  | "association"
  | "cooperative"
  | "government"
  | "academic"
  | "mission";

export interface OrganizerType {
  id: OrganizerTypeId;
  label: string;
  detail: string;
  /**
   * Scales the day rate for this sector — it does NOT surcharge it.
   *
   * The ladders above are public-sector rates. A government agency cannot
   * legally pay much more than they say: DBM BC 2007-1 pays a resource person
   * twice the hourly rate of the salary grade they are pegged to, for delivery
   * hours plus equal preparation hours, which works out at roughly
   * ₱18,700–21,200 a day at SG-24 to SG-25 on the 2026 table. So the public
   * rate is not a discount, it is a ceiling.
   *
   * Corporate is a different market with a different ceiling. Philippine
   * in-house corporate training is quoted at ₱40,000–280,000 for a single
   * session, and ₱100,000–500,000 for a two-day programme. A 15% premium on a
   * government rate — which is what this field used to hold — cannot reach
   * that, and priced a two-day corporate workshop at ₱41,000: roughly what one
   * session costs at the very bottom of the market, for two days of work.
   */
  rateMultiplier: number;
  /**
   * The same idea for facilitation, which is a different market with a
   * different ceiling and so needs its own scaling.
   *
   * Teaching scales with the corporate TRAINING budget, which is large and
   * well evidenced here. Facilitation does not: the only comparable day rates
   * found were international, and scaling the facilitation ladder by the
   * speaking multiplier imported that range wholesale — a corporate planning
   * day came out at ₱90,000, above what any Philippine training day was
   * observed to cost, on the strength of no Philippine evidence at all.
   * Splitting the two lets the teaching ladder track its market without
   * dragging facilitation somewhere its own market does not support.
   */
  facilitationMultiplier: number;
  /** Short noun for the fee's base line — "the corporate rate for …". */
  sectorLabel: string;
  /** Eligible for the concessionary mission discount. */
  mission: boolean;
  /** Ordinarily withholds creditable tax on professional fees. */
  withholds: boolean;
}

/**
 * Day rates are rounded to the nearest ₱1,000 once the sector has scaled them.
 * A quote that opens with "₱76,800 a day" invites arithmetic; ₱77,000 invites
 * a decision.
 */
export function deriveDayRate(base: number, multiplier: number): number {
  return Math.round((base * multiplier) / 1_000) * 1_000;
}

export const ORGANIZER_TYPES: OrganizerType[] = [
  {
    id: "corporate",
    label: "Company or corporate in-house training",
    detail: "Private firm, bank, or a commercial training provider",
    // Benchmarked against Philippine in-house corporate training: ₱40,000–280,000 a session, ₱100,000–500,000 for a two-day programme.
    rateMultiplier: 3.2,
    // 28,000 × 2.5 = ₱70,000 at the middle rung — the top of the observed
    // Philippine training-day range rather than above it.
    facilitationMultiplier: 2.5,
    sectorLabel: "corporate",
    mission: false,
    withholds: true,
  },
  {
    id: "association",
    label: "Industry association or ticketed conference",
    detail: "Chamber, professional body, or a conference that sells seats",
    // Between the public and corporate rate — a chamber or a ticketed conference sells seats, but rarely on a corporate training budget.
    rateMultiplier: 2.5,
    facilitationMultiplier: 1.9,
    sectorLabel: "association",
    mission: false,
    withholds: true,
  },
  {
    id: "cooperative",
    label: "Cooperative or cooperative federation",
    detail: "A co-op, union or federation — larger cooperative banks are usually the corporate rate",
    // Between a private school and a chamber, for a specific reason: a
    // cooperative has a STATUTORY training budget. RA 9520 requires up to 10%
    // of net surplus to go to the cooperative education and training fund,
    // half of it spent by the co-op itself on education and training. So this
    // is not an organisation asking to be treated as a charity — the money is
    // already ring-fenced for exactly this. It sits below the association and
    // corporate rates because the surplus funding it is members' own, not
    // profit, and a co-op is answerable to those members for how it is spent.
    rateMultiplier: 2,
    facilitationMultiplier: 1.6,
    sectorLabel: "cooperative",
    mission: false,
    withholds: true,
  },
  {
    id: "government",
    label: "Government agency, LGU or state university",
    detail: "Has a budget line and a procurement process",
    // The public-sector rate the ladders are written in. Capped by DBM BC 2007-1 at roughly ₱21,000 a day, so there is no room above it.
    rateMultiplier: 1,
    facilitationMultiplier: 1,
    sectorLabel: "public-sector",
    mission: false,
    withholds: true,
  },
  {
    id: "academic",
    label: "Private school or university",
    detail: "Faculty development, student congress, graduate programme",
    // Private schools and universities have a training budget, but not a corporate one.
    rateMultiplier: 1.6,
    facilitationMultiplier: 1.4,
    sectorLabel: "private-academic",
    mission: false,
    withholds: true,
  },
  {
    id: "mission",
    label: "Public school, student org, NGO or startup community",
    detail: "No ticket revenue and no training budget — qualifies for the concessionary rate",
    // The public rate, before the concession below.
    rateMultiplier: 1,
    facilitationMultiplier: 1,
    sectorLabel: "public-sector",
    mission: true,
    // True, despite the concession. Public schools, SUCs and registered NGOs
    // are withholding agents exactly as government offices are; marking the
    // tier exempt suppressed the withholding note and left the speaker short
    // at payout with no warning on the quote. An organiser that is not a
    // withholding agent simply pays the gross, which the note already allows for.
    withholds: true,
  },
];

/**
 * The dearest sector's scaling, so copy can quote the full spread a reader
 * might be quoted rather than only the public-sector end of it.
 */
export const TOP_SECTOR_MULTIPLIER = Math.max(
  ...ORGANIZER_TYPES.map((o) => o.rateMultiplier)
);

/** The same, for the facilitation ladder, which the sectors scale differently. */
export const TOP_SECTOR_FACILITATION_MULTIPLIER = Math.max(
  ...ORGANIZER_TYPES.map((o) => o.facilitationMultiplier)
);

/**
 * Which of a sector's two multipliers applies.
 *
 * Every surface that shows a day rate — the form's chips, the "why we ask"
 * copy, the printed quote — resolves it through here rather than reaching for
 * `rateMultiplier` directly, so the two ladders cannot drift apart on one
 * screen. Team building deliberately uses the SPEAKING multiplier: its rate is
 * set inside the speaking range, and pricing it off the facilitation ladder
 * would move a number nobody asked to move.
 */
export function sectorMultiplier(organizer: OrganizerType, type: EngagementTypeId): number {
  return type === "facilitation" ? organizer.facilitationMultiplier : organizer.rateMultiplier;
}

export function organizerTypeFor(id: OrganizerTypeId): OrganizerType {
  return ORGANIZER_TYPES.find((o) => o.id === id) ?? ORGANIZER_TYPES[0];
}

// ---------------------------------------------------------------------------
// Add-ons
// ---------------------------------------------------------------------------

export type AddOnId =
  | "recording-internal"
  | "recording-public"
  | "workbook"
  | "assessment"
  | "clinic";

export interface AddOn {
  id: AddOnId;
  label: string;
  detail: string;
  /** Share of the professional fee. Mutually exclusive with `amount`. */
  factor?: number;
  /** Flat peso amount. Mutually exclusive with `factor`. */
  amount?: number;
}

export const ADD_ONS: AddOn[] = [
  {
    id: "recording-internal",
    label: "Recording, for internal reuse",
    detail: "You may record the session and replay it inside your organisation indefinitely",
    factor: 0.2,
  },
  {
    id: "recording-public",
    label: "Recording, for public or commercial reuse",
    detail: "Rebroadcast, posting to a public channel, or resale as course material",
    factor: 0.35,
  },
  {
    id: "workbook",
    label: "Participant workbook",
    detail: "Printable exercises and templates, branded for the event",
    amount: 8_000,
  },
  {
    id: "assessment",
    label: "Pre-event survey and post-event report",
    detail: "Baseline survey, scored post-test, and a written findings summary for the organiser",
    amount: 6_000,
  },
  {
    id: "clinic",
    label: "Follow-up clinic",
    detail: "A one-hour online consultation for participants, scheduled within 30 days",
    amount: 7_500,
  },
];

export function addOnFor(id: AddOnId): AddOn | undefined {
  return ADD_ONS.find((a) => a.id === id);
}

// ---------------------------------------------------------------------------
// Travel and logistics
// ---------------------------------------------------------------------------

export type RegionId =
  | "online"
  | "baguio"
  | "north-luzon"
  | "metro-manila"
  | "south-luzon"
  | "visayas-mindanao"
  | "international";

export interface Region {
  id: RegionId;
  label: string;
  detail: string;
  /** Round-trip transport estimate from HOME_BASE, in pesos. */
  transport: number;
  /** Nightly accommodation estimate, in pesos. */
  nightly: number;
  /** Ground transfers and meals per engagement day, in pesos. */
  perDiem: number;
  /** Paid travel days each way is folded into this single figure. */
  travelDays: number;
  /** True when an overnight stay is unavoidable, whatever the start time. */
  overnightRequired: boolean;
  /** Rendered as an estimate only — the real number needs a conversation. */
  custom?: boolean;
}

export const REGIONS: Region[] = [
  {
    id: "online",
    label: "Online",
    detail: "Delivered over video — no travel, no accommodation",
    transport: 0,
    nightly: 0,
    perDiem: 0,
    travelDays: 0,
    overnightRequired: false,
  },
  {
    id: "baguio",
    label: "Baguio City or Benguet",
    detail: "Home base — no travel cost and no travel day",
    transport: 0,
    nightly: 0,
    perDiem: 500,
    travelDays: 0,
    overnightRequired: false,
  },
  {
    id: "north-luzon",
    label: "Northern or Central Luzon",
    detail: "Pangasinan, Ilocos, Cagayan Valley, Nueva Ecija, Pampanga, Tarlac",
    transport: 6_000,
    nightly: 4_500,
    perDiem: 1_200,
    travelDays: 0.5,
    overnightRequired: false,
  },
  {
    id: "metro-manila",
    label: "Metro Manila and nearby",
    detail: "NCR, Rizal, Bulacan, Cavite — a 5 to 7 hour trip each way from Baguio",
    transport: 4_000,
    nightly: 6_000,
    perDiem: 1_500,
    travelDays: 1,
    overnightRequired: false,
  },
  {
    id: "south-luzon",
    label: "Southern Luzon and Bicol",
    detail: "Laguna, Batangas, Quezon, Camarines, Albay",
    transport: 7_000,
    nightly: 5_500,
    perDiem: 1_500,
    travelDays: 1,
    overnightRequired: true,
  },
  {
    id: "visayas-mindanao",
    label: "Visayas or Mindanao",
    detail: "Requires a flight and an overnight before the engagement",
    transport: 14_000,
    nightly: 6_500,
    perDiem: 1_800,
    travelDays: 1,
    overnightRequired: true,
  },
  {
    id: "international",
    label: "Outside the Philippines",
    detail: "Airfare, visa and per diem quoted separately once the city is known",
    transport: 0,
    nightly: 0,
    perDiem: 0,
    travelDays: 2,
    overnightRequired: true,
    custom: true,
  },
];

export function regionFor(id: RegionId): Region {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}


/** The format's name for the engagement type it is being used in. */
export function formatLabel(format: EngagementFormat, type: EngagementTypeId): string {
  return format.altLabels?.[type] ?? format.label;
}

/** The formats offered for one engagement type. */
export function formatsFor(type: EngagementTypeId): EngagementFormat[] {
  return ENGAGEMENT_FORMATS.filter((f) => f.types.includes(type));
}

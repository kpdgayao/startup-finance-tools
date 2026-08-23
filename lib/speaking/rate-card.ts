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
 * Applied BEFORE the mission concession, so a mission-tier quote can land at
 * MINIMUM_ENGAGEMENT_FEE × (1 − MISSION_DISCOUNT) and no lower. That is
 * deliberate: the concession applies to the whole fee, the minimum included,
 * rather than being clawed back by a floor the discounted organiser never
 * qualified for.
 */
export const MINIMUM_ENGAGEMENT_FEE = 10_000;

/** Concessionary discount for the mission tier (see ORGANIZER_TYPES). */
export const MISSION_DISCOUNT = 0.2;

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

/** Creditable withholding tax on professional fees paid to an individual. */
export const EWT_RATE = 0.1;

/** Quote validity, and how long the requested date is held without a deposit. */
export const QUOTE_VALID_DAYS = 30;
export const DATE_HOLD_DAYS = 7;

/** Home base. Everything in REGIONS is measured as travel away from here. */
export const HOME_BASE = "Baguio City";

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
}

export const ENGAGEMENT_FORMATS: EngagementFormat[] = [
  {
    id: "keynote",
    label: "Keynote or plenary talk",
    detail: "Up to 90 minutes, single delivery, Q&A included",
    dayEquivalent: 0.5,
    remote: false,
  },
  {
    id: "panel",
    label: "Panel, fireside or reactor",
    detail: "Up to 90 minutes, shared stage, light preparation",
    dayEquivalent: 0.4,
    remote: false,
  },
  {
    id: "webinar",
    label: "Online session",
    detail: "Up to 2 hours delivered over video, no travel",
    dayEquivalent: 0.45,
    remote: true,
  },
  {
    id: "half-day",
    label: "Half-day workshop",
    detail: "Up to 4 hours, exercises and facilitation included",
    dayEquivalent: 0.6,
    remote: false,
  },
  {
    id: "full-day",
    label: "Full-day workshop",
    detail: "6 to 8 hours, hands-on, materials and facilitation included",
    dayEquivalent: 1,
    remote: false,
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
 * The two ends are the real anchors: a routine topic is a ₱15,000 day, and a
 * topic needing substantial research beyond core expertise is a ₱24,000 day.
 * The two middle tiers interpolate between them, so an engagement that is
 * neither purely delivery nor a research project does not have to be rounded
 * to whichever end is nearer.
 */
export const COMPLEXITY_TIERS: ComplexityTier[] = [
  {
    id: "routine",
    label: "Core topic, already in the catalogue",
    detail:
      "Basic accounting, bookkeeping, cash flow, pricing, valuation — taught many times, delivered as it stands",
    dayRate: 15_000,
  },
  {
    id: "tailored",
    label: "Core topic, rebuilt around your sector",
    detail: "The same ground, with examples and worked figures redrawn from your industry",
    dayRate: 18_000,
  },
  {
    id: "applied",
    label: "New curriculum, inside core expertise",
    detail:
      "Written from scratch — outline, deck, exercises, assessment — but on familiar ground",
    dayRate: 21_000,
  },
  {
    id: "frontier",
    label: "Beyond core expertise, needs substantial research",
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
  | "government"
  | "academic"
  | "mission";

export interface OrganizerType {
  id: OrganizerTypeId;
  label: string;
  detail: string;
  factor: number;
  /** Eligible for the concessionary mission discount. */
  mission: boolean;
  /** Ordinarily withholds creditable tax on professional fees. */
  withholds: boolean;
}

export const ORGANIZER_TYPES: OrganizerType[] = [
  {
    id: "corporate",
    label: "Company or corporate in-house training",
    detail: "Private firm, bank, cooperative bank, or a commercial training provider",
    factor: 1.15,
    mission: false,
    withholds: true,
  },
  {
    id: "association",
    label: "Industry association or ticketed conference",
    detail: "Chamber, professional body, or a conference that sells seats",
    factor: 1.1,
    mission: false,
    withholds: true,
  },
  {
    id: "government",
    label: "Government agency, LGU or state university",
    detail: "Has a budget line and a procurement process",
    factor: 1,
    mission: false,
    withholds: true,
  },
  {
    id: "academic",
    label: "Private school or university",
    detail: "Faculty development, student congress, graduate programme",
    factor: 1,
    mission: false,
    withholds: true,
  },
  {
    id: "mission",
    label: "Public school, student org, NGO or startup community",
    detail: "No ticket revenue and no training budget — qualifies for the concessionary rate",
    factor: 1,
    mission: true,
    withholds: false,
  },
];

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

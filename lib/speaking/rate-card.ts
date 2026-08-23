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

/** Professional fee for one full engagement day, before any factor. */
export const BASE_DAY_RATE = 25_000;

/**
 * No engagement is quoted below this, however short. Below it the preparation,
 * the correspondence and the day itself stop paying for themselves — a 45
 * minute keynote still costs a working day once prep and travel are counted.
 *
 * This floor is applied BEFORE the mission concession, so a mission-tier quote
 * can land at MINIMUM_ENGAGEMENT_FEE × (1 − MISSION_DISCOUNT) — ₱12,000 — and
 * no lower. That is deliberate: the concession applies to the whole fee, the
 * minimum included, rather than being clawed back by a floor the discounted
 * organiser never qualified for.
 */
export const MINIMUM_ENGAGEMENT_FEE = 15_000;

/** A travel day is paid at half the day rate. It is a day that cannot be sold. */
export const TRAVEL_DAY_FACTOR = 0.5;

/** Concessionary discount for the mission tier (see ORGANIZER_TYPES). */
export const MISSION_DISCOUNT = 0.2;

/**
 * Hard floor under the mission discount. The discount is a concession, not an
 * open-ended negotiation — it stops here regardless of what the multipliers do.
 */
export const MISSION_FLOOR_DAY_RATE = 18_000;

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

export type ComplexityId = "existing" | "tailored" | "custom" | "technical";

export interface ComplexityTier {
  id: ComplexityId;
  label: string;
  detail: string;
  factor: number;
}

export const COMPLEXITY_TIERS: ComplexityTier[] = [
  {
    id: "existing",
    label: "A topic already in the catalogue",
    detail: "Delivered as it stands — valuation, cash flow, pricing, SAFEs, compliance",
    factor: 1,
  },
  {
    id: "tailored",
    label: "Catalogue topic, tailored to your sector",
    detail: "Same frame, rebuilt examples and cases using your industry's numbers",
    factor: 1.15,
  },
  {
    id: "custom",
    label: "New curriculum built for this event",
    detail: "Written from scratch — outline, deck, worked examples, exercises",
    factor: 1.35,
  },
  {
    id: "technical",
    label: "New curriculum with technical or regulatory depth",
    detail: "Built from scratch and tied to PFRS, BIR or board-exam standards, with assessment",
    factor: 1.55,
  },
];

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

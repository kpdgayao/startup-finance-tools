/**
 * The quotation engine. Pure, deterministic, no I/O, no clock — the caller
 * passes `today` in so the same inputs always produce the same quote.
 *
 * The output is deliberately an ITEMISED list rather than a total. Every
 * factor that moved the number appears as its own line with the reason
 * attached, because the tool's job is not to name a price: it is to show an
 * organiser what they are actually buying, so the conversation starts from the
 * work rather than from their budget.
 *
 * ORDER OF OPERATIONS matters and is fixed:
 *   1. base fee: the topic's day rate × day-equivalents
 *   2. multiplicative factors (audience, schedule, notice, organiser)
 *   3. the minimum engagement floor
 *   4. add-ons (percentages read the floored fee, flat amounts are added after)
 *   5. travel days
 *   6. the mission discount, then its own floor
 *   7. the revenue-share floor, which may only ever raise the fee
 *   8. reimbursables, which sit outside the professional fee entirely
 * Reordering these changes the number. Steps 6 and 7 are last on purpose: a
 * concession should be applied to a settled fee, and the gate-share floor is a
 * floor on everything that came before it, discount included.
 */

import {
  ADD_ONS,
  AUDIENCE_BANDS,
  DATE_HOLD_DAYS,
  ENGAGEMENT_FORMATS,
  EWT_RATE,
  MINIMUM_ENGAGEMENT_FEE,
  MISSION_DISCOUNT,
  MISSION_FLOOR_DAY_RATE,
  QUOTE_VALID_DAYS,
  REVENUE_SHARE_FLOOR,
  REVENUE_SHARE_UPLIFT_CAP,
  SCHEDULE_FACTORS,
  TRAVEL_DAY_FACTOR,
  addOnFor,
  audienceBandFor,
  leadTimeBandFor,
  organizerTypeFor,
  regionFor,
  type AddOnId,
  type ComplexityId,
  type EngagementFormatId,
  type OrganizerTypeId,
  type RegionId,
  type ScheduleFactorId,
} from "./rate-card";
import { complexityTierFor } from "./rate-card";
import {
  addDays,
  daysBetween,
  engagementDates,
  holidayFor,
  isWeekend,
  weekdayName,
} from "./availability";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface QuotationInput {
  format: EngagementFormatId;
  /** Number of sessions or engagement days, consecutive from `startDate`. */
  sessions: number;
  complexity: ComplexityId;
  audienceSize: number;
  organizerType: OrganizerTypeId;
  /** True when participants pay to attend. */
  ticketed: boolean;
  participantFee: number;
  expectedPaidAttendees: number;
  region: RegionId;
  /** First engagement day, `YYYY-MM-DD`. */
  startDate: string;
  /** Organiser books and pays for transport directly. */
  travelCovered: boolean;
  /** Organiser books and pays for accommodation directly. */
  accommodationCovered: boolean;
  /** Session starts before 10am, forcing an overnight the evening before. */
  earlyStart: boolean;
  addOns: AddOnId[];
  /** Today, `YYYY-MM-DD`. Injected rather than read from the clock. */
  today: string;
  /** Free-text, carried through to the printed quote. */
  eventTitle?: string;
  organizationName?: string;
  contactName?: string;
  venue?: string;
}

export const DEFAULT_INPUT: Omit<QuotationInput, "today" | "startDate"> = {
  format: "full-day",
  sessions: 1,
  complexity: "tailored",
  audienceSize: 40,
  organizerType: "corporate",
  ticketed: false,
  participantFee: 0,
  expectedPaidAttendees: 0,
  region: "metro-manila",
  travelCovered: true,
  accommodationCovered: true,
  earlyStart: true,
  addOns: [],
  eventTitle: "",
  organizationName: "",
  contactName: "",
  venue: "",
};

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export type LineKind = "base" | "factor" | "addon" | "discount" | "floor" | "travel";

export interface LineItem {
  id: string;
  label: string;
  /** Why this line exists, in the organiser's language. */
  detail: string;
  /** The multiplier, when the line is a factor. */
  factor?: number;
  /** Peso effect of this line on the running fee. Negative for a discount. */
  amount: number;
  /** Running professional-fee subtotal after this line. */
  runningTotal: number;
  kind: LineKind;
}

export interface Reimbursable {
  id: string;
  label: string;
  detail: string;
  /** Estimated cost. Charged only when `billed` is true. */
  amount: number;
  billed: boolean;
}

export interface QuotationDateNote {
  date: string;
  weekday: string;
  holiday?: string;
  isWeekend: boolean;
}

export interface Quotation {
  /** Deterministic reference derived from the inputs — no clock, no random. */
  reference: string;
  /** The day rate the topic tier set. The number effectiveDayRate is judged against. */
  dayRate: number;
  /** The tier's label, so the summary can name what set the rate. */
  topicTier: string;
  dayEquivalents: number;
  /**
   * Every day the engagement consumes: delivery days plus travel days.
   *
   * This, not `dayEquivalents`, is the denominator for `effectiveDayRate`. A
   * Metro Manila day trip that needs an overnight really does cost two working
   * days, and dividing a fee that already includes travel-day compensation by
   * delivery days alone reports a day rate the speaker is not being paid.
   */
  daysCommitted: number;
  lines: LineItem[];
  professionalFee: number;
  reimbursables: Reimbursable[];
  reimbursablesBilled: number;
  reimbursablesCovered: number;
  total: number;
  /** Fee ÷ days committed. The number to compare against the topic's day rate. */
  effectiveDayRate: number;
  /** Projected gross gate, when the event is ticketed. */
  projectedGate: number;
  /** Fee as a share of the gate, 0 when the event is not ticketed. */
  gateShare: number;
  withholding: { applies: boolean; rate: number; amount: number; net: number };
  dates: QuotationDateNote[];
  schedule: { id: ScheduleFactorId; label: string; factor: number; reason: string };
  validUntil: string;
  holdUntil: string;
  daysOfNotice: number;
  /** Things the organiser must decide or confirm, surfaced on the quote. */
  flags: string[];
  customQuoteRequired: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Peso amounts are quoted to the nearest hundred — nobody invoices ₱47,382.14. */
function roundPeso(amount: number): number {
  return Math.round(amount / 100) * 100;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function clampAmount(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * A short, stable reference an organiser can quote back in an email. Derived
 * from the inputs by FNV-1a so the same request always yields the same code —
 * a timestamp or a random suffix would make every re-render a "new" quote and
 * make the reference useless as a shared handle.
 */
function referenceFor(input: QuotationInput): string {
  const seed = [
    input.startDate,
    input.format,
    input.sessions,
    input.complexity,
    input.organizerType,
    input.region,
    input.audienceSize,
    input.organizationName ?? "",
  ].join("|");

  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const code = hash.toString(36).toUpperCase().padStart(7, "0").slice(-5);
  return `SFT-${input.startDate.replace(/-/g, "").slice(2)}-${code}`;
}

/** The strongest schedule premium across the engagement dates. */
function scheduleFor(dates: string[]): Quotation["schedule"] {
  const holidayDate = dates.find((d) => holidayFor(d));
  if (holidayDate) {
    return {
      ...SCHEDULE_FACTORS.holiday,
      reason: `${holidayFor(holidayDate)} falls on ${holidayDate}`,
    };
  }
  const weekendDate = dates.find((d) => isWeekend(d));
  if (weekendDate) {
    return {
      ...SCHEDULE_FACTORS.weekend,
      reason: `${weekdayName(weekendDate)}, ${weekendDate}`,
    };
  }
  return { ...SCHEDULE_FACTORS.weekday, reason: "All engagement days fall on weekdays" };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export function buildQuotation(raw: QuotationInput): Quotation {
  const format =
    ENGAGEMENT_FORMATS.find((f) => f.id === raw.format) ?? ENGAGEMENT_FORMATS[0];
  const complexity = complexityTierFor(raw.complexity);
  // The topic sets the rate. Everything downstream that used to read a shared
  // anchor — the base fee, travel days, the effective-rate comparison — reads
  // this instead.
  const dayRate = complexity.dayRate;
  const organizer = organizerTypeFor(raw.organizerType);
  // An online format overrides whatever region was picked: there is no travel
  // to a webinar, and leaving a stale region selected would bill hotel nights
  // for a video call.
  const region = format.remote ? regionFor("online") : regionFor(raw.region);

  const sessions = clampInt(raw.sessions, 1, 30);
  const audienceSize = clampInt(raw.audienceSize, 1, 100_000);
  const audience = audienceBandFor(audienceSize);

  const dates = engagementDates(raw.startDate, sessions);
  const schedule = scheduleFor(dates);
  const daysOfNotice = Math.max(0, daysBetween(raw.today, raw.startDate));
  const leadTime = leadTimeBandFor(daysOfNotice);

  const dayEquivalents = Number((format.dayEquivalent * sessions).toFixed(3));

  const lines: LineItem[] = [];
  let running = 0;

  const push = (
    item: Omit<LineItem, "runningTotal" | "amount"> & { amount: number }
  ) => {
    running += item.amount;
    lines.push({ ...item, runningTotal: roundPeso(running) });
  };

  // 1. Base fee ------------------------------------------------------------
  const baseFee = dayRate * dayEquivalents;
  push({
    id: "base",
    kind: "base",
    label: `${format.label}${sessions > 1 ? ` × ${sessions}` : ""}`,
    // The tier is named here rather than carried as its own factor line: it is
    // not a surcharge on a standard rate, it IS the rate.
    detail: `${dayEquivalents} engagement ${
      dayEquivalents === 1 ? "day" : "days"
    } at ₱${dayRate.toLocaleString("en-PH")}/day — ${complexity.label.toLowerCase()}`,
    amount: baseFee,
  });

  // 2. Multiplicative factors ---------------------------------------------
  const factors: Array<{ id: string; label: string; detail: string; factor: number }> = [
    {
      id: "audience",
      label: audience.label,
      detail:
        audience.factor === 1
          ? "A room this size needs no extra facilitation support"
          : "Larger rooms mean more materials, more breakout support and a heavier assessment load",
      factor: audience.factor,
    },
    {
      id: "schedule",
      label: schedule.label,
      detail: schedule.reason,
      factor: schedule.factor,
    },
    {
      id: "lead-time",
      label: leadTime.label,
      detail:
        leadTime.factor === 1
          ? "Enough notice to prepare without displacing other work"
          : "Short notice displaces committed work and compresses preparation",
      factor: leadTime.factor,
    },
    {
      id: "organizer",
      label: organizer.label,
      detail: organizer.detail,
      factor: organizer.factor,
    },
  ];

  for (const f of factors) {
    if (f.factor === 1) {
      // Still listed, at zero: a factor that did nothing is information too.
      // It shows the organiser which levers they are already on the good side
      // of, and stops the breakdown from reading as a list of surcharges.
      push({ ...f, kind: "factor", amount: 0 });
      continue;
    }
    push({ ...f, kind: "factor", amount: running * (f.factor - 1) });
  }

  // 3. Minimum engagement floor -------------------------------------------
  if (running < MINIMUM_ENGAGEMENT_FEE) {
    push({
      id: "minimum",
      kind: "floor",
      label: "Minimum engagement fee",
      detail: `No engagement is quoted below ₱${MINIMUM_ENGAGEMENT_FEE.toLocaleString(
        "en-PH"
      )} before concessions — preparation, correspondence and the day itself cost the same however short the slot`,
      amount: MINIMUM_ENGAGEMENT_FEE - running,
    });
  }

  const feeBeforeAddOns = running;

  // 4. Add-ons -------------------------------------------------------------
  const selectedAddOns = ADD_ONS.filter((a) => raw.addOns.includes(a.id));
  for (const addOn of selectedAddOns) {
    const amount = addOn.factor ? feeBeforeAddOns * addOn.factor : (addOn.amount ?? 0);
    push({
      id: `addon-${addOn.id}`,
      kind: "addon",
      label: addOn.label,
      detail: addOn.detail,
      factor: addOn.factor,
      amount,
    });
  }

  // 5. Travel days ---------------------------------------------------------
  if (region.travelDays > 0) {
    push({
      id: "travel-days",
      kind: "travel",
      label: `${region.travelDays} travel ${region.travelDays === 1 ? "day" : "days"}`,
      detail: `Getting to ${region.label} and back from Baguio is time that cannot be sold to anyone else — billed at ${
        TRAVEL_DAY_FACTOR * 100
      }% of the ₱${dayRate.toLocaleString("en-PH")} day rate`,
      amount: dayRate * TRAVEL_DAY_FACTOR * region.travelDays,
    });
  }

  // 6. Mission discount, then its floor ------------------------------------
  if (organizer.mission) {
    const discount = running * MISSION_DISCOUNT;
    const afterDiscount = running - discount;
    const missionFloor = MISSION_FLOOR_DAY_RATE * dayEquivalents;
    const applied = afterDiscount < missionFloor ? running - missionFloor : discount;

    if (applied > 0) {
      push({
        id: "mission-discount",
        kind: "discount",
        label: `Concessionary rate (−${MISSION_DISCOUNT * 100}%)`,
        detail:
          applied < discount
            ? `The full ${MISSION_DISCOUNT * 100}% discount would fall below the ₱${MISSION_FLOOR_DAY_RATE.toLocaleString(
                "en-PH"
              )}/day concessionary floor, so it stops there`
            : "Public schools, student organisations, NGOs and startup community groups pay a reduced rate",
        amount: -applied,
      });
    }
  }

  // 7. Revenue-share floor -------------------------------------------------
  const participantFee = clampAmount(raw.participantFee, 0, 1_000_000);
  const paidAttendees = clampInt(
    raw.expectedPaidAttendees > 0 ? raw.expectedPaidAttendees : audienceSize,
    0,
    100_000
  );
  const projectedGate = raw.ticketed ? participantFee * paidAttendees : 0;
  const gateFloor = projectedGate * REVENUE_SHARE_FLOOR;
  // Captured before the uplift so the "still conservative" flag below compares
  // the gate against the rate-card fee rather than against its own result.
  const feeBeforeGateFloor = running;

  if (raw.ticketed && gateFloor > running) {
    const uncapped = gateFloor - running;
    const cap = running * REVENUE_SHARE_UPLIFT_CAP;
    const uplift = Math.min(uncapped, cap);
    push({
      id: "revenue-share",
      kind: "floor",
      label: `Revenue-share floor (${REVENUE_SHARE_FLOOR * 100}% of projected gate)`,
      detail: `${paidAttendees.toLocaleString(
        "en-PH"
      )} paid seats at ₱${participantFee.toLocaleString(
        "en-PH"
      )} projects ₱${roundPeso(projectedGate).toLocaleString(
        "en-PH"
      )} in ticket revenue. When an event sells seats on the strength of its programme, the fee is floored at ${
        REVENUE_SHARE_FLOOR * 100
      }% of that gate${uplift < uncapped ? ", capped here at twice the rate-card fee" : ""}`,
      amount: uplift,
    });
  }

  const professionalFee = roundPeso(running);

  // 8. Reimbursables -------------------------------------------------------
  // Nights between consecutive session days, plus an arrival night when the
  // room opens before 10am or the trip cannot be done in a day. A region with
  // no nightly rate (home base, online) never accrues nights.
  const arrivalNight = region.overnightRequired || raw.earlyStart;
  const nights =
    region.nightly > 0 ? Math.max(0, sessions - 1) + (arrivalNight ? 1 : 0) : 0;

  const reimbursables: Reimbursable[] = [];

  if (region.transport > 0) {
    reimbursables.push({
      id: "transport",
      label: `Round-trip transport, Baguio ↔ ${region.label}`,
      detail: raw.travelCovered
        ? "Booked and paid for directly by the organiser"
        : "Estimate — billed at actual cost with receipts",
      amount: region.transport,
      billed: !raw.travelCovered,
    });
  }

  if (nights > 0) {
    reimbursables.push({
      id: "accommodation",
      label: `Accommodation, ${nights} ${nights === 1 ? "night" : "nights"}`,
      detail: raw.accommodationCovered
        ? "Booked and paid for directly by the organiser"
        : `Estimate at ₱${region.nightly.toLocaleString("en-PH")}/night — billed at actual cost with receipts`,
      amount: region.nightly * nights,
      billed: !raw.accommodationCovered,
    });
  }

  if (region.perDiem > 0) {
    const perDiemDays = sessions + (nights > 0 ? 1 : 0);
    reimbursables.push({
      id: "per-diem",
      label: `Ground transfers and meals, ${perDiemDays} ${perDiemDays === 1 ? "day" : "days"}`,
      detail: raw.travelCovered
        ? "Arranged by the organiser"
        : `Estimate at ₱${region.perDiem.toLocaleString("en-PH")}/day`,
      amount: region.perDiem * perDiemDays,
      billed: !raw.travelCovered,
    });
  }

  const reimbursablesBilled = roundPeso(
    reimbursables.filter((r) => r.billed).reduce((sum, r) => sum + r.amount, 0)
  );
  const reimbursablesCovered = roundPeso(
    reimbursables.filter((r) => !r.billed).reduce((sum, r) => sum + r.amount, 0)
  );

  const total = professionalFee + reimbursablesBilled;

  // Withholding is informational: it is the organiser's obligation, not a
  // deduction the quote applies. It is shown so nobody is surprised at payout.
  const withholdingAmount = organizer.withholds ? roundPeso(professionalFee * EWT_RATE) : 0;

  // Flags ------------------------------------------------------------------
  const flags: string[] = [];
  if (region.custom) {
    flags.push(
      "International engagements need a separate travel quote — airfare, visa and per diem are not estimated here."
    );
  }
  if (raw.ticketed && projectedGate === 0) {
    flags.push(
      "The event is marked as ticketed but the ticket price or seat count is still blank, so the revenue-share floor has not been applied."
    );
  }
  if (raw.ticketed && gateFloor > feeBeforeGateFloor * (1 + REVENUE_SHARE_UPLIFT_CAP)) {
    flags.push(
      "Projected ticket revenue is far above the rate-card fee. The uplift is capped, so this quote is likely still conservative."
    );
  }
  if (!raw.travelCovered || !raw.accommodationCovered) {
    flags.push(
      "Travel or accommodation is not covered by the organiser, so it appears as a billed reimbursable. Booking it directly is usually cheaper for you than reimbursing it."
    );
  }
  if (daysOfNotice < 14 && daysOfNotice >= 0) {
    flags.push(
      `Only ${daysOfNotice} ${daysOfNotice === 1 ? "day" : "days"} of notice — confirm availability before circulating this quote.`
    );
  }
  if (sessions > 1) {
    flags.push(
      "Dates are assumed consecutive. If the sessions are spread across weeks, say so — it changes the travel line, not the fee."
    );
  }

  const daysCommitted = Number((dayEquivalents + region.travelDays).toFixed(3));

  return {
    reference: referenceFor(raw),
    dayRate,
    topicTier: complexity.label,
    dayEquivalents,
    daysCommitted,
    lines: lines.map((l) => ({ ...l, amount: roundPeso(l.amount) })),
    professionalFee,
    reimbursables,
    reimbursablesBilled,
    reimbursablesCovered,
    total,
    effectiveDayRate: daysCommitted > 0 ? roundPeso(professionalFee / daysCommitted) : 0,
    projectedGate: roundPeso(projectedGate),
    gateShare: projectedGate > 0 ? (professionalFee / projectedGate) * 100 : 0,
    withholding: {
      applies: organizer.withholds,
      rate: EWT_RATE,
      amount: withholdingAmount,
      net: professionalFee - withholdingAmount,
    },
    dates: dates.map((date) => ({
      date,
      weekday: weekdayName(date),
      holiday: holidayFor(date),
      isWeekend: isWeekend(date),
    })),
    schedule,
    validUntil: addDays(raw.today, QUOTE_VALID_DAYS),
    holdUntil: addDays(raw.today, DATE_HOLD_DAYS),
    daysOfNotice,
    flags,
    customQuoteRequired: Boolean(region.custom),
  };
}

/** Every add-on id, for validating client input. */
export const ADD_ON_IDS: AddOnId[] = ADD_ONS.map((a) => a.id);

/** Named export used by the audience-band copy in the form. */
export { AUDIENCE_BANDS, addOnFor };

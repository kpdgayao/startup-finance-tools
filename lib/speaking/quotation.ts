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
  DESK_DAY_FACTOR,
  ENGAGEMENT_FORMATS,
  EWT_RATE,
  EWT_RATE_FIRM,
  HONORARIUM_DAY_CEILING,
  INVOICING_ENTITY,
  PERCENTAGE_TAX_RATE,
  MINIMUM_ENGAGEMENT_FEE,
  ABSOLUTE_MINIMUM_FEE,
  MISSION_DISCOUNT,
  MISSION_FLOOR_DAY_RATE,
  RETURNING_CLIENT_DISCOUNT,
  QUOTE_VALID_DAYS,
  REVENUE_SHARE_FLOOR,
  REVENUE_SHARE_UPLIFT_CAP,
  SCHEDULE_FACTORS,
  TRAVEL_DAY_FACTOR,
  addOnFor,
  TEAM_BUILDING_DAY_RATE,
  audienceBandFor,
  audienceProfileFor,
  deriveDayRate,
  sectorMultiplier,
  engagementTypeFor,
  facilitationScopeFor,
  formatLabel,
  leadTimeBandFor,
  outputOptionFor,
  preparationOptionFor,
  organizerTypeFor,
  regionFor,
  type AddOnId,
  type AudienceProfileId,
  type ComplexityId,
  type EngagementFormatId,
  type EngagementTypeId,
  type FacilitationScopeId,
  type OrganizerTypeId,
  type RegionId,
  type ScheduleFactorId,
} from "./rate-card";
import { complexityTierFor } from "./rate-card";
import {
  addDays,
  daysBetween,
  engagementDates,
  formatEngagementDate,
  holidayFor,
  isWeekend,
  weekdayName,
} from "./availability";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface QuotationInput {
  /** What kind of work this is. Decides where the day rate comes from. */
  engagementType: EngagementTypeId;
  format: EngagementFormatId;
  /** Number of sessions or engagement days, consecutive from `startDate`. */
  sessions: number;
  /** Speaking only: how much new ground the subject covers. */
  complexity: ComplexityId;
  /** Facilitation only: how many principals have to be reconciled. */
  facilitationScope: FacilitationScopeId;
  /** Facilitation only: interviews and reading before the room. */
  preparation: string;
  /** Facilitation only: what gets written afterwards. */
  output: string;
  audienceSize: number;
  /** Who is in the room. Priced separately from how many — see AUDIENCE_PROFILES. */
  audienceProfile: AudienceProfileId;
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
  /**
   * The organiser needs a formal invoice, so the training firm issues it
   * rather than the fee being billed personally.
   *
   * This does NOT change the professional fee. Issuing a proper invoice is not
   * extra work worth charging for — what it changes is the withholding basis
   * and, if the firm were ever VAT-registered, whether VAT sits on top.
   */
  invoiceRequired: boolean;
  /** They have booked before, so the discovery is already done. */
  returningClient: boolean;
  /**
   * A budget the organiser already has approved, or 0 when they have not said.
   *
   * It does NOT enter the pricing. Nothing downstream reads it except
   * `assessBudget`, which compares it against the finished quote and works out
   * what could be CHANGED to fit — scope to the budget, do not discount to it.
   * A budget that moved the rate would make the rate card decorative: the same
   * two days of work would cost whatever the organiser said they had, and the
   * organiser who volunteered a real number would be the one who paid most.
   */
  budget: number;
  /** Today, `YYYY-MM-DD`. Injected rather than read from the clock. */
  today: string;
  /** Free-text, carried through to the printed quote. */
  eventTitle?: string;
  organizationName?: string;
  contactName?: string;
  venue?: string;
}

export const DEFAULT_INPUT: Omit<QuotationInput, "today" | "startDate"> = {
  engagementType: "speaking",
  format: "full-day",
  sessions: 1,
  complexity: "tailored",
  facilitationScope: "organisation",
  preparation: "none",
  output: "none",
  audienceSize: 40,
  audienceProfile: "non-specialist",
  organizerType: "corporate",
  ticketed: false,
  participantFee: 0,
  expectedPaidAttendees: 0,
  region: "metro-manila",
  travelCovered: true,
  accommodationCovered: true,
  earlyStart: true,
  addOns: [],
  invoiceRequired: true,
  returningClient: false,
  budget: 0,
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

/**
 * One thing the organiser could change to bring the quote down, with what it
 * saves and what it costs them in scope.
 *
 * Every saving here is computed by RE-PRICING the engagement with that one
 * change made, not by estimating it. A lever whose stated saving does not
 * match what the form then produces is worse than no lever at all.
 */
export interface BudgetLever {
  id: string;
  /** The change, as an instruction the organiser could act on. */
  label: string;
  /** The date the `date` lever proposes, `YYYY-MM-DD`. Absent on every other. */
  startDate?: string;
  /** What they give up, or gain, by making it. Never a sales line. */
  detail: string;
  /** Pesos off the total. Always positive — levers that save nothing are dropped. */
  saving: number;
  /** What the total becomes with this one change and nothing else. */
  total: number;
}

export interface BudgetFit {
  /** What the organiser said they had. */
  budget: number;
  /** The quoted total it is being compared against. */
  total: number;
  /** True when the quote already fits. */
  withinBudget: boolean;
  /** Budget less total when it fits; total less budget when it does not. */
  difference: number;
  /** Changes that would bring the total down, dearest saving first. */
  levers: BudgetLever[];
  /**
   * The total with the combinable levers applied at once.
   *
   * Not "all of them": two levers in the same slot are alternatives, so the
   * floor takes the better one and `combined` names exactly which levers went
   * into it. The copy reads off that list rather than saying "all of these",
   * which would be untrue whenever an alternative was dropped.
   */
  floor: number;
  /** The lever ids the floor actually applied. */
  combined: string[];
  /** True when `floor` is at or under the budget. */
  reachable: boolean;
}

export interface Quotation {
  /** Deterministic reference derived from the inputs — no clock, no random. */
  reference: string;
  /** What kind of work this is. */
  engagementType: EngagementTypeId;
  engagementTypeLabel: string;
  /** The day rate this engagement's type and scope set. */
  dayRate: number;
  /** Desk days before and after the room. Facilitation only; zero otherwise. */
  deskDays: number;
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
  /** Participants the quote was built for. Named so the summary can say it. */
  audienceSize: number;
  /**
   * Total ÷ participants.
   *
   * The unit an organiser can actually defend internally. A day rate is the
   * most alarming way to state a fee — it invites "for ONE day?" — and it is
   * also the least useful, because nobody is buying a day. ₱127,700 for two
   * days reads as a lot; the same quote at ₱1,600 a head reads as less than
   * the ₱2,500–15,000 a day the same participant would cost at an open
   * programme. Both numbers are true and the second is the one that answers
   * the question the reader is actually asking.
   *
   * Meaningless for facilitation, where nobody is buying seats, so the
   * surfaces that show it check the engagement type first.
   */
  perParticipant: number;
  /** Projected gross gate, when the event is ticketed. */
  projectedGate: number;
  /** Fee as a share of the gate, 0 when the event is not ticketed. */
  gateShare: number;
  withholding: {
    applies: boolean;
    rate: number;
    amount: number;
    net: number;
    /** Whose rate was used — the individual's or the firm's. */
    basis: "individual" | "firm";
  };
  invoicing: {
    required: boolean;
    /** The issuing entity, or null when no formal invoice was asked for. */
    entity: string | null;
    vatRegistered: boolean;
    /** VAT added to the organiser's total. Zero while the firm is non-VAT. */
    vat: number;
    /** Percentage tax the firm bears on gross receipts. Never invoiced. */
    percentageTax: number;
  };
  dates: QuotationDateNote[];
  schedule: { id: ScheduleFactorId; label: string; factor: number; reason: string };
  validUntil: string;
  holdUntil: string;
  daysOfNotice: number;
  /** Things the organiser must decide or confirm, surfaced on the quote. */
  flags: string[];
  customQuoteRequired: boolean;
  /** How the total sits against a stated budget. Null when none was given. */
  budgetFit: BudgetFit | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Peso amounts are quoted to the nearest hundred — nobody invoices ₱47,382.14. */
function roundPeso(amount: number): number {
  return Math.round(amount / 100) * 100;
}

/**
 * Tax figures round to the nearest peso, not the nearest hundred.
 *
 * A fee is a negotiated round number; a tax is arithmetic the reader can check.
 * Rounding it to ₱100 made the quote contradict itself in a single sentence —
 * "withheld at 2% — ₱200 here" against a ₱8,000 fee, where 2% is ₱160. On a
 * page whose whole argument is that the numbers add up, that is the worst
 * possible place to be sloppy.
 */
function roundToPeso(amount: number): number {
  return Math.round(amount);
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
  // Every input that can move the total belongs in the seed. Omitting the
  // add-ons and the travel arrangements let two quotes ₱22,800 apart share a
  // reference — and the reference is the handle the organiser quotes back in
  // an email, and the one printed on the PDF.
  const seed = [
    input.startDate,
    input.engagementType,
    input.facilitationScope,
    input.preparation,
    input.output,
    input.format,
    input.sessions,
    input.complexity,
    input.organizerType,
    input.region,
    input.audienceSize,
    input.audienceProfile,
    input.ticketed ? "T" : "F",
    input.participantFee,
    input.expectedPaidAttendees,
    input.travelCovered ? "T" : "F",
    input.accommodationCovered ? "T" : "F",
    input.earlyStart ? "T" : "F",
    [...input.addOns].sort().join(","),
    input.invoiceRequired ? "INV" : "NOINV",
    input.returningClient ? "RETURNING" : "NEW",
    // The budget is deliberately absent: it moves nothing, so two quotes that
    // differ only in what the organiser said they could afford are the same
    // quote and should share a reference.
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

/**
 * Prices one engagement. Everything except the budget comparison, which needs
 * a priced quote to compare against and re-prices variants of this same
 * function — hence the split, which is what keeps that from recursing.
 */
function priceEngagement(raw: QuotationInput): Quotation {
  const format =
    ENGAGEMENT_FORMATS.find((f) => f.id === raw.format) ?? ENGAGEMENT_FORMATS[0];
  const engagementType = engagementTypeFor(raw.engagementType);
  const organizer = organizerTypeFor(raw.organizerType);
  const complexity = complexityTierFor(raw.complexity);
  const facilitationScope = facilitationScopeFor(raw.facilitationScope);

  // Where the day rate comes from depends on what the work IS. A talk is
  // priced by how much new ground the subject covers; facilitation cannot be,
  // because it is bespoke by definition and has no reusable material to be
  // further or nearer from.
  // The ladders are public-sector rates; the sector scales them into its own.
  // This is a rate, not a surcharge — see OrganizerType.rateMultiplier. It
  // replaced a 15% premium that could not reach the corporate market and
  // priced a two-day corporate workshop at roughly what one session costs.
  // Facilitation scales by its own multiplier: see sectorMultiplier.
  const baseDayRate =
    engagementType.id === "facilitation"
      ? facilitationScope.dayRate
      : engagementType.id === "team-building"
        ? TEAM_BUILDING_DAY_RATE
        : complexity.dayRate;
  const dayRate = deriveDayRate(baseDayRate, sectorMultiplier(organizer, engagementType.id));

  const isFacilitation = engagementType.id === "facilitation";
  const preparation = preparationOptionFor(raw.preparation);
  const output = outputOptionFor(raw.output);
  // Desk days only exist for facilitation. Speaking prep is already inside the
  // format's day-equivalent, and team building uses the survey/report add-ons.
  const preparationDays = isFacilitation ? preparation.days : 0;
  const outputDays = isFacilitation ? output.days : 0;
  // An online format overrides whatever region was picked: there is no travel
  // to a webinar, and leaving a stale region selected would bill hotel nights
  // for a video call.
  const region = format.remote ? regionFor("online") : regionFor(raw.region);

  const sessions = clampInt(raw.sessions, 1, 30);
  const audienceSize = clampInt(raw.audienceSize, 1, 100_000);
  const audience = audienceBandFor(audienceSize);
  const audienceProfile = audienceProfileFor(raw.audienceProfile);

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
    label: `${formatLabel(format, engagementType.id)}${sessions > 1 ? ` × ${sessions}` : ""}`,
    // Names the SECTOR that set the rate, not the subject tier. Both feed the
    // number, but only one of them is worth printing: the sector explains why
    // this reader's rate differs from someone else's, whereas classifying the
    // client's own subject reads as a verdict on it. The tier still reaches the
    // AI explanation via `topicTier`, where it has room to be explained.
    detail: `${dayEquivalents} engagement ${
      dayEquivalents === 1 ? "day" : "days"
    } at ₱${dayRate.toLocaleString("en-PH")}/day — the ${organizer.sectorLabel} rate for ${
      isFacilitation
        ? "this scope of planning"
        : engagementType.id === "team-building"
          ? "team building"
          : "this subject"
    }`,
    amount: baseFee,
  });

  // 1b. Desk days ---------------------------------------------------------
  // Placed with the base fee, before any multiplier, because they are part of
  // what is being bought rather than a premium on it. A planning engagement
  // whose interviews and written plan are invisible is one where half the work
  // is done for free.
  for (const stage of [
    { id: "preparation", stage: preparation, days: preparationDays, when: "before" },
    { id: "output", stage: output, days: outputDays, when: "after" },
  ]) {
    if (stage.days <= 0) continue;
    push({
      id: stage.id,
      kind: "base",
      label: stage.stage.label,
      detail: `${stage.days} ${stage.days === 1 ? "day" : "days"} of work ${
        stage.when === "before" ? "before" : "after"
      } the session, billed at ${DESK_DAY_FACTOR * 100}% of the ₱${dayRate.toLocaleString(
        "en-PH"
      )} day rate — ${stage.stage.detail.toLowerCase()}`,
      amount: dayRate * DESK_DAY_FACTOR * stage.days,
    });
  }

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
    // Skipped entirely for team building: the profiles describe how much
    // finance the room already knows, which changes how a session on cash flow
    // has to be built and changes nothing at all about facilitating a day of
    // activities. Charging for it there would be a factor with no work behind
    // it.
    ...(engagementType.id === "team-building"
      ? []
      : [
          {
            id: "audience-profile",
            label: audienceProfile.label,
            detail: audienceProfile.detail,
            factor: audienceProfile.factor,
          },
        ]),
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
      label:
        region.travelDays === 1
          ? "One travel day"
          : region.travelDays < 1
            ? "Part of a travel day"
            : `${region.travelDays} travel days`,
      detail: `Getting to ${region.label} and back from Baguio is time that cannot be sold to anyone else — billed at ${
        TRAVEL_DAY_FACTOR * 100
      }% of the ₱${dayRate.toLocaleString("en-PH")} day rate`,
      amount: dayRate * TRAVEL_DAY_FACTOR * region.travelDays,
    });
  }

  // 6. Concessions ---------------------------------------------------------
  // The returning-client discount goes first so the mission floor, which is
  // checked below, remains the last word on how low a quote can go.
  if (raw.returningClient) {
    push({
      id: "returning-client",
      kind: "discount",
      label: `Booked before (−${RETURNING_CLIENT_DISCOUNT * 100}%)`,
      detail:
        "We have worked together, so the discovery is already done — I know your sector and your constraints, and the preparation genuinely costs less this time",
      amount: -(running * RETURNING_CLIENT_DISCOUNT),
    });
  }

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

  // 6c. The floor under every concession -----------------------------------
  // Checked after all of them, because the mission floor is a day rate and
  // stops binding on short formats: mission and returning-client together took
  // a panel to ₱7,600 while the card promised no lower than ₱8,000.
  if (running < ABSOLUTE_MINIMUM_FEE) {
    push({
      id: "absolute-minimum",
      kind: "floor",
      label: "Minimum after concessions",
      detail: `Concessions stop here — no engagement is quoted below ₱${ABSOLUTE_MINIMUM_FEE.toLocaleString(
        "en-PH"
      )} however they combine`,
      amount: ABSOLUTE_MINIMUM_FEE - running,
    });
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
      detail: raw.travelCovered ? "" : "Estimate — billed at actual cost with receipts",
      amount: region.transport,
      billed: !raw.travelCovered,
    });
  }

  if (nights > 0) {
    reimbursables.push({
      id: "accommodation",
      label: `Accommodation, ${nights} ${nights === 1 ? "night" : "nights"}`,
      detail: raw.accommodationCovered
        ? `Budgeted at about ₱${region.nightly.toLocaleString("en-PH")} a night`
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
        ? `Budgeted at about ₱${region.perDiem.toLocaleString("en-PH")} a day`
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


  // Withholding is informational: it is the organiser's obligation, not a
  // deduction the quote applies. It is shown so nobody is surprised at payout.
  //
  // The rate follows WHO issues the invoice, not who is speaking. Billed
  // personally it is the individual professional rate; billed by the firm it is
  // the corporate one, which is materially lower and changes the net enough
  // that showing the wrong one would misstate the payout.
  const withholdingRate = raw.invoiceRequired ? EWT_RATE_FIRM : EWT_RATE;
  const withholdingAmount = organizer.withholds
    ? roundToPeso(professionalFee * withholdingRate)
    : 0;

  // Zero while the firm is below the VAT threshold. Left in the shape rather
  // than omitted so registering for VAT is a constant change, not a refactor.
  const vat = raw.invoiceRequired && INVOICING_ENTITY.vatRegistered
    ? roundToPeso(professionalFee * INVOICING_ENTITY.vatRate)
    : 0;

  // Declared after the tax block because VAT, when it applies, is part of what
  // the organiser pays.
  const total = professionalFee + reimbursablesBilled + vat;

  // Flags ------------------------------------------------------------------
  // Ordered by how much they change what the organiser has to DO. The first
  // two go to whether this can be bought at all on the route they are on,
  // which outranks anything about the number.
  const flags: string[] = [];

  // A public body reading a rate above the honorarium ceiling needs to know
  // before it reaches their procurement unit, not after. The concession is
  // applied to the comparison because a mission organiser is never actually
  // asked for the pre-concession rate.
  const payableDayRate = organizer.mission ? dayRate * (1 - MISSION_DISCOUNT) : dayRate;
  if (organizer.honorariumRules && payableDayRate > HONORARIUM_DAY_CEILING) {
    flags.push(
      `At ₱${Math.round(payableDayRate).toLocaleString(
        "en-PH"
      )} a day this sits above the roughly ₱${HONORARIUM_DAY_CEILING.toLocaleString(
        "en-PH"
      )} a resource person can be paid as an honorarium under DBM BC 2007-1. Work at this level is normally procured as a service or consultancy contract instead, which is a different route with different paperwork — worth raising with your procurement unit before this goes any further.`
    );
  }

  // Cooperatives span four orders of magnitude, and one rate cannot fit them
  // all. Said openly rather than left for the small co-op to discover.
  if (organizer.id === "cooperative") {
    flags.push(
      "The cooperative rate is pitched at a co-op with staff and an education and training fund it actually spends. If you are a large cooperative bank or a federation, the corporate rate is the honest one; if you are a small primary co-op, say so in the enquiry rather than walking away — the rate card has one cooperative rate and your situation may not be it."
    );
  }

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
      "Travel or accommodation is not being arranged by you, so it appears on the quote as a billed reimbursable at actual cost. Booking it directly is usually cheaper than reimbursing it, and it keeps the invoice simpler."
    );
  }
  if (daysOfNotice < 14 && daysOfNotice >= 0) {
    flags.push(
      `Only ${daysOfNotice} ${daysOfNotice === 1 ? "day" : "days"} of notice. Confirm the date is still open before you circulate this quote internally.`
    );
  }
  // Corporates, agencies and schools cannot release payment without one, so
  // discovering it after the engagement is a delayed payment, not a surprise.
  // Keyed on the institutional tiers rather than on `withholds`: mission
  // organisers withhold too, but a student org raising money by selling
  // snacks does not need a formal invoice and should not be nagged for one.
  if (!raw.invoiceRequired && !organizer.mission) {
    flags.push(
      `No formal invoice was requested. Organisations of this kind almost always need one before finance can release payment — say so on the form and it is issued by ${INVOICING_ENTITY.name}, at no change to the fee.`
    );
  }
  if (isFacilitation && outputDays === 0) {
    flags.push(
      "No written output was asked for, so the quote covers the room only. Groups that plan to write it up themselves very often do not — worth deciding now rather than after the session."
    );
  }
  if (isFacilitation && preparationDays === 0) {
    flags.push(
      "No preparation was asked for. A planning session with no groundwork spends its first half discovering what the disagreements are, which is the most expensive way to find out."
    );
  }
  if (sessions > 1) {
    flags.push(
      "Dates are assumed consecutive. If the sessions are spread across weeks, say so — it changes the travel line, not the fee."
    );
  }

  const daysCommitted = Number(
    (dayEquivalents + region.travelDays + preparationDays + outputDays).toFixed(3)
  );

  // Displayed amounts are the DIFFERENCE between consecutive rounded running
  // totals, not each raw amount rounded on its own.
  //
  // Rounding the two columns independently let them disagree: a quote whose
  // lines read +₱18,000, +₱1,400, +₱2,900, +₱9,000 summed to ₱31,300 while
  // stating a fee of ₱31,400, on screen and in the exported PDF. An organiser
  // checking the arithmetic finds the error before you do. Deriving one column
  // from the other makes the sum exact by construction.
  let previousTotal = 0;
  const reconciledLines = lines.map((line) => {
    const amount = line.runningTotal - previousTotal;
    previousTotal = line.runningTotal;
    return { ...line, amount };
  });

  return {
    reference: referenceFor(raw),
    engagementType: engagementType.id,
    engagementTypeLabel: engagementType.label,
    dayRate,
    deskDays: preparationDays + outputDays,
    topicTier: isFacilitation ? facilitationScope.label : complexity.label,
    dayEquivalents,
    daysCommitted,
    lines: reconciledLines,
    professionalFee,
    reimbursables,
    reimbursablesBilled,
    reimbursablesCovered,
    total,
    effectiveDayRate: daysCommitted > 0 ? roundPeso(professionalFee / daysCommitted) : 0,
    audienceSize,
    // To the peso, not the hundred: a ₱169 per-head figure rounded to ₱200 is
    // a fifth out, on the one number a reader is most likely to multiply back
    // up and check.
    perParticipant: audienceSize > 0 ? roundToPeso(total / audienceSize) : 0,
    projectedGate: roundPeso(projectedGate),
    gateShare: projectedGate > 0 ? (professionalFee / projectedGate) * 100 : 0,
    withholding: {
      applies: organizer.withholds,
      rate: withholdingRate,
      amount: withholdingAmount,
      net: professionalFee - withholdingAmount,
      basis: raw.invoiceRequired ? "firm" : "individual",
    },
    invoicing: {
      required: raw.invoiceRequired,
      entity: raw.invoiceRequired ? INVOICING_ENTITY.name : null,
      vatRegistered: INVOICING_ENTITY.vatRegistered,
      vat,
      percentageTax:
        raw.invoiceRequired && !INVOICING_ENTITY.vatRegistered
          ? roundToPeso(professionalFee * PERCENTAGE_TAX_RATE)
          : 0,
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
    // Filled in by buildQuotation, which needs this finished quote first.
    budgetFit: null,
  };
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

/**
 * The earliest start date on or after `from` whose whole run falls on plain
 * weekdays. Null when no such run exists inside the search window — which is
 * the honest answer for a five-day programme, since every five consecutive
 * days include a weekend.
 */
function plainWeekdayStart(from: string, sessions: number): string | null {
  for (let offset = 0; offset < 30; offset++) {
    const candidate = addDays(from, offset);
    const dates = engagementDates(candidate, sessions);
    if (dates.every((d) => !isWeekend(d) && !holidayFor(d))) return candidate;
  }
  return null;
}

/**
 * A change the organiser could make, and the slot it occupies.
 *
 * Two levers in the same slot are alternatives, not additions — "half a day
 * instead of a full one" and "deliver it online" both rewrite the format, so
 * the combined floor may only count the better of them. Without slots the
 * floor would claim a saving the form could never actually produce.
 */
interface LeverSpec {
  id: string;
  slot: string;
  label: string;
  detail: string;
  change: Partial<QuotationInput>;
}

/**
 * Compares a finished quote against a budget the organiser already has, and
 * works out what could be CHANGED to fit inside it.
 *
 * The principle, and the reason this is not a discount calculator: scope to
 * the budget, do not discount to it. A fee that bends to whatever number the
 * organiser names teaches every future organiser to name a lower one, and it
 * quietly makes the rate card fiction. What genuinely can move is how much
 * work is being bought — a day instead of two, online instead of in the room,
 * the write-up done in-house — and each of those is a real decision with a
 * real consequence, which is what this shows them.
 *
 * Every saving is produced by re-pricing the engagement with that one change
 * made, so the figure beside a lever is exactly what the form will show if
 * they pull it.
 */
function assessBudget(raw: QuotationInput, quote: Quotation): BudgetFit | null {
  const budget = clampAmount(raw.budget, 0, 1_000_000_000);
  if (budget <= 0) return null;

  const total = quote.total;
  if (total <= budget) {
    return {
      budget,
      total,
      withinBudget: true,
      difference: budget - total,
      levers: [],
      floor: total,
      combined: [],
      reachable: true,
    };
  }

  const engagementType = engagementTypeFor(raw.engagementType);
  const currentFormat =
    ENGAGEMENT_FORMATS.find((f) => f.id === raw.format) ?? ENGAGEMENT_FORMATS[0];
  const offered = ENGAGEMENT_FORMATS.filter((f) => f.types.includes(engagementType.id));
  const remoteFormat = offered.find((f) => f.remote);
  const shorterFormat = offered
    .filter((f) => !f.remote && f.dayEquivalent < currentFormat.dayEquivalent)
    .sort((a, b) => b.dayEquivalent - a.dayEquivalent)[0];
  const isFacilitation = engagementType.id === "facilitation";
  const selectedAddOns = ADD_ONS.filter((a) => raw.addOns.includes(a.id));

  const noticeFloor =
    daysBetween(raw.today, raw.startDate) >= 30 ? raw.startDate : addDays(raw.today, 30);
  const betterDate = plainWeekdayStart(noticeFloor, raw.sessions);

  const specs: LeverSpec[] = [];

  if (!raw.travelCovered || !raw.accommodationCovered) {
    specs.push({
      id: "logistics",
      slot: "logistics",
      label: "Book the travel and accommodation yourselves",
      detail:
        "Booking directly almost always costs less than reimbursing at actual cost, and it takes the logistics off the invoice entirely.",
      change: { travelCovered: true, accommodationCovered: true },
    });
  }

  if (selectedAddOns.length > 0) {
    specs.push({
      id: "add-ons",
      slot: "add-ons",
      label:
        selectedAddOns.length === 1
          ? `Leave out the ${selectedAddOns[0].label.toLowerCase()}`
          : "Leave out the extras",
      detail:
        selectedAddOns.length === 1
          ? "It can be added later without re-quoting the session itself."
          : `${selectedAddOns
              .map((a) => a.label.toLowerCase())
              .join(", ")} — any of them can be added later without re-quoting the session itself.`,
      change: { addOns: [] },
    });
  }

  if (raw.sessions > 1) {
    specs.push({
      id: "sessions",
      slot: "sessions",
      label: `Run it over ${raw.sessions - 1} ${raw.sessions - 1 === 1 ? "day" : "days"} instead of ${raw.sessions}`,
      detail:
        "A day less in the room covers less ground rather than the same ground faster, so it is worth deciding in advance what has to survive the cut.",
      change: { sessions: raw.sessions - 1 },
    });
  }

  if (shorterFormat) {
    specs.push({
      id: "shorter-format",
      slot: "format",
      label: `Make it a ${formatLabel(shorterFormat, engagementType.id).toLowerCase()}`,
      detail: `${shorterFormat.detail}. Best where the group needs the essentials rather than the practice.`,
      change: { format: shorterFormat.id },
    });
  }

  if (remoteFormat && !currentFormat.remote) {
    specs.push({
      id: "online",
      slot: "format",
      label: "Deliver it online",
      detail:
        "No travel time and no logistics at all. It suits a briefing or a working session better than a hands-on workshop.",
      change: { format: remoteFormat.id },
    });
  }

  if (isFacilitation && raw.preparation !== "none") {
    specs.push({
      id: "preparation",
      slot: "preparation",
      label: "Skip the groundwork beforehand",
      detail:
        "The cheapest line to cut and the one most often regretted: without it the session spends its first part finding out where the disagreements are.",
      change: { preparation: "none" },
    });
  }

  if (isFacilitation && raw.output !== "none") {
    specs.push({
      id: "output",
      slot: "output",
      label: "Write the plan up yourselves",
      detail:
        "You leave with everything produced in the room. Worth being honest about who will actually do the writing, and by when.",
      change: { output: "none" },
    });
  }

  if (betterDate && betterDate !== raw.startDate) {
    specs.push({
      id: "date",
      slot: "date",
      // Written the way every other date on the quote is written. A raw
      // `2026-04-20` in the middle of a sentence reads as a system value
      // rather than a suggestion someone could act on.
      label: `Move it to ${formatEngagementDate(betterDate, { weekday: true })}`,
      detail:
        "Weekdays carry no schedule premium, and 30 days' notice carries no rush premium. Moving the date is usually the only lever here that costs you nothing at all.",
      change: { startDate: betterDate },
    });
  }

  const levers: Array<BudgetLever & { slot: string; change: Partial<QuotationInput> }> = [];
  for (const spec of specs) {
    const variant = priceEngagement({ ...raw, ...spec.change });
    const saving = total - variant.total;
    if (saving <= 0) continue;
    levers.push({
      id: spec.id,
      slot: spec.slot,
      label: spec.label,
      detail: spec.detail,
      startDate: spec.change.startDate,
      saving,
      total: variant.total,
      change: spec.change,
    });
  }

  levers.sort((a, b) => b.saving - a.saving);

  // The floor takes the best lever from each slot — combining two that rewrite
  // the same field would state a saving the form cannot reproduce. It is then
  // priced as one variant rather than summed, because the levers interact:
  // dropping a day also drops a hotel night.
  const claimed = new Set<string>();
  const combinedIds: string[] = [];
  let combined: Partial<QuotationInput> = {};
  for (const lever of levers) {
    if (claimed.has(lever.slot)) continue;
    claimed.add(lever.slot);
    combinedIds.push(lever.id);
    combined = { ...combined, ...lever.change };
  }
  const floor = combinedIds.length > 0 ? priceEngagement({ ...raw, ...combined }).total : total;

  return {
    budget,
    total,
    withinBudget: false,
    difference: total - budget,
    levers: levers.map(({ id, label, detail, startDate, saving, total: leverTotal }) => ({
      id,
      label,
      detail,
      startDate,
      saving,
      total: leverTotal,
    })),
    floor,
    combined: combinedIds,
    reachable: floor <= budget,
  };
}

/**
 * Prices an engagement and, when the organiser named a budget, works out how
 * the total sits against it.
 */
export function buildQuotation(raw: QuotationInput): Quotation {
  const quote = priceEngagement(raw);
  return { ...quote, budgetFit: assessBudget(raw, quote) };
}

/** Every add-on id, for validating client input. */
export const ADD_ON_IDS: AddOnId[] = ADD_ONS.map((a) => a.id);

/** Named export used by the audience-band copy in the form. */
export { AUDIENCE_BANDS, addOnFor };

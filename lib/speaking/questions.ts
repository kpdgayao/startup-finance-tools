/**
 * The "why we ask" layer.
 *
 * Every question on the intake form carries two pieces of copy: why the
 * question is being asked at all, and what answering it does to the number.
 * They live here rather than inline in the form because they ARE the product —
 * an organiser who can see why a Saturday costs more than a Tuesday negotiates
 * about the work instead of about the total.
 *
 * Rules for writing these:
 * - `why` explains the constraint on the speaker's side. Never "so we can
 *   charge you more".
 * - `impact` states the actual arithmetic, with the real figure from the rate
 *   card interpolated rather than typed, so copy cannot drift from the engine.
 * - Neither field asserts credentials or names the speaker. The quote is
 *   signed; the questions are not.
 */

import {
  DAY_RATE_MAX,
  DAY_RATE_MIN,
  MINIMUM_ENGAGEMENT_FEE,
  MISSION_DISCOUNT,
  MISSION_FLOOR_DAY_RATE,
  REVENUE_SHARE_FLOOR,
  SCHEDULE_FACTORS,
  TRAVEL_DAY_FACTOR,
  LEAD_TIME_BANDS,
  AUDIENCE_BANDS,
} from "./rate-card";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
const pct = (factor: number) => `${Math.round((factor - 1) * 100)}%`;

export interface RateQuestion {
  id: string;
  label: string;
  /** One line under the label. */
  hint: string;
  why: string;
  impact: string;
}

export const QUESTIONS = {
  format: {
    id: "format",
    label: "What kind of session is it?",
    hint: "A keynote and a full-day workshop are different pieces of work.",
    why: "Format decides the preparation, not just the hours on stage. A 90-minute keynote still costs the better part of a working day once the deck, the rehearsal and the travel window are counted — which is why the shortest format is priced at half a day rather than at an hourly rate.",
    impact: `Sets the base fee as a share of your topic's day rate (${peso(
      DAY_RATE_MIN
    )}–${peso(
      DAY_RATE_MAX
    )}) — from 0.4 of a day for a panel to a full day for a workshop. Nothing is quoted below ${peso(
      MINIMUM_ENGAGEMENT_FEE
    )}.`,
  },
  sessions: {
    id: "sessions",
    label: "How many days or sessions?",
    hint: "Assumed consecutive. Tell us if they are spread out.",
    why: "Multi-day programmes are the ones most often underpriced. A two-day workshop is two days of delivery plus two days of preparation, and it blocks a full working week once travel is included.",
    impact: `Multiplies the base fee directly. Two full days on a core topic is ${peso(
      DAY_RATE_MIN * 2
    )} before any other factor; on a research-heavy one, ${peso(DAY_RATE_MAX * 2)}.`,
  },
  complexity: {
    id: "complexity",
    label: "How far is this topic from the core catalogue?",
    hint: "This sets the day rate — it is the single biggest lever on the price.",
    why: "The rate is set by the topic, not by the room. Basic accounting, bookkeeping and cash flow are ground already covered many times over, so the day is mostly delivery and the rate reflects that. A topic sitting outside it — AI applied to accounting, a standard that has just changed — costs days of reading and testing before a single slide exists. That research never appears on the programme, but it is the part that decides what the day costs.",
    impact: `Sets the day rate directly: ${peso(
      DAY_RATE_MIN
    )} for a core catalogue topic, rising to ${peso(
      DAY_RATE_MAX
    )} for one needing substantial research beyond it.`,
  },
  audienceSize: {
    id: "audienceSize",
    label: "How many participants do you expect?",
    hint: "Your best estimate of people in the room.",
    why: "Room size changes the work, not just the audience. Past roughly 30 people, exercises need extra facilitation, materials multiply, and any assessment or feedback promised to the organiser becomes a real piece of after-hours work.",
    impact: `No change up to ${AUDIENCE_BANDS[0].max} participants, rising to +${pct(
      AUDIENCE_BANDS[AUDIENCE_BANDS.length - 1].factor
    )} for a hall of over ${AUDIENCE_BANDS[AUDIENCE_BANDS.length - 2].max}.`,
  },
  organizerType: {
    id: "organizerType",
    label: "Who is organising the event?",
    hint: "This decides which rate applies to you.",
    why: "A corporate training budget, a government line item and a student organisation raising money by selling snacks are not the same buyer, and pretending otherwise means either overcharging schools or underwriting companies. Stating the tier keeps the concession visible instead of hidden in a haggle.",
    impact: `Companies pay a premium; agencies and private schools pay the standard rate. Public schools, student organisations and NGOs get −${
      MISSION_DISCOUNT * 100
    }%, floored at ${peso(MISSION_FLOOR_DAY_RATE)} per day.`,
  },
  ticketed: {
    id: "ticketed",
    label: "Do participants pay to attend?",
    hint: "Registration fee, ticket price, or a per-seat charge to their employer.",
    why: "If seats are being sold on the strength of the programme, the programme is part of the product. This is the question that catches the case an organiser grosses several hundred thousand pesos at the door and offers the speaker a five-figure honorarium out of it.",
    impact: `When the event is ticketed, the fee is floored at ${
      REVENUE_SHARE_FLOOR * 100
    }% of projected gross ticket revenue. It can raise the quote; it never lowers it.`,
  },
  participantFee: {
    id: "participantFee",
    label: "Ticket price per participant",
    hint: "What one seat costs.",
    why: "Ticket price times expected paid seats is the projected gate. It is the only figure that shows whether the fee being discussed is a fair share of what the event earns.",
    impact: `Feeds the ${REVENUE_SHARE_FLOOR * 100}% revenue-share floor.`,
  },
  expectedPaidAttendees: {
    id: "expectedPaidAttendees",
    label: "Expected paid seats",
    hint: "Leave at zero to use the participant count above.",
    why: "Paid seats are usually fewer than people in the room — sponsors, staff, scholars and speakers rarely pay. The floor is calculated on the seats that actually generate revenue.",
    impact: `Multiplied by the ticket price to set the projected gate.`,
  },
  startDate: {
    id: "startDate",
    label: "First day of the engagement",
    hint: "Checked against the calendar before you send this.",
    why: "The date does two jobs: it says whether the day is free at all, and it says how much notice the request gives. Both are answered before you invest any more time in the enquiry.",
    impact: `Weekends add ${pct(SCHEDULE_FACTORS.weekend.factor)}, Philippine holidays ${pct(
      SCHEDULE_FACTORS.holiday.factor
    )}. Under 30 days' notice adds ${pct(
      LEAD_TIME_BANDS[1].factor
    )}, rising to ${pct(LEAD_TIME_BANDS[LEAD_TIME_BANDS.length - 1].factor)} inside a week.`,
  },
  region: {
    id: "region",
    label: "Where is it being held?",
    hint: "Travel is measured from Baguio City.",
    why: "Everything is quoted from a Baguio base. Metro Manila is five to seven hours each way; anything past Luzon is a flight and an overnight before the engagement. Those hours are working hours that cannot be sold to anyone else.",
    impact: `Adds ${
      TRAVEL_DAY_FACTOR * 100
    }% of the day rate per travel day, and sets the transport, accommodation and per-diem estimates below.`,
  },
  earlyStart: {
    id: "earlyStart",
    label: "Does the session start before 10am?",
    hint: "Registration time, not the programme's stated start.",
    why: "An early start makes same-day travel impossible from Baguio, which turns a day trip into an overnight. It is the difference between one hotel night and none — worth asking rather than discovering the week before.",
    impact: "Adds one accommodation night to the logistics estimate.",
  },
  travelCovered: {
    id: "travelCovered",
    label: "Will you arrange and pay for transport?",
    hint: "Booked by you directly, not reimbursed afterwards.",
    why: "Organisers almost always get better rates than a reimbursement claim does, and booking it directly means nobody carries the cost for 30 days waiting on a liquidation. If you cannot, it becomes a billed line rather than an invisible one.",
    impact: "Covered: shown at zero, with the estimate visible so you can budget it. Not covered: added to the invoice as a reimbursable at actual cost.",
  },
  accommodationCovered: {
    id: "accommodationCovered",
    label: "Will you arrange and pay for accommodation?",
    hint: "Only asked when the engagement needs an overnight.",
    why: "Same reasoning as transport, and it is usually the larger of the two. An organiser with a hotel partner pays a fraction of the walk-in rate.",
    impact: "Covered: shown at zero. Not covered: added as a reimbursable at the nightly estimate.",
  },
  addOns: {
    id: "addOns",
    label: "Anything beyond the session itself?",
    hint: "Optional. Each one is priced separately.",
    why: "Recording rights, workbooks, assessments and follow-up clinics are the items most often assumed to be free and then requested on the day. Pricing them up front means they can be agreed to or dropped, rather than absorbed.",
    impact: "Percentage add-ons apply to the professional fee; the rest are flat amounts.",
  },
} as const satisfies Record<string, RateQuestion>;

export type QuestionId = keyof typeof QUESTIONS;

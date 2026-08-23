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
 * - `why` explains the constraint on my side. Never "so I can charge you
 *   more".
 * - `impact` states the actual arithmetic, with the real figure from the rate
 *   card interpolated rather than typed, so copy cannot drift from the engine.
 * - Neither field asserts credentials or names the speaker. The quote is
 *   signed; the questions are not.
 */

import {
  DAY_RATE_MAX,
  DESK_DAY_FACTOR,
  TOP_SECTOR_MULTIPLIER,
  deriveDayRate,
  FACILITATION_SCOPES,
  EWT_RATE,
  EWT_RATE_FIRM,
  INVOICING_ENTITY,
  RETURNING_CLIENT_DISCOUNT,
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
  engagementType: {
    id: "engagementType",
    label: "What kind of engagement is it?",
    hint: "This decides the rest of the form, and where the day rate comes from.",
    why: "A talk and a planning session are not variations on one service. I prepare a talk once and deliver it; a facilitated session I design for one specific room, and the day in that room is often half the work — the interviews before it and the plan I write afterwards are the rest. Pricing them the same way would mean one of them is wrong.",
    impact: `Talks and workshops are priced by how much new ground the subject covers, from ${peso(
      DAY_RATE_MIN
    )} a day for public-sector work up to ${peso(
      deriveDayRate(DAY_RATE_MAX, TOP_SECTOR_MULTIPLIER)
    )} for a company. Facilitation starts higher and adds its own lines for preparation and written output.`,
  },
  facilitationScope: {
    id: "facilitationScope",
    label: "Whose plan is being made?",
    hint: "How many sets of interests have to agree by the end of the day.",
    why: "What makes a planning room hard for me to run is not the subject, it is the number of principals in it. One department with a clear remit reaches a decision on its own; a cooperative with several member groups, or a board with competing interests, has to be brought to one. That is the work you are buying, not my slides.",
    impact: `From ${peso(
      FACILITATION_SCOPES[0].dayRate
    )} a day for a single team at public-sector rates, up to ${peso(
      deriveDayRate(
        FACILITATION_SCOPES[FACILITATION_SCOPES.length - 1].dayRate,
        TOP_SECTOR_MULTIPLIER
      )
    )} for a corporate board. Your sector sets which end applies.`,
  },
  preparation: {
    id: "preparation",
    label: "How much groundwork before the session?",
    hint: "Reading, and conversations with your people.",
    why: "A planning session with no groundwork spends its first half discovering what the disagreements are, and that is the most expensive way to find out, because everyone in the room finds out at the same time. If I talk to a few people first, we open on the real questions instead of arriving at them by lunch.",
    impact: `Charged as days of work at ${
      DESK_DAY_FACTOR * 100
    }% of the day rate — nothing if you skip it, up to two days for a full round of interviews and document review.`,
  },
  output: {
    id: "output",
    label: "What should exist afterwards?",
    hint: "Beyond the flipcharts and photographs.",
    why: "Writing a plan up properly takes me days, and it is the piece of work most often absorbed for free: the room agrees, everyone leaves, and somebody is expected to produce the document. Groups who mean to write it up themselves very often do not, and the session quietly stops mattering about a month later.",
    impact: `Charged as days of work at ${
      DESK_DAY_FACTOR * 100
    }% of the day rate — nothing if you write it up yourselves, half a day for a summary, two days for the plan itself.`,
  },
  format: {
    id: "format",
    label: "What kind of session is it?",
    hint: "A keynote and a full-day workshop are different pieces of work.",
    why: "The hours on stage are the smaller half. A 90-minute keynote still costs me most of a working day once the deck, the rehearsal and the travel window are in — which is why I price the shortest formats at half a day rather than by the hour.",
    impact: `Sets the base fee as a share of your day rate — from 0.4 of a day for a panel to a full day for a workshop. That rate runs ${peso(
      DAY_RATE_MIN
    )} to ${peso(
      deriveDayRate(DAY_RATE_MAX, TOP_SECTOR_MULTIPLIER)
    )} depending on the subject and your sector. Nothing is quoted below ${peso(
      MINIMUM_ENGAGEMENT_FEE
    )}.`,
  },
  sessions: {
    id: "sessions",
    label: "How many days or sessions?",
    hint: "I will assume they are consecutive — tell me if they are spread out.",
    why: "Multi-day programmes are the ones I see underpriced most often. Two days of workshop is two days of delivery plus the preparation behind them, and with travel it takes most of my week.",
    impact: `Multiplies the base fee directly. Two full days on a settled subject is ${peso(
      DAY_RATE_MIN * 2
    )} at public-sector rates and ${peso(
      deriveDayRate(DAY_RATE_MIN, TOP_SECTOR_MULTIPLIER) * 2
    )} for a company, before any other factor.`,
  },
  complexity: {
    id: "complexity",
    label: "How much new ground does the subject cover?",
    hint: "This sets the day rate — it is the single biggest lever on the price.",
    why: "I adapt every session to the room — the examples, the figures and the exercises are built around your people whatever the subject. What changes my rate is how much of the SUBJECT is new ground. Bookkeeping and cash flow are settled; I have taught them many times and the work is in fitting them to you. Something outside that, like AI applied to accounting, costs me days of reading before I can write a single slide.",
    impact: `Sets the day rate, together with your sector: ${peso(
      DAY_RATE_MIN
    )} a day for a settled subject at public-sector rates, up to ${peso(
      deriveDayRate(DAY_RATE_MAX, TOP_SECTOR_MULTIPLIER)
    )} for research-heavy work quoted to a company.`,
  },
  audienceSize: {
    id: "audienceSize",
    label: "How many participants do you expect?",
    hint: "Your best estimate of people in the room.",
    why: "Room size changes the work, not just the audience. Past about 30 people the exercises need more hands, the materials multiply, and anything I have promised to mark or write up afterwards becomes a real evening's work.",
    impact: `No change up to ${AUDIENCE_BANDS[0].max} participants, rising to +${pct(
      AUDIENCE_BANDS[AUDIENCE_BANDS.length - 1].factor
    )} for a hall of over ${AUDIENCE_BANDS[AUDIENCE_BANDS.length - 2].max}.`,
  },
  audienceProfile: {
    id: "audienceProfile",
    label: "Who will be in the room?",
    hint: "Their background, not their number — that is the question above.",
    why: "This is the question I most want answered, price aside. Teaching cash flow to the people who prepare the statements is a different job from teaching the people who only ever read them — one has to survive real scrutiny, the other needs translation and good analogies, and a room with both in it I have to pitch twice. Getting it wrong is the commonest way a well-priced session still disappoints everyone.",
    impact:
      "No change for students, or for staff and managers without a finance background. +10% for a room of practitioners or a mixed one, +15% for owners, executives and board members, where the material is distilled and usually briefed with the sponsor beforehand.",
  },
  organizerType: {
    id: "organizerType",
    label: "Who is organising the event?",
    hint: "This decides which rate applies — the largest single factor after the subject.",
    why: "This sets the rate, and it is the honest reason my quotes differ. A government agency cannot pay more than its own rules allow — the circular caps a resource person at about \u20b121,000 a day whatever I ask — so that is what public work pays. A corporate training budget is a different market entirely, and pricing both the same would mean either overcharging schools or underwriting companies out of my own time. Saying which you are gets you your sector's rate rather than an average of everyone's.",
    impact: `Sets which day rate applies. Government and public-sector work is quoted at the ladder above; private schools, associations and companies each have their own rate, shown the moment you choose. Public schools, student organisations and NGOs get a further −${
      MISSION_DISCOUNT * 100
    }%, floored at ${peso(MISSION_FLOOR_DAY_RATE)} per day.`,
  },
  ticketed: {
    id: "ticketed",
    label: "Do participants pay to attend?",
    hint: "Registration fee, ticket price, or a per-seat charge to their employer.",
    why: "If you are selling seats on the strength of the programme, the programme is part of the product. This is the question that catches the case where an event takes several hundred thousand pesos at the door and offers the speaker a five-figure honorarium out of it — and I would rather raise it now than resent it later.",
    impact: `When the event is ticketed, the fee is floored at ${
      REVENUE_SHARE_FLOOR * 100
    }% of projected gross ticket revenue. It can raise the quote; it never lowers it.`,
  },
  participantFee: {
    id: "participantFee",
    label: "Ticket price per participant",
    hint: "What one seat costs.",
    why: "Ticket price times expected paid seats is your projected gate. It is the only figure that shows whether the fee we are discussing is a fair share of what the event earns.",
    impact: `Feeds the ${REVENUE_SHARE_FLOOR * 100}% revenue-share floor.`,
  },
  expectedPaidAttendees: {
    id: "expectedPaidAttendees",
    label: "Expected paid seats",
    hint: "Leave at zero to use the participant count above.",
    why: "Paid seats are usually fewer than people in the room — sponsors, staff, scholars and speakers rarely pay. I calculate the floor on the seats that actually bring money in.",
    impact: `Multiplied by the ticket price to set the projected gate.`,
  },
  startDate: {
    id: "startDate",
    label: "First day of the engagement",
    hint: "I will check this against my calendar in a moment.",
    why: "The date does two jobs: it tells me whether I am free at all, and it tells us both how much notice this gives me. Better answered before either of us spends more time on the enquiry.",
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
    why: "I am based in Baguio. Metro Manila is five to seven hours each way; anything past Luzon means a flight and a night before. Those are working hours I cannot sell to anyone else, which is the only reason travel appears on a quote at all.",
    impact: `Adds ${
      TRAVEL_DAY_FACTOR * 100
    }% of the day rate per travel day, and sets the transport, accommodation and per-diem estimates below.`,
  },
  earlyStart: {
    id: "earlyStart",
    label: "Does the session start before 10am?",
    hint: "Registration time, not the programme's stated start.",
    why: "An early start makes same-day travel from Baguio impossible, which turns a day trip into an overnight. It is one hotel night either way — better settled now than the week before.",
    impact: "Adds one accommodation night to the logistics estimate.",
  },
  travelCovered: {
    id: "travelCovered",
    label: "Will you arrange and pay for transport?",
    hint: "Booked by you directly, not reimbursed afterwards.",
    why: "You will almost certainly get a better rate than a reimbursement claim will, and booking it yourself means neither of us carries the cost for a month waiting on a liquidation. If that is awkward, it simply becomes a visible line instead of an invisible one.",
    impact: "Covered: shown at zero, with the estimate visible so you can budget it. Not covered: added to the invoice as a reimbursable at actual cost.",
  },
  accommodationCovered: {
    id: "accommodationCovered",
    label: "Will you arrange and pay for accommodation?",
    hint: "Only asked when the engagement needs an overnight.",
    why: "Same as transport, and usually the bigger number. If you already have a hotel you use, you will pay a fraction of what I would walking in.",
    impact: "Covered: shown at zero. Not covered: added as a reimbursable at the nightly estimate.",
  },
  returningClient: {
    id: "returningClient",
    label: "Have we worked together before?",
    hint: "A previous session, a consulting engagement, or a talk at your event.",
    why: "Partly so I can say hello properly rather than treat you like a stranger, and partly because it changes the price. If we have worked together, the discovery is already done — I know your sector, your constraints, and what landed last time — so the preparation genuinely costs me less and the quote should say so.",
    impact: `A ${
      RETURNING_CLIENT_DISCOUNT * 100
    }% reduction on the professional fee. Small on purpose: a large returning-client discount would only mean the first quote was padded.`,
  },
  invoiceRequired: {
    id: "invoiceRequired",
    label: "Do you need a formal invoice?",
    hint: "Most companies, agencies and schools do, to release payment.",
    why: "Your finance department cannot release funds against an email. Asking now means the paperwork is ready when the engagement is, instead of my fee sitting unpaid for a month afterwards. It also decides who bills you, which changes the tax you withhold — not what you pay.",
    impact: `No change to the fee. An invoice is issued by ${
      INVOICING_ENTITY.name
    }, and withholding follows the firm's rate of ${
      EWT_RATE_FIRM * 100
    }% instead of the ${EWT_RATE * 100}% that applies to an individual professional.`,
  },
  addOns: {
    id: "addOns",
    label: "Anything beyond the session itself?",
    hint: "Optional. Each one is priced separately.",
    why: "These are the things most often assumed to be included and then asked for on the day. I would rather price them now so you can take them or leave them, than have them quietly absorbed.",
    impact: "Percentage add-ons apply to the professional fee; the rest are flat amounts.",
  },
} as const satisfies Record<string, RateQuestion>;

export type QuestionId = keyof typeof QUESTIONS;

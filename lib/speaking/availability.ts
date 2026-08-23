/**
 * Date reasoning for the speaker quotation tool: what a requested date IS
 * (weekend, holiday, how much notice it gives) and whether it is already
 * spoken for.
 *
 * Everything here works on plain `YYYY-MM-DD` strings in Philippine local
 * time. Do NOT reach for `new Date("2026-08-23")` and read `getDay()` off it —
 * that parses as UTC midnight and returns the previous day for any server west
 * of the line, which silently mislabels Saturday engagements as weekdays and
 * undercharges them. `parseISODate` below builds a local-noon Date instead,
 * which is stable under every timezone the app might be deployed in.
 */

import { LEAD_TIME_BANDS, leadTimeBandFor, type LeadTimeBand } from "./rate-card";

export type DateStatus = "available" | "tentative" | "booked" | "past";

export interface DayAssessment {
  date: string; // YYYY-MM-DD
  weekday: string; // "Saturday"
  isWeekend: boolean;
  holiday?: string; // holiday name when the date is one
  status: DateStatus;
  /** Why the status is what it is, in one line, safe to show an organiser. */
  note: string;
}

export interface AvailabilityReport {
  dates: DayAssessment[];
  daysOfNotice: number;
  leadTime: LeadTimeBand;
  /** Where the booked/tentative marks came from. */
  source: "calendar" | "manual";
  /** True when the calendar could not be reached and only the manual list ran. */
  degraded: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse `YYYY-MM-DD` to a Date at LOCAL noon. Noon, not midnight: it leaves
 * 12 hours of slack on either side, so no DST transition can roll the date
 * over into its neighbour.
 */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = parseISODate(value);
  return Number.isFinite(parsed.getTime()) && toISODate(parsed) === value;
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Whole days between two dates, ignoring the time of day. */
export function daysBetween(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO).getTime();
  const to = parseISODate(toISO).getTime();
  return Math.round((to - from) / 86_400_000);
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function weekdayName(iso: string): string {
  return WEEKDAY_NAMES[parseISODate(iso).getDay()];
}

/**
 * A date as a person reads it: "7 October 2026", or with the weekday when the
 * day of the week matters to the reader.
 *
 * Hand-rolled rather than `Intl.DateTimeFormat` on purpose. This page is
 * statically prerendered and then hydrated, and Intl output can differ between
 * the build machine's ICU data and the visitor's browser — a mismatch React
 * reports as a hydration error on what is only a date label.
 */
export function formatEngagementDate(iso: string, options?: { weekday?: boolean }): string {
  if (!isValidISODate(iso)) return iso;
  const date = parseISODate(iso);
  const body = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  return options?.weekday ? `${WEEKDAY_NAMES[date.getDay()]}, ${body}` : body;
}

export function isWeekend(iso: string): boolean {
  const day = parseISODate(iso).getDay();
  return day === 0 || day === 6;
}

/**
 * Philippine regular and special non-working holidays.
 *
 * ADVISORY, NOT AUTHORITATIVE. The list is fixed from the annual Presidential
 * proclamation for each year and does not include the two movable Islamic
 * holidays (Eid'l Fitr and Eid'l Adha), which are proclaimed only weeks ahead
 * on the sighting of the moon. A date not listed here is treated as an
 * ordinary day; the quote says as much rather than pretending certainty.
 *
 * Extend this map each time a new proclamation lands — an expired map silently
 * stops applying the holiday premium rather than failing loudly.
 */
export const PH_HOLIDAYS: Record<string, string> = {
  // 2026 — Proclamation-based; Easter fell on 5 April 2026.
  "2026-01-01": "New Year's Day",
  "2026-02-17": "Chinese New Year",
  "2026-04-02": "Maundy Thursday",
  "2026-04-03": "Good Friday",
  "2026-04-04": "Black Saturday",
  "2026-04-09": "Araw ng Kagitingan",
  "2026-05-01": "Labor Day",
  "2026-06-12": "Independence Day",
  "2026-08-21": "Ninoy Aquino Day",
  "2026-08-31": "National Heroes Day",
  "2026-11-01": "All Saints' Day",
  "2026-11-02": "All Souls' Day",
  "2026-11-30": "Bonifacio Day",
  "2026-12-08": "Feast of the Immaculate Conception",
  "2026-12-24": "Christmas Eve",
  "2026-12-25": "Christmas Day",
  "2026-12-30": "Rizal Day",
  "2026-12-31": "Last Day of the Year",
  // 2027 — Easter falls on 28 March 2027.
  "2027-01-01": "New Year's Day",
  "2027-02-06": "Chinese New Year",
  "2027-03-25": "Maundy Thursday",
  "2027-03-26": "Good Friday",
  "2027-03-27": "Black Saturday",
  "2027-04-09": "Araw ng Kagitingan",
  "2027-05-01": "Labor Day",
  "2027-06-12": "Independence Day",
  "2027-08-21": "Ninoy Aquino Day",
  "2027-08-30": "National Heroes Day",
  "2027-11-01": "All Saints' Day",
  "2027-11-02": "All Souls' Day",
  "2027-11-30": "Bonifacio Day",
  "2027-12-08": "Feast of the Immaculate Conception",
  "2027-12-24": "Christmas Eve",
  "2027-12-25": "Christmas Day",
  "2027-12-30": "Rizal Day",
  "2027-12-31": "Last Day of the Year",
};

export function holidayFor(iso: string): string | undefined {
  return PH_HOLIDAYS[iso];
}

/**
 * Dates held back by hand, for when there is no calendar feed configured or
 * the commitment is not the kind that goes on a calendar. Format is a single
 * date or an inclusive range; the reason is private and never leaves the
 * server — the organiser only ever sees "not available".
 */
export interface BlackoutEntry {
  from: string;
  to?: string;
  /** Server-side only. Never serialise this to a client response. */
  reason: string;
  /** Tentative rather than hard-booked: the date can still be discussed. */
  tentative?: boolean;
}

export const BLACKOUT_DATES: BlackoutEntry[] = [
  // Kept empty on purpose. Add entries as commitments firm up, e.g.
  // { from: "2026-11-12", to: "2026-11-14", reason: "SLU graduate term start" },
];

function expandBlackouts(entries: BlackoutEntry[]): Map<string, BlackoutEntry> {
  const out = new Map<string, BlackoutEntry>();
  for (const entry of entries) {
    if (!isValidISODate(entry.from)) continue;
    const last = entry.to && isValidISODate(entry.to) ? entry.to : entry.from;
    if (daysBetween(entry.from, last) < 0) continue;
    // Bounded: a typo like to:"2099-01-01" would otherwise expand to 26,000
    // map entries on every request.
    const span = Math.min(daysBetween(entry.from, last), 365);
    for (let i = 0; i <= span; i++) out.set(addDays(entry.from, i), entry);
  }
  return out;
}

export interface AssessOptions {
  /** Dates the calendar reports as busy. */
  busyDates?: Set<string>;
  /** Today, as `YYYY-MM-DD`. Injected so tests are not clock-dependent. */
  today: string;
  source?: "calendar" | "manual";
  degraded?: boolean;
}

/**
 * Assess a consecutive run of engagement dates.
 *
 * A date adjacent to a busy date comes back `tentative`, not `available`: back
 * to back engagements in different cities are the ones that go wrong, and it
 * is cheaper to flag them at quotation time than to withdraw afterwards.
 */
export function assessDates(dates: string[], options: AssessOptions): AvailabilityReport {
  const { today, busyDates = new Set<string>() } = options;
  const blackouts = expandBlackouts(BLACKOUT_DATES);

  const assessments: DayAssessment[] = dates.map((date) => {
    const holiday = holidayFor(date);
    const weekend = isWeekend(date);
    const base = {
      date,
      weekday: weekdayName(date),
      isWeekend: weekend,
      holiday,
    };

    if (daysBetween(today, date) < 0) {
      return { ...base, status: "past" as const, note: "This date has already passed." };
    }

    const blackout = blackouts.get(date);
    if (busyDates.has(date) || (blackout && !blackout.tentative)) {
      return {
        ...base,
        status: "booked" as const,
        note: "Already committed. Ask about the nearest open date.",
      };
    }

    if (blackout?.tentative) {
      return {
        ...base,
        status: "tentative" as const,
        note: "Held provisionally for another engagement — worth asking.",
      };
    }

    // Manually held dates count as neighbours too. Checking only the calendar
    // meant a date sitting beside a hand-entered commitment reported as freely
    // open, which is the one case the blackout list exists to catch.
    const committed = (day: string) => busyDates.has(day) || blackouts.has(day);
    const neighbourBusy = committed(addDays(date, -1)) || committed(addDays(date, 1));
    if (neighbourBusy) {
      return {
        ...base,
        status: "tentative" as const,
        note: "Open, but an engagement sits on the day beside it — travel may not allow both.",
      };
    }

    if (holiday) {
      return {
        ...base,
        status: "available" as const,
        note: `Open. ${holiday} — a holiday premium applies.`,
      };
    }

    if (weekend) {
      return { ...base, status: "available" as const, note: "Open. Weekend premium applies." };
    }

    return { ...base, status: "available" as const, note: "Open." };
  });

  const daysOfNotice = dates.length ? Math.max(0, daysBetween(today, dates[0])) : 0;

  return {
    dates: assessments,
    daysOfNotice,
    leadTime: dates.length ? leadTimeBandFor(daysOfNotice) : LEAD_TIME_BANDS[0],
    source: options.source ?? "manual",
    degraded: options.degraded ?? false,
  };
}

/** The consecutive engagement dates implied by a start date and a session count. */
export function engagementDates(startISO: string, sessions: number): string[] {
  const count = Math.max(1, Math.min(30, Math.floor(sessions)));
  return Array.from({ length: count }, (_, i) => addDays(startISO, i));
}

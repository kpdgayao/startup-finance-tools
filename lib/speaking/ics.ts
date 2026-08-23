/**
 * A deliberately small iCalendar reader: it answers one question — which
 * calendar days are busy — and nothing else.
 *
 * WHY NOT A LIBRARY: the only feed this consumes is a private Google Calendar
 * ICS export, and the only fields that matter are DTSTART, DTEND, STATUS and a
 * weekly/daily RRULE. A full RFC 5545 implementation would add a dependency
 * and a parsing surface for a document fetched from the network, in exchange
 * for recurrence rules this use case does not generate.
 *
 * PRIVACY: nothing here reads SUMMARY, DESCRIPTION, LOCATION or ATTENDEE, and
 * the return type is a set of dates. An organiser asking about a date learns
 * "not free" and never learns why. Keep it that way — do not add a title field
 * to this module's output to make an admin view nicer.
 */

export interface BusyWindow {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD, inclusive
}

/** Guard against a runaway feed: ~1MB and 2,000 events is far past a personal calendar. */
const MAX_FEED_BYTES = 1_000_000;
const MAX_EVENTS = 2_000;
/** A recurring event is expanded this far forward and no further. */
const MAX_RECURRENCE_DAYS = 400;

/** Unfold RFC 5545 line continuations: a leading space or tab joins the previous line. */
function unfold(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/**
 * Read the date out of a DTSTART/DTEND value, as `YYYY-MM-DD`.
 *
 * Both forms appear in a Google export: `VALUE=DATE:20260415` for all-day
 * events and `20260415T013000Z` for timed ones. The timed form is deliberately
 * NOT converted to Philippine local time — a UTC instant is truncated to its
 * date as written. The error that introduces is at most a few hours at the
 * edges of a day, against a booking calendar whose entries are day-shaped; a
 * timezone conversion, done wrong, would shift every event by a whole day.
 */
function readDate(value: string): string | null {
  const match = value.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${m}-${d}`;
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function diffDays(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = new Date(fy, fm - 1, fd, 12).getTime();
  const b = new Date(ty, tm - 1, td, 12).getTime();
  return Math.round((b - a) / 86_400_000);
}

interface RawEvent {
  start?: string;
  end?: string;
  allDay: boolean;
  cancelled: boolean;
  transparent: boolean;
  rrule?: string;
}

/**
 * Parse an ICS document into the set of dates that are busy.
 *
 * Cancelled events and events marked TRANSPARENT (Google's "free" availability)
 * are skipped: a tentative hold the owner marked free should not block an
 * organiser's request.
 */
export function busyDatesFromICS(ics: string): Set<string> {
  const busy = new Set<string>();
  if (!ics || ics.length > MAX_FEED_BYTES) return busy;

  const lines = unfold(ics);
  let current: RawEvent | null = null;
  let events = 0;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = { allDay: false, cancelled: false, transparent: false };
      continue;
    }

    if (line.startsWith("END:VEVENT")) {
      if (current && ++events <= MAX_EVENTS) collect(current, busy);
      current = null;
      continue;
    }

    if (!current) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const name = line.slice(0, colon).toUpperCase();
    const value = line.slice(colon + 1).trim();

    if (name.startsWith("DTSTART")) {
      current.start = readDate(value) ?? undefined;
      current.allDay = name.includes("VALUE=DATE") && !value.includes("T");
    } else if (name.startsWith("DTEND")) {
      current.end = readDate(value) ?? undefined;
    } else if (name === "STATUS") {
      current.cancelled = value.toUpperCase() === "CANCELLED";
    } else if (name.startsWith("TRANSP")) {
      current.transparent = value.toUpperCase() === "TRANSPARENT";
    } else if (name.startsWith("RRULE")) {
      current.rrule = value.toUpperCase();
    }
  }

  return busy;
}

function collect(event: RawEvent, busy: Set<string>): void {
  if (!event.start || event.cancelled || event.transparent) return;

  // An all-day DTEND is exclusive per RFC 5545: a one-day event on the 15th is
  // written DTEND;VALUE=DATE:20260416. Timed events end on the day they say.
  let last = event.end ?? event.start;
  if (event.allDay && event.end) last = addDaysISO(event.end, -1);
  if (diffDays(event.start, last) < 0) last = event.start;

  const span = Math.min(diffDays(event.start, last), 30);
  const occurrences = expandRecurrence(event);

  for (const occurrence of occurrences) {
    for (let i = 0; i <= span; i++) busy.add(addDaysISO(occurrence, i));
  }
}

/**
 * Expand DAILY and WEEKLY recurrence only, bounded by MAX_RECURRENCE_DAYS.
 *
 * MONTHLY and YEARLY rules fall back to the first occurrence: a yearly
 * birthday reminder blocking one day a year is a harmless miss, whereas
 * expanding one wrongly would mark a date busy that is actually free — the
 * failure that loses a booking.
 */
function expandRecurrence(event: RawEvent): string[] {
  const start = event.start!;
  if (!event.rrule) return [start];

  const parts = Object.fromEntries(
    event.rrule
      .split(";")
      .map((p) => p.split("="))
      .filter((p) => p.length === 2) as [string, string][]
  );

  const freq = parts.FREQ;
  if (freq !== "DAILY" && freq !== "WEEKLY") return [start];

  const interval = Math.max(1, Math.min(52, Number(parts.INTERVAL) || 1));
  const step = freq === "DAILY" ? interval : interval * 7;

  const untilDate = parts.UNTIL ? readDate(parts.UNTIL) : null;
  const horizon = addDaysISO(start, MAX_RECURRENCE_DAYS);
  const stopAt = untilDate && diffDays(untilDate, horizon) > 0 ? untilDate : horizon;
  const count = parts.COUNT ? Math.max(1, Math.min(500, Number(parts.COUNT) || 1)) : Infinity;

  const out: string[] = [];
  let cursor = start;
  while (out.length < count && diffDays(cursor, stopAt) >= 0) {
    out.push(cursor);
    cursor = addDaysISO(cursor, step);
    if (out.length > 500) break;
  }
  return out;
}

interface CacheEntry {
  dates: Set<string>;
  fetchedAt: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface CalendarResult {
  busy: Set<string>;
  /** False when no feed is configured or the fetch failed. */
  live: boolean;
}

/**
 * Fetch and cache the configured calendar feed.
 *
 * Failure is never fatal: a feed that times out or 404s degrades to the manual
 * blackout list, and the response says so. Telling an organiser a date is free
 * when the calendar was unreachable is a smaller error than refusing to quote.
 */
export async function fetchBusyDates(icsUrl: string | undefined): Promise<CalendarResult> {
  if (!icsUrl) return { busy: new Set(), live: false };

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { busy: cache.dates, live: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    const response = await fetch(icsUrl, {
      signal: controller.signal,
      headers: { Accept: "text/calendar" },
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!response.ok) return { busy: cache?.dates ?? new Set(), live: Boolean(cache) };

    const text = await response.text();
    const dates = busyDatesFromICS(text);
    cache = { dates, fetchedAt: Date.now() };
    return { busy: dates, live: true };
  } catch {
    // Serve a stale cache rather than nothing — a 10-minute-old calendar is
    // still a better answer than "unknown".
    return { busy: cache?.dates ?? new Set(), live: Boolean(cache) };
  }
}

/** Test seam: drop the module-level cache. */
export function resetCalendarCache(): void {
  cache = null;
}

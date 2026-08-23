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

/** The Philippines is UTC+8 year round and observes no daylight saving. */
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Read the date out of a DTSTART/DTEND value, as `YYYY-MM-DD` in Manila time.
 *
 * Both forms appear in a Google export: `VALUE=DATE:20260415` for all-day
 * events, and an instant like `20260415T230000Z` for timed ones.
 *
 * A `Z` instant is shifted into Manila time before its date is taken. Reading
 * it as written put any morning engagement — anything before 08:00 Manila,
 * which is 16:00Z the day before — on the wrong day, so the real day reported
 * free and the day before reported busy. A fixed offset is exact here
 * precisely because there is no DST to track.
 *
 * A floating or TZID-qualified value is taken as written: it is already local
 * to whoever wrote it, and for this calendar that is Manila.
 */
function readDate(value: string): string | null {
  const instant = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (instant) {
    const [, y, mo, d, h, mi, sec] = instant.map(Number) as unknown as number[];
    const shifted = new Date(Date.UTC(y, mo - 1, d, h, mi, sec) + MANILA_OFFSET_MS);
    if (!Number.isFinite(shifted.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
      shifted.getUTCDate()
    )}`;
  }

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
  return parseICS(ics) ?? new Set<string>();
}

/**
 * Parse, distinguishing "no events" from "could not read this".
 *
 * Returns null when the document is unusable — absent, or past the size guard.
 * An empty set from an oversized feed is indistinguishable from a genuinely
 * free calendar, and `fetchBusyDates` would cache it and report `live: true`:
 * the panel then tells an organiser every date is open, over the words
 * "checked against the live calendar". Refusing to answer is the only safe
 * failure here.
 */
export function parseICS(ics: string): Set<string> | null {
  const busy = new Set<string>();
  if (!ics || ics.length > MAX_FEED_BYTES) return null;

  const lines = unfold(ics);
  let current: RawEvent | null = null;
  let events = 0;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = { allDay: false, cancelled: false, transparent: false };
      continue;
    }

    if (line.startsWith("END:VEVENT")) {
      if (current) {
        // Past the cap the picture is incomplete, and an incomplete calendar
        // that reports dates as open is worse than one that declines to.
        if (++events > MAX_EVENTS) return null;
        collect(current, busy);
      }
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

  const untilDate = parts.UNTIL ? readDate(parts.UNTIL) : null;
  const horizon = addDaysISO(start, MAX_RECURRENCE_DAYS);
  const stopAt = untilDate && diffDays(untilDate, horizon) > 0 ? untilDate : horizon;
  const count = parts.COUNT ? Math.max(1, Math.min(500, Number(parts.COUNT) || 1)) : Infinity;

  // BYDAY on a weekly rule names every weekday the event falls on. Ignoring it
  // expanded "every Tuesday and Thursday" as Tuesdays only, so a committed
  // Thursday was reported open — the failure that loses a booking rather than
  // merely inconveniencing one.
  const byDay =
    freq === "WEEKLY" && parts.BYDAY
      ? parts.BYDAY.split(",")
          .map((token) => WEEKDAY_CODES.indexOf(token.trim().slice(-2)))
          .filter((day) => day >= 0)
      : [];

  const out: string[] = [];

  if (byDay.length > 0) {
    // Walk from the start of the rule's own week so a BYDAY earlier in the week
    // than DTSTART is not skipped, then drop anything before DTSTART.
    const startDay = new Date(
      Number(start.slice(0, 4)),
      Number(start.slice(5, 7)) - 1,
      Number(start.slice(8, 10)),
      12
    ).getDay();
    let weekStart = addDaysISO(start, -startDay);

    while (out.length < count && diffDays(weekStart, stopAt) >= 0 && out.length <= 500) {
      for (const day of byDay) {
        const occurrence = addDaysISO(weekStart, day);
        if (diffDays(start, occurrence) < 0) continue;
        if (diffDays(occurrence, stopAt) < 0) continue;
        if (out.length >= count) break;
        out.push(occurrence);
      }
      weekStart = addDaysISO(weekStart, interval * 7);
    }
    return out.length > 0 ? out : [start];
  }

  const step = freq === "DAILY" ? interval : interval * 7;
  let cursor = start;
  while (out.length < count && diffDays(cursor, stopAt) >= 0) {
    out.push(cursor);
    cursor = addDaysISO(cursor, step);
    if (out.length > 500) break;
  }
  return out;
}

/** RFC 5545 weekday codes, indexed to `Date.getDay()`. */
const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

interface CacheEntry {
  dates: Set<string>;
  fetchedAt: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface CalendarResult {
  busy: Set<string>;
  /** True when these dates came from the calendar at all, fresh or cached. */
  live: boolean;
  /**
   * True when the fetch failed and this is a cached copy.
   *
   * Kept separate from `live` because the two answer different questions: the
   * dates ARE the calendar's, but they may be up to a session old. Folding
   * them into one flag made the panel tell the organiser "checked against the
   * live calendar" over a cache of unknown age.
   */
  stale: boolean;
}

/**
 * Fetch and cache the configured calendar feed.
 *
 * Failure is never fatal: a feed that times out or 404s degrades to the manual
 * blackout list, and the response says so. Telling an organiser a date is free
 * when the calendar was unreachable is a smaller error than refusing to quote.
 */
export async function fetchBusyDates(icsUrl: string | undefined): Promise<CalendarResult> {
  if (!icsUrl) return { busy: new Set(), live: false, stale: false };

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { busy: cache.dates, live: true, stale: false };
  }

  const controller = new AbortController();
  // Cleared in `finally`: on a rejected fetch the old code skipped the clear
  // and left a 6-second abort timer armed for every failed request.
  const timeout = setTimeout(() => controller.abort(), 6_000);

  try {
    const response = await fetch(icsUrl, {
      signal: controller.signal,
      headers: { Accept: "text/calendar" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { busy: cache?.dates ?? new Set(), live: Boolean(cache), stale: Boolean(cache) };
    }

    const text = await response.text();
    const dates = parseICS(text);
    // A feed that could not be read is a failed fetch, not an empty calendar.
    if (!dates) {
      return { busy: cache?.dates ?? new Set(), live: Boolean(cache), stale: Boolean(cache) };
    }
    cache = { dates, fetchedAt: Date.now() };
    return { busy: dates, live: true, stale: false };
  } catch {
    // Serve a stale cache rather than nothing — an old calendar is still a
    // better answer than "unknown" — but say that it is old.
    return { busy: cache?.dates ?? new Set(), live: Boolean(cache), stale: Boolean(cache) };
  } finally {
    clearTimeout(timeout);
  }
}

/** Test seam: drop the module-level cache. */
export function resetCalendarCache(): void {
  cache = null;
}

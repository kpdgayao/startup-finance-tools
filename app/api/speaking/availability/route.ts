import { z } from "zod";
import { RateLimiter } from "@/app/lib/rate-limit";
import { assessDates, engagementDates, isValidISODate, toISODate } from "@/lib/speaking/availability";
import { fetchBusyDates } from "@/lib/speaking/ics";

// Cheap and read-only, but it does reach an upstream calendar — a looser limit
// than the AI routes, tight enough that nobody can use this endpoint to probe
// the calendar day by day.
const rateLimiter = new RateLimiter(30, 60_000);

const requestSchema = z.object({
  startDate: z.string().refine(isValidISODate, "Expected a YYYY-MM-DD date"),
  sessions: z.number().int().min(1).max(30).default(1),
});

/**
 * Today in Philippine time, regardless of where the server runs. Lead time and
 * "has this date passed" are both judged against the speaker's calendar, not
 * the deployment region's.
 */
function todayInManila(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const iso = `${get("year")}-${get("month")}-${get("day")}`;
  return isValidISODate(iso) ? iso : toISODate(new Date());
}

export async function POST(request: Request) {
  const { allowed, headers } = rateLimiter.check(request);
  if (!allowed) {
    return Response.json(
      { error: "Too many availability checks. Please try again in a minute." },
      { status: 429, headers }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400, headers });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request: startDate (YYYY-MM-DD) and sessions (1-30) required." },
      { status: 400, headers }
    );
  }

  const { startDate, sessions } = parsed.data;
  const dates = engagementDates(startDate, sessions);

  const { busy, live } = await fetchBusyDates(process.env.SPEAKER_CALENDAR_ICS_URL);

  const report = assessDates(dates, {
    today: todayInManila(),
    busyDates: busy,
    source: live ? "calendar" : "manual",
    degraded: Boolean(process.env.SPEAKER_CALENDAR_ICS_URL) && !live,
  });

  // The response carries dates and statuses only. `assessDates` never sees an
  // event title and this route must never add one — an organiser learns that a
  // date is taken, not what it is taken by.
  return Response.json(report, { headers });
}

import { describe, it, expect } from "vitest";
import {
  BLACKOUT_DATES,
  addDays,
  assessDates,
  daysBetween,
  engagementDates,
  holidayFor,
  isValidISODate,
  isWeekend,
  parseISODate,
  toISODate,
  weekdayName,
} from "@/lib/speaking/availability";
import { busyDatesFromICS } from "@/lib/speaking/ics";

describe("date primitives", () => {
  // The bug this guards: `new Date("2026-04-18")` parses as UTC midnight, so
  // `getDay()` returns Friday west of Greenwich — silently turning a Saturday
  // engagement into a weekday one and dropping the weekend premium.
  it("reads the weekday in local time, not UTC", () => {
    expect(weekdayName("2026-04-18")).toBe("Saturday");
    expect(weekdayName("2026-04-19")).toBe("Sunday");
    expect(weekdayName("2026-04-20")).toBe("Monday");
    expect(isWeekend("2026-04-18")).toBe(true);
    expect(isWeekend("2026-04-20")).toBe(false);
  });

  it("round-trips a date through parse and format", () => {
    expect(toISODate(parseISODate("2026-12-31"))).toBe("2026-12-31");
  });

  it("crosses month and year boundaries when adding days", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts whole days between dates in both directions", () => {
    expect(daysBetween("2026-04-15", "2026-04-18")).toBe(3);
    expect(daysBetween("2026-04-18", "2026-04-15")).toBe(-3);
    expect(daysBetween("2026-04-15", "2026-04-15")).toBe(0);
  });

  it("rejects malformed and impossible dates", () => {
    expect(isValidISODate("2026-04-15")).toBe(true);
    expect(isValidISODate("2026-4-5")).toBe(false);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("not-a-date")).toBe(false);
  });

  it("knows the Philippine holidays it ships with", () => {
    expect(holidayFor("2026-05-01")).toBe("Labor Day");
    expect(holidayFor("2026-04-03")).toBe("Good Friday");
    expect(holidayFor("2027-08-30")).toBe("National Heroes Day");
    expect(holidayFor("2026-04-15")).toBeUndefined();
  });

  it("builds consecutive engagement dates and bounds the count", () => {
    expect(engagementDates("2026-04-15", 3)).toEqual([
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
    ]);
    expect(engagementDates("2026-04-15", 0)).toHaveLength(1);
    expect(engagementDates("2026-04-15", 999)).toHaveLength(30);
  });
});

describe("assessDates", () => {
  const today = "2026-01-15";

  it("marks a free future weekday available", () => {
    const report = assessDates(["2026-04-15"], { today });
    expect(report.dates[0].status).toBe("available");
    expect(report.daysOfNotice).toBe(90);
    expect(report.leadTime.factor).toBe(1);
  });

  it("marks a past date rather than quoting it", () => {
    const report = assessDates(["2025-04-15"], { today });
    expect(report.dates[0].status).toBe("past");
  });

  it("marks a calendar-busy date booked", () => {
    const report = assessDates(["2026-04-15"], {
      today,
      busyDates: new Set(["2026-04-15"]),
      source: "calendar",
    });
    expect(report.dates[0].status).toBe("booked");
  });

  // Back-to-back engagements in different cities are the ones that go wrong.
  it("marks a date beside a booking tentative rather than free", () => {
    const report = assessDates(["2026-04-15"], {
      today,
      busyDates: new Set(["2026-04-16"]),
    });
    expect(report.dates[0].status).toBe("tentative");
  });

  it("never leaks why a date is unavailable", () => {
    const report = assessDates(["2026-04-15"], {
      today,
      busyDates: new Set(["2026-04-15"]),
    });
    const serialised = JSON.stringify(report).toLowerCase();
    for (const term of ["summary", "description", "attendee", "location"]) {
      expect(serialised).not.toContain(term);
    }
  });

  it("reports the lead-time band tightening as the date approaches", () => {
    expect(assessDates(["2026-04-15"], { today: "2026-01-15" }).leadTime.id).toBe("planned");
    expect(assessDates(["2026-04-15"], { today: "2026-04-01" }).leadTime.id).toBe("tight"); // 14
    expect(assessDates(["2026-04-15"], { today: "2026-04-08" }).leadTime.id).toBe("rush"); // 7
    expect(assessDates(["2026-04-15"], { today: "2026-04-09" }).leadTime.id).toBe("emergency"); // 6
  });

  it("names the holiday in the note for a holiday date", () => {
    const report = assessDates(["2026-05-01"], { today });
    expect(report.dates[0].holiday).toBe("Labor Day");
    expect(report.dates[0].note).toContain("Labor Day");
  });
});

describe("ICS parsing", () => {
  const wrap = (body: string) =>
    `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR`;

  it("reads an all-day event and treats DTEND as exclusive", () => {
    const busy = busyDatesFromICS(
      wrap(
        "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260415\r\nDTEND;VALUE=DATE:20260417\r\nEND:VEVENT"
      )
    );
    // 15th and 16th are busy; the 17th is the exclusive end and stays free.
    expect(busy.has("2026-04-15")).toBe(true);
    expect(busy.has("2026-04-16")).toBe(true);
    expect(busy.has("2026-04-17")).toBe(false);
  });

  it("reads a timed event as busy on its own day", () => {
    const busy = busyDatesFromICS(
      wrap("BEGIN:VEVENT\r\nDTSTART:20260415T010000Z\r\nDTEND:20260415T090000Z\r\nEND:VEVENT")
    );
    expect(busy.has("2026-04-15")).toBe(true);
  });

  it("skips cancelled events", () => {
    const busy = busyDatesFromICS(
      wrap(
        "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260415\r\nSTATUS:CANCELLED\r\nEND:VEVENT"
      )
    );
    expect(busy.has("2026-04-15")).toBe(false);
  });

  it("skips events the owner marked free", () => {
    const busy = busyDatesFromICS(
      wrap(
        "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260415\r\nTRANSP:TRANSPARENT\r\nEND:VEVENT"
      )
    );
    expect(busy.has("2026-04-15")).toBe(false);
  });

  it("expands a weekly recurrence up to its UNTIL", () => {
    const busy = busyDatesFromICS(
      wrap(
        "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260415\r\nRRULE:FREQ=WEEKLY;UNTIL=20260506\r\nEND:VEVENT"
      )
    );
    expect(busy.has("2026-04-15")).toBe(true);
    expect(busy.has("2026-04-22")).toBe(true);
    expect(busy.has("2026-05-06")).toBe(true);
    expect(busy.has("2026-05-13")).toBe(false);
  });

  it("honours COUNT on a daily recurrence", () => {
    const busy = busyDatesFromICS(
      wrap(
        "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260415\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEND:VEVENT"
      )
    );
    expect(busy.has("2026-04-17")).toBe(true);
    expect(busy.has("2026-04-18")).toBe(false);
  });

  // Falling back to a single occurrence marks fewer days busy than reality.
  // That errs toward "ask me" rather than toward turning a booking away.
  it("falls back to the first occurrence for a monthly rule", () => {
    const busy = busyDatesFromICS(
      wrap(
        "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260415\r\nRRULE:FREQ=MONTHLY\r\nEND:VEVENT"
      )
    );
    expect(busy.has("2026-04-15")).toBe(true);
    expect(busy.has("2026-05-15")).toBe(false);
  });

  it("unfolds continued lines", () => {
    const busy = busyDatesFromICS(
      "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DA\r\n TE:20260415\r\nEND:VEVENT\r\nEND:VCALENDAR"
    );
    expect(busy.has("2026-04-15")).toBe(true);
  });

  it("returns nothing for junk rather than throwing", () => {
    expect(busyDatesFromICS("").size).toBe(0);
    expect(busyDatesFromICS("not a calendar at all").size).toBe(0);
    expect(busyDatesFromICS(wrap("BEGIN:VEVENT\r\nDTSTART:garbage\r\nEND:VEVENT")).size).toBe(0);
  });

  it("bounds an unterminated recurrence instead of expanding forever", () => {
    const busy = busyDatesFromICS(
      wrap("BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260415\r\nRRULE:FREQ=DAILY\r\nEND:VEVENT")
    );
    expect(busy.size).toBeLessThanOrEqual(501);
    expect(busy.size).toBeGreaterThan(1);
  });
});


describe("ICS timezone handling", () => {
  const wrap = (body: string) =>
    `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR`;

  // A UTC instant read as written put every morning engagement on the previous
  // day: 08:00 Manila is 00:00Z the same day, but 07:00 Manila is 23:00Z the
  // day BEFORE. The real day then reported free.
  it("places an early-morning Manila engagement on its own day", () => {
    // 23:00Z on 14 April is 07:00 on 15 April in Manila.
    const busy = busyDatesFromICS(
      wrap("BEGIN:VEVENT\r\nDTSTART:20260414T230000Z\r\nDTEND:20260415T060000Z\r\nEND:VEVENT")
    );
    expect(busy.has("2026-04-15")).toBe(true);
    expect(busy.has("2026-04-14")).toBe(false);
  });

  it("keeps a mid-morning engagement on the day it is written", () => {
    // 01:00Z is 09:00 Manila, same date.
    const busy = busyDatesFromICS(
      wrap("BEGIN:VEVENT\r\nDTSTART:20260415T010000Z\r\nDTEND:20260415T090000Z\r\nEND:VEVENT")
    );
    expect(busy.has("2026-04-15")).toBe(true);
    expect(busy.has("2026-04-16")).toBe(false);
  });

  it("rolls a late-evening Manila engagement forward, not back", () => {
    // 14:00Z is 22:00 Manila the same day.
    const busy = busyDatesFromICS(
      wrap("BEGIN:VEVENT\r\nDTSTART:20260415T140000Z\r\nEND:VEVENT")
    );
    expect(busy.has("2026-04-15")).toBe(true);
  });

  it("leaves an all-day event untouched by the offset", () => {
    const busy = busyDatesFromICS(
      wrap("BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260415\r\nDTEND;VALUE=DATE:20260416\r\nEND:VEVENT")
    );
    expect(busy.has("2026-04-15")).toBe(true);
    expect(busy.has("2026-04-14")).toBe(false);
    expect(busy.has("2026-04-16")).toBe(false);
  });
});


describe("manually held dates", () => {
  const today = "2026-01-15";

  // BLACKOUT_DATES ships empty, so nothing else in the suite exercises this
  // path. Entries are pushed and popped around each case rather than the
  // module being mocked: assessDates reads the exported array directly, and a
  // mock would test the mock rather than the expansion logic.
  function withBlackouts<T>(entries: typeof BLACKOUT_DATES, run: () => T): T {
    const restore = BLACKOUT_DATES.length;
    BLACKOUT_DATES.push(...entries);
    try {
      return run();
    } finally {
      BLACKOUT_DATES.length = restore;
    }
  }

  it("marks a hand-held date booked", () => {
    withBlackouts([{ from: "2026-04-15", reason: "private" }], () => {
      const report = assessDates(["2026-04-15"], { today });
      expect(report.dates[0].status).toBe("booked");
    });
  });

  it("expands an inclusive range", () => {
    withBlackouts([{ from: "2026-04-15", to: "2026-04-17", reason: "private" }], () => {
      const report = assessDates(["2026-04-15", "2026-04-17", "2026-04-18"], { today });
      expect(report.dates.map((d) => d.status)).toEqual(["booked", "booked", "tentative"]);
    });
  });

  it("marks a provisional hold tentative rather than booked", () => {
    withBlackouts([{ from: "2026-04-15", reason: "private", tentative: true }], () => {
      expect(assessDates(["2026-04-15"], { today }).dates[0].status).toBe("tentative");
    });
  });

  // The adjacency check consulted only the calendar, so a date sitting beside
  // a hand-entered commitment reported as freely open — the one case the
  // blackout list exists to catch.
  it("treats a hand-held date as a neighbour", () => {
    withBlackouts([{ from: "2026-04-16", reason: "private" }], () => {
      const report = assessDates(["2026-04-15"], { today });
      expect(report.dates[0].status).toBe("tentative");
      expect(report.dates[0].note).toContain("beside it");
    });
  });

  it("never leaks the reason a date is held", () => {
    withBlackouts([{ from: "2026-04-15", reason: "SUPER SECRET CLIENT", tentative: true }], () => {
      const report = assessDates(["2026-04-15"], { today });
      expect(JSON.stringify(report)).not.toContain("SECRET");
    });
  });

  it("ignores a malformed or reversed entry instead of throwing", () => {
    withBlackouts(
      [
        { from: "not-a-date", reason: "typo" },
        { from: "2026-05-10", to: "2026-05-01", reason: "reversed" },
      ],
      () => {
        expect(assessDates(["2026-05-05"], { today }).dates[0].status).toBe("available");
      }
    );
  });
});

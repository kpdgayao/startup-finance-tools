import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { QUESTIONS } from "@/lib/speaking/questions";
import { formatEngagementDate } from "@/lib/speaking/availability";

/**
 * Philippine English, not British and not American-by-accident.
 *
 * The distinction that matters here is not a style preference. Philippine
 * English follows the American spelling convention and the American date
 * order, so British forms read to a Filipino reader as a document written
 * somewhere else — which is exactly the wrong signal on a quotation whose
 * whole argument is that it was priced for their situation.
 *
 * Vocabulary matters more than spelling. An organizer here charges a
 * REGISTRATION FEE, not a ticket price; runs an OPEN FORUM, not a Q&A; asks
 * whether you will SHOULDER the transportation; and reads "gate" as a fence.
 * This guard pins the ones that had already crept in, so the next person
 * writing copy for this tool inherits the vocabulary rather than rediscovering
 * it from an American style guide.
 */

const ROOT = process.cwd();
const SELF = "lib/__tests__/philippine-english.test.ts";

/** Files a reader of the speaker quotation tool can see the words of. */
const SURFACES = [
  "lib/speaking/rate-card.ts",
  "lib/speaking/questions.ts",
  "lib/speaking/quotation.ts",
  "lib/speaking/availability.ts",
  "lib/ai/prompts.ts",
  "lib/notes.ts",
  "app/tools/speaker-quotation/page.tsx",
  "app/tools/speaker-quotation/print.ts",
  "app/tools/speaker-quotation/layout.tsx",
  "app/tools/speaker-quotation/components/quotation-summary.tsx",
  "app/api/speaking/intake/route.ts",
];

/**
 * A file with its comments stripped.
 *
 * The subject of this guard is the COPY, not the code around it. Comments
 * routinely quote the wrong form in order to explain why it is wrong — the
 * print builder says "invoice, not 'invoice and official receipt', because…"
 * — and a guard that failed on its own explanation would teach the next person
 * to delete the explanation rather than keep the rule.
 *
 * `//` is only treated as a comment when it does not follow a colon, so a URL
 * inside a string survives. Over-stripping would cost a missed offence, never
 * a false one.
 */
function copy(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("spelling follows the Philippine convention", () => {
  // Deliberately narrow: only forms whose American spelling is unambiguous.
  const BRITISH =
    /\b(organis\w*|programme[sd]?|itemis\w*|recognis\w*|apologis\w*|customis\w*|prioritis\w*|licence|behaviour\w*|enquir\w*|whilst|amongst)\b/gi;

  it("uses no British forms on any surface the reader sees", () => {
    const offenders: string[] = [];
    for (const rel of SURFACES) {
      const matches = copy(rel).match(BRITISH);
      if (matches) offenders.push(`${rel}: ${[...new Set(matches)].join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("catches the drift wherever it happens, not only where it happened last", () => {
    // The list above is a snapshot. This walks the speaking tool's whole tree,
    // so a new file cannot reintroduce the drift by not being on a list.
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (relative(ROOT, full).replace(/\\/g, "/") === SELF) continue;
        if (statSync(full).isDirectory()) out.push(...walk(full));
        else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
      }
      return out;
    };

    const offenders: string[] = [];
    for (const file of [
      ...walk(join(ROOT, "lib/speaking")),
      ...walk(join(ROOT, "app/tools/speaker-quotation")),
    ]) {
      const matches = copy(relative(ROOT, file).replace(/\\/g, "/")).match(BRITISH);
      if (matches) {
        offenders.push(
          `${relative(ROOT, file).replace(/\\/g, "/")}: ${[...new Set(matches)].join(", ")}`
        );
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("dates read the way they are written here", () => {
  it("puts the month before the day", () => {
    expect(formatEngagementDate("2026-04-15")).toBe("April 15, 2026");
  });
});

describe("the vocabulary is the one Philippine organizers use", () => {
  const allCopy = Object.values(QUESTIONS)
    .map((q) => `${q.label} ${q.hint} ${q.why} ${q.impact}`)
    .join(" ");

  it("charges a registration fee rather than selling a ticket", () => {
    expect(QUESTIONS.participantFee.label).toContain("Registration fee");
    // "Ticket" survives nowhere in the copy: events here collect registration
    // fees, and a ticket is for a concert.
    expect(allCopy.toLowerCase()).not.toContain("ticket");
  });

  it("never calls collected registration fees a gate", () => {
    // "The gate" is American box-office idiom. A Filipino reader parses it as
    // a fence before they parse it as revenue.
    for (const rel of SURFACES) {
      expect(copy(rel), rel).not.toMatch(/\b(the|projected|gross) gate\b/i);
    }
  });

  it("asks who will shoulder the costs", () => {
    expect(QUESTIONS.travelCovered.label.toLowerCase()).toContain("shoulder");
    expect(QUESTIONS.accommodationCovered.label.toLowerCase()).toContain("shoulder");
  });

  it("does not say official receipt for a sale of services", () => {
    // Since the Ease of Paying Taxes Act (RA 11976) and RR 7-2024 the invoice
    // is the primary document for services and the OR was removed for them.
    // The intake route is exempt: it still LISTENS for "official receipt",
    // because organizers do still say it.
    for (const rel of SURFACES.filter((f) => !f.includes("api/speaking"))) {
      expect(copy(rel).toLowerCase(), rel).not.toContain("official receipt");
    }
  });
});

/**
 * The inquiry email — the only thing that actually leaves this page.
 *
 * Pure by contract, and deliberately not part of the pricing engine: it reads
 * a finished `Quotation` and the input that produced it, and returns text.
 * It lives here rather than in a `useMemo` on the client because it is the
 * one output nobody can see before it is sent, so it is the one that most
 * needs tests.
 *
 * The ordering is load-bearing. A `mailto:` URL is a URL, and several mail
 * clients truncate long ones without saying so, so the sections run
 * identity → engagement → logistics → money: if a client does cut it, what
 * survives is who is asking and what they are asking for.
 */

import { formatPHP } from "@/lib/utils";
import { formatEngagementDate } from "./availability";
import {
  addOnFor,
  audienceProfileFor,
  engagementTypeFor,
  facilitationScopeFor,
  formatLabel,
  formatsFor,
  organizerTypeFor,
  outputOptionFor,
  preparationOptionFor,
  regionFor,
} from "./rate-card";
import type { Quotation, QuotationInput } from "./quotation";

/**
 * The length beyond which a `mailto:` href stops being reliable.
 *
 * Not a spec limit — RFC 6068 sets none. It is the observed ceiling of the
 * worst common client (older Outlook builds silently cut the body around
 * 2,000 characters), and the reason the page offers a Copy button beside
 * Send rather than trusting the link alone.
 */
export const MAILTO_SAFE_LENGTH = 2_000;

/** Trimmed, or undefined when the field holds nothing but whitespace. */
function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Whether the engine's chosen format is remote, resolved the way the engine
 * resolves it — falling back to the last offered format when the current id
 * is stranded by an engagement-type change.
 *
 * Reading the raw dropdown instead would put a hotel night and a province in
 * an inquiry about a webinar.
 */
function isRemote(input: QuotationInput): boolean {
  const allowed = formatsFor(input.engagementType);
  const chosen = allowed.find((f) => f.id === input.format) ?? allowed[allowed.length - 1];
  return Boolean(chosen.remote);
}

/**
 * Is there enough here to reply to?
 *
 * A name, an organization and an address that could plausibly receive mail.
 * Role and phone are genuinely optional — they add colour, and demanding them
 * would gate the send on something nobody needs.
 */
export function contactComplete(input: QuotationInput): boolean {
  const email = text(input.contactEmail);
  return Boolean(
    text(input.contactName) &&
      text(input.organizationName) &&
      email &&
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  );
}

/** The subject line: what it is, and the reference to quote back. */
export function buildInquirySubject(quote: Quotation, input: QuotationInput): string {
  const what = text(input.eventTitle) ?? text(input.organizationName) ?? "Engagement inquiry";
  return `[Speaking] ${what} — ${quote.reference}`;
}

export function buildInquiryBody(quote: Quotation, input: QuotationInput): string {
  const type = engagementTypeFor(input.engagementType);
  const chosen = formatsFor(type.id).find((f) => f.id === input.format);
  const chosenLabel = chosen ? formatLabel(chosen, type.id) : type.label;
  const remote = isRemote(input);
  const facilitation = type.id === "facilitation";
  const teamBuilding = type.id === "team-building";

  const name = text(input.contactName);
  const role = text(input.contactRole);
  const email = text(input.contactEmail);
  const phone = text(input.contactPhone);
  const rateBasis = `${quote.topicTier} (${formatPHP(quote.dayRate)}/day)`;

  const sections: Array<[string, Array<string | null>]> = [
    [
      "WHO IS ASKING",
      [
        name ? (role ? `${name}, ${role}` : name) : null,
        [email, phone].filter(Boolean).join(" · ") || null,
        text(input.organizationName) ? `Organization: ${text(input.organizationName)}` : null,
        // The sector, not just the name. It is what sets the rate ladder and
        // what decides how the reply should be pitched, and it was the single
        // most useful thing the old email threw away.
        `Organization type: ${organizerTypeFor(input.organizerType).label}`,
        input.returningClient ? "We have booked you before." : null,
      ],
    ],
    [
      "THE ENGAGEMENT",
      [
        text(input.eventTitle) ? `Event: ${text(input.eventTitle)}` : null,
        `Dates: ${quote.dates
          .map((d) => formatEngagementDate(d.date, { weekday: true }))
          .join("; ")} (${quote.daysOfNotice} days' notice)`,
        `Engagement: ${type.label} · ${chosenLabel}${
          input.sessions > 1 ? ` × ${input.sessions}` : ""
        }`,
        text(input.venue) ? `Venue: ${text(input.venue)}` : null,
        remote ? "Location: online, no travel" : `Location: ${regionFor(input.region).label}`,
        `Participants: ${input.audienceSize.toLocaleString("en-PH")}`,
        teamBuilding ? null : `Audience: ${audienceProfileFor(input.audienceProfile).label}`,
        facilitation ? `Scope: ${facilitationScopeFor(input.facilitationScope).label}` : null,
        facilitation ? `Preparation: ${preparationOptionFor(input.preparation).label}` : null,
        facilitation ? `Written output: ${outputOptionFor(input.output).label}` : null,
        facilitation || teamBuilding ? null : `Subject tier: ${rateBasis}`,
        teamBuilding ? `Rate basis: ${rateBasis}` : null,
        input.ticketed
          ? `Ticketed: ${formatPHP(input.participantFee)} per participant, ${input.expectedPaidAttendees.toLocaleString(
              "en-PH"
            )} expected to pay`
          : null,
        input.budget > 0 ? `Our stated budget: ${formatPHP(input.budget)}` : null,
      ],
    ],
    [
      "LOGISTICS AND BILLING",
      [
        remote
          ? null
          : `Travel: ${
              input.travelCovered ? "we arrange and pay for it" : "please bill it on the quote"
            }`,
        remote
          ? null
          : `Accommodation: ${
              input.accommodationCovered
                ? "we arrange and pay for it"
                : "please bill it on the quote"
            }`,
        remote ? null : `Session starts before 10am: ${input.earlyStart ? "yes" : "no"}`,
        `Formal invoice required: ${
          quote.invoicing.required
            ? `yes${quote.invoicing.entity ? `, issued by ${quote.invoicing.entity}` : ""}`
            : "no"
        }`,
        input.addOns.length > 0
          ? `Add-ons: ${input.addOns
              .map((id) => addOnFor(id)?.label)
              .filter(Boolean)
              .join(", ")}`
          : null,
      ],
    ],
    [
      `THE QUOTE (ref ${quote.reference})`,
      [
        `Professional fee: ${formatPHP(quote.professionalFee)}`,
        quote.reimbursablesBilled > 0
          ? `Billed logistics: ${formatPHP(quote.reimbursablesBilled)}`
          : null,
        `Total: ${formatPHP(quote.total)}`,
        `Valid until ${formatEngagementDate(quote.validUntil)}.`,
        "Generated from the published rate card at startupfinance.tools/tools/speaker-quotation.",
      ],
    ],
  ];

  const body = sections
    .map(([heading, lines]) => {
      const kept = lines.filter((line): line is string => line !== null);
      return kept.length > 0 ? [heading, ...kept].join("\n") : null;
    })
    .filter((block): block is string => block !== null)
    .join("\n\n");

  return `${body}\n\nAnything else you should know about this event:\n\n`;
}

/** The finished `mailto:` href, subject and body encoded. */
export function buildInquiryMailto(
  to: string,
  quote: Quotation,
  input: QuotationInput
): string {
  return `mailto:${to}?subject=${encodeURIComponent(
    buildInquirySubject(quote, input)
  )}&body=${encodeURIComponent(buildInquiryBody(quote, input))}`;
}

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
  resolveFormat,
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
 * Deliberately loose: it rejects what cannot receive mail, not what looks
 * unusual. Exported so the field's own error state and the send gate ask the
 * same question — a field showing no error beside a button disabled for that
 * field is worse than either alone.
 */
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
      EMAIL_SHAPE.test(email)
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
  const remote = Boolean(resolveFormat(input.format).remote);
  const facilitation = type.id === "facilitation";
  const teamBuilding = type.id === "team-building";

  /**
   * How many people the engine believes will actually pay.
   *
   * `expectedPaidAttendees` defaults to 0, and the field's own placeholder is
   * the participant count — 0 means "the same as the room". The engine reads
   * it that way (`raw.expectedPaidAttendees > 0 ? ... : audienceSize`), so
   * printing the raw 0 sent an email claiming nobody would pay, stapled to a
   * fee carrying a revenue-share uplift computed on a full room.
   */
  const paidAttendees =
    input.expectedPaidAttendees > 0 ? input.expectedPaidAttendees : input.audienceSize;

  const name = text(input.contactName);
  const role = text(input.contactRole);
  const email = text(input.contactEmail);
  const phone = text(input.contactPhone);
  // `quote.topicTier` is the facilitation scope for facilitation and the
  // COMPLEXITY tier otherwise — including for team building, which is never
  // asked the complexity question at all (visibleFieldIds filters it out).
  // Naming a tier there would attribute the day rate to a setting the
  // organizer never saw and that did not produce it.
  const dayRate = `${formatPHP(quote.dayRate)}/day`;
  const rateBasis = `${quote.topicTier} (${dayRate})`;

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
        teamBuilding ? `Day rate: ${dayRate}` : null,
        input.ticketed
          ? `Ticketed: ${formatPHP(input.participantFee)} per participant, ${paidAttendees.toLocaleString(
              "en-PH"
            )} expected to pay (${formatPHP(quote.projectedRevenue)} in registrations)`
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

/**
 * Whether this href is long enough that a mail client may cut it.
 *
 * A loaded inquiry — facilitation, four add-ons, ticketing, a budget and all
 * the logistics lines — measures around 2,065 characters, so this is not a
 * theoretical case. The peso sign alone costs nine characters once encoded.
 * The page shows the organizer the Copy route when this is true rather than
 * letting them send something that arrives cut off mid-sentence.
 */
export function exceedsMailtoLimit(href: string): boolean {
  return href.length > MAILTO_SAFE_LENGTH;
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

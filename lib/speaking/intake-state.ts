/**
 * Which questions apply, where each answer came from, and which of the
 * unanswered ones are actually worth asking.
 *
 * Pure by contract. `app/api/speaking/intake/route.ts` imports FIELD_IDS from
 * here to constrain what the model may name, so this module must never gain a
 * "use client" directive, a React import, or a browser API.
 */

import { type QuotationInput } from "./quotation";
import { formatsFor } from "./rate-card";

/**
 * Every priced question, in the order the full form shows them.
 *
 * The order is load-bearing: `visibleFieldIds` filters this list rather than
 * building its own, so the form's reading order is defined in exactly one
 * place. The free-text identity fields (eventTitle, organizationName, venue)
 * are deliberately absent — they do not enter the price and have no QUESTIONS
 * entry.
 */
export const FIELD_IDS = [
  "organizerType",
  "engagementType",
  "format",
  "sessions",
  "complexity",
  "facilitationScope",
  "preparation",
  "output",
  "startDate",
  "region",
  "returningClient",
  "ticketed",
  "participantFee",
  "expectedPaidAttendees",
  "budget",
  "audienceSize",
  "audienceProfile",
  "earlyStart",
  "travelCovered",
  "accommodationCovered",
  "invoiceRequired",
  "addOns",
] as const;

export type FieldId = (typeof FIELD_IDS)[number];

/**
 * Whether the engine's chosen format is remote, resolved the way the page
 * resolves it — falling back to the last offered format when the current id is
 * stranded by an engagement-type change, exactly as `setEngagementType` does.
 */
function isRemote(input: QuotationInput): boolean {
  const allowed = formatsFor(input.engagementType);
  const chosen = allowed.find((f) => f.id === input.format) ?? allowed[allowed.length - 1];
  return Boolean(chosen.remote);
}

/**
 * Region stays on screen for a remote engagement, greyed, with the
 * "Online — no travel" note beside it. Hiding it made the quote's travel line
 * appear to come from nowhere.
 */
export function isFieldDisabled(id: FieldId, input: QuotationInput): boolean {
  return id === "region" && isRemote(input);
}

export function visibleFieldIds(input: QuotationInput): FieldId[] {
  const facilitation = input.engagementType === "facilitation";
  const teamBuilding = input.engagementType === "team-building";
  const remote = isRemote(input);

  return FIELD_IDS.filter((id) => {
    switch (id) {
      case "complexity":
        return !facilitation && !teamBuilding;
      case "facilitationScope":
      case "preparation":
      case "output":
        return facilitation;
      case "audienceProfile":
        return !teamBuilding;
      case "participantFee":
      case "expectedPaidAttendees":
        return input.ticketed;
      case "earlyStart":
      case "travelCovered":
      case "accommodationCovered":
        return !remote;
      default:
        return true;
    }
  });
}

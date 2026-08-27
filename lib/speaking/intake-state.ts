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

/** One inference the model made, tied to the field it made it about. */
export interface IntakeAssumption {
  field: FieldId;
  note: string;
}

/**
 * What the model read out of an organizer's description.
 *
 * Every priced field is optional: an omitted field keeps the form's default,
 * where a wrong one becomes a wrong price the organizer then has to argue
 * about. The ids are enum-constrained server-side and re-validated with zod,
 * but they arrive at the client as plain strings, so the page checks each
 * against the live option list before accepting it.
 */
export interface IntakeDraft {
  engagementType?: string;
  facilitationScope?: string;
  preparation?: string;
  output?: string;
  format?: string;
  sessions?: number;
  complexity?: string;
  audienceSize?: number;
  audienceProfile?: string;
  organizerType?: string;
  ticketed?: boolean;
  participantFee?: number;
  expectedPaidAttendees?: number;
  budget?: number;
  region?: string;
  startDate?: string;
  earlyStart?: boolean;
  travelCovered?: boolean;
  accommodationCovered?: boolean;
  addOns?: string[];
  invoiceRequired?: boolean;
  returningClient?: boolean;
  eventTitle?: string;
  organizationName?: string;
  venue?: string;
  assumptions: IntakeAssumption[];
}

export type FieldStatus = "read" | "assumed" | "blank" | "edited";

/**
 * Only `assumed` and `blank` need the organizer's attention. A `read` field
 * renders set and quiet; an `edited` one has already had it.
 *
 * An assumption naming a field the draft did not actually set is dropped
 * rather than trusted — the tool schema is a request to the model, not a
 * guarantee from it, and a note pointing at an empty control reads as a bug.
 */
export function fieldProvenance(
  draft: IntakeDraft | null,
  edits: ReadonlySet<FieldId>
): Record<FieldId, FieldStatus> {
  const assumed = new Set(
    (draft?.assumptions ?? [])
      .filter((a) => draft?.[a.field as keyof IntakeDraft] !== undefined)
      .map((a) => a.field)
  );

  const out = {} as Record<FieldId, FieldStatus>;
  for (const id of FIELD_IDS) {
    if (edits.has(id)) out[id] = "edited";
    else if (!draft || draft[id as keyof IntakeDraft] === undefined) out[id] = "blank";
    else if (assumed.has(id)) out[id] = "assumed";
    else out[id] = "read";
  }
  return out;
}

/** The note attached to a field, or null when there is none. */
export function assumptionFor(draft: IntakeDraft | null, id: FieldId): string | null {
  return draft?.assumptions.find((a) => a.field === id)?.note ?? null;
}

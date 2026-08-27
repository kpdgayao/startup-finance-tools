/**
 * Which questions apply, where each answer came from, and which of the
 * unanswered ones are actually worth asking.
 *
 * Pure by contract. `app/api/speaking/intake/route.ts` imports FIELD_IDS from
 * here to constrain what the model may name, so this module must never gain a
 * "use client" directive, a React import, or a browser API.
 */

import { buildQuotation, type QuotationInput } from "./quotation";
import {
  formatsFor,
  ADD_ONS,
  AUDIENCE_BANDS,
  AUDIENCE_PROFILES,
  COMPLEXITY_TIERS,
  ENGAGEMENT_TYPES,
  FACILITATION_SCOPES,
  ORGANIZER_TYPES,
  OUTPUT_OPTIONS,
  PREPARATION_OPTIONS,
  REGIONS,
} from "./rate-card";

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

/**
 * Fold a second reading into the first.
 *
 * The organizer can come back with "actually we cannot cover the hotel", and
 * that sentence describes one field, not the whole engagement. Replacing the
 * draft wholesale made the page forget everything the original note had
 * answered: eleven read fields collapsed to two, and it re-asked four
 * questions the organizer had already answered in their first paragraph.
 *
 * The form is merged separately, by the page. This merges the PROVENANCE, so
 * an answer stays attributed to whichever message actually gave it.
 */
export function mergeDrafts(prev: IntakeDraft | null, incoming: IntakeDraft): IntakeDraft {
  if (!prev) return incoming;

  const merged = { ...prev } as IntakeDraft;
  const named = new Set<string>();
  for (const [key, value] of Object.entries(incoming)) {
    if (key === "assumptions" || value === undefined) continue;
    (merged as unknown as Record<string, unknown>)[key] = value;
    named.add(key);
  }

  // A field the new message spoke about takes the new message's note — or no
  // note at all, if it stated the thing outright this time.
  const incomingNotes = incoming.assumptions ?? [];
  merged.assumptions = [
    ...incomingNotes,
    ...(prev.assumptions ?? []).filter(
      (a) => !named.has(a.field) && !incomingNotes.some((b) => b.field === a.field)
    ),
  ];
  return merged;
}

/**
 * Which of the three states the page is in.
 *
 * One URL, no navigation: the quote is computed the same way in all three, and
 * only the questions around it change.
 */
export type Phase = "opening" | "reading" | "full";

/**
 * Where a visitor lands.
 *
 * `storedPhase` is what they were last doing, and it is READ, not inferred.
 * Deriving it from "is there anything in storage" replaced the full form with
 * the reading panel the instant somebody changed their first field — that
 * write is what made storage non-empty — and headed it "Here's what I read
 * from your note" when there had been no note.
 */
export function initialPhase(storedPhase: Phase | null | undefined, aiAvailable: boolean): Phase {
  if (storedPhase) return storedPhase;
  return aiAvailable ? "opening" : "full";
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
  // Optional chain on `assumptions` too: the draft is rehydrated from
  // localStorage without validation, and an older or hand-edited record
  // missing the array threw during render and took the page down.
  return draft?.assumptions?.find((a) => a.field === id)?.note ?? null;
}

/**
 * The note to actually render beside a control — which is NOT the same as the
 * note the draft carries.
 *
 * Only an `assumed` field shows one. A `read` field was stated outright and
 * needs no explanation, and an `edited` field must lose its note the moment
 * the organizer corrects it: leaving it up printed "I set this to 2 full-day
 * sessions" beside a field reading 3, which is worse than showing nothing,
 * because it is confidently wrong about what the page is currently pricing.
 */
export function noteToShow(
  draft: IntakeDraft | null,
  provenance: Record<FieldId, FieldStatus>,
  id: FieldId
): string | null {
  return provenance[id] === "assumed" ? assumptionFor(draft, id) : null;
}

/**
 * How much a blank has to be able to move the total before it is worth a
 * question. Whichever is larger: small engagements are protected by the
 * percentage, large ones by the peso floor.
 */
const MATERIAL_SHARE = 0.05;
const MATERIAL_FLOOR = 5_000;

/** Past five, the short section stops being short, which is the point of it. */
const MAX_QUESTIONS = 5;

/**
 * A date is not a price factor you can default your way past: it sets the
 * lead-time band, the weekday premium and the calendar check all at once, and
 * there is no honest quote without one. Pinned first rather than ranked.
 */
const ALWAYS_ASK: FieldId[] = ["startDate"];

/**
 * Questions with no option ladder to probe, which are therefore invisible to
 * the spread measurement and have to be named.
 *
 * The registration fee is the case that matters: once the organizer says
 * participants pay, the fee times the head count is what decides whether the
 * revenue-share floor lifts the quote. Measured by spread it scores zero —
 * there is nothing to vary it against — so it fell into the collapsed
 * disclosure and was never asked, and the floor silently never applied.
 */
function pinnedFor(input: QuotationInput): FieldId[] {
  const pinned = [...ALWAYS_ASK];
  if (input.ticketed && !input.participantFee) pinned.push("participantFee");
  return pinned;
}

/**
 * A blank budget is an answer — it means "I have not been given one" — and
 * `assessBudget` correctly does nothing with it. Asking would read as fishing.
 */
const NEVER_ASK: FieldId[] = ["budget"];

/**
 * The audience ladder, probed at each band's ceiling. The open-ended top band
 * is probed at twice the last finite ceiling rather than at a typed figure, so
 * re-banding the rate card cannot leave a stale number here.
 */
const AUDIENCE_PROBES = AUDIENCE_BANDS.map((band, i) =>
  Number.isFinite(band.max) ? band.max : AUDIENCE_BANDS[i - 1].max * 2
);

/** The values worth trying for one field. Fewer than two means "do not probe". */
function probesFor(id: FieldId, input: QuotationInput): Partial<QuotationInput>[] {
  switch (id) {
    case "organizerType":
      return ORGANIZER_TYPES.map((o) => ({ organizerType: o.id }));
    case "engagementType":
      return ENGAGEMENT_TYPES.map((t) => ({ engagementType: t.id }));
    case "format":
      return formatsFor(input.engagementType).map((f) => ({ format: f.id }));
    case "complexity":
      return COMPLEXITY_TIERS.map((c) => ({ complexity: c.id }));
    case "facilitationScope":
      return FACILITATION_SCOPES.map((s) => ({ facilitationScope: s.id }));
    case "preparation":
      return PREPARATION_OPTIONS.map((o) => ({ preparation: o.id }));
    case "output":
      return OUTPUT_OPTIONS.map((o) => ({ output: o.id }));
    case "region":
      return REGIONS.map((r) => ({ region: r.id }));
    case "audienceProfile":
      return AUDIENCE_PROFILES.map((p) => ({ audienceProfile: p.id }));
    case "audienceSize":
      return AUDIENCE_PROBES.map((audienceSize) => ({ audienceSize }));
    case "sessions":
      return [1, 2, 3].map((sessions) => ({ sessions }));
    case "addOns":
      return [{ addOns: [] }, ...ADD_ONS.map((a) => ({ addOns: [a.id] }))];
    case "ticketed":
      return [{ ticketed: false }, { ticketed: true }];
    case "returningClient":
      return [{ returningClient: false }, { returningClient: true }];
    case "earlyStart":
      return [{ earlyStart: false }, { earlyStart: true }];
    case "travelCovered":
      return [{ travelCovered: false }, { travelCovered: true }];
    case "accommodationCovered":
      return [{ accommodationCovered: false }, { accommodationCovered: true }];
    case "invoiceRequired":
      return [{ invoiceRequired: false }, { invoiceRequired: true }];
    // Only meaningful once ticketed is true, and then the fee is asked as part
    // of that branch rather than ranked against unrelated factors.
    case "participantFee":
    case "expectedPaidAttendees":
    case "startDate":
    case "budget":
      return [];
  }
}

/** The spread in the total across everything this field could be. */
function spreadFor(id: FieldId, input: QuotationInput): number {
  const probes = probesFor(id, input);
  if (probes.length < 2) return 0;
  const totals = probes.map((probe) => buildQuotation({ ...input, ...probe }).total);
  return Math.max(...totals) - Math.min(...totals);
}

/**
 * The unanswered questions that would actually change the number, biggest
 * first, capped.
 *
 * Derived rather than authored: a hand-written priority list would drift from
 * the rate card the first time a multiplier moved, and it could not know that
 * audience size matters for a hall and not for a boardroom.
 */
export function materialBlanks(
  input: QuotationInput,
  provenance: Record<FieldId, FieldStatus>
): FieldId[] {
  const applicable = new Set(visibleFieldIds(input));
  const candidates = FIELD_IDS.filter(
    (id) =>
      provenance[id] === "blank" &&
      applicable.has(id) &&
      !isFieldDisabled(id, input) &&
      !NEVER_ASK.includes(id)
  );

  const alwaysAsk = pinnedFor(input);
  const pinned = candidates.filter((id) => alwaysAsk.includes(id));

  const total = buildQuotation(input).total;
  const threshold = Math.max(total * MATERIAL_SHARE, MATERIAL_FLOOR);

  const ranked = candidates
    .filter((id) => !alwaysAsk.includes(id))
    .map((id) => ({ id, spread: spreadFor(id, input) }))
    .filter((c) => c.spread >= threshold)
    .sort((a, b) => b.spread - a.spread)
    .map((c) => c.id);

  return [...pinned, ...ranked].slice(0, MAX_QUESTIONS);
}

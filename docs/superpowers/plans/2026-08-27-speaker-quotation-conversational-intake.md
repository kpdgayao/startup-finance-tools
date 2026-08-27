# Speaker Quotation Conversational Intake — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the seventeen-field front page of `/tools/speaker-quotation` with a three-state intake — a prose "tell me about your event" opening, a Reading state that leads with the number and asks only what is still missing, and the existing full form as escape hatch and fallback.

**Architecture:** The pricing engine is not touched. A new pure module `lib/speaking/intake-state.ts` decides which fields apply, where each answer came from, and which blanks actually move the price. A new field registry renders every control from one definition so the two states cannot drift. `page.tsx` becomes a state machine that owns state and delegates rendering.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (new-york), Radix, Zod, `@anthropic-ai/sdk`, Vitest. Package manager is **pnpm 10.28.2**.

**Spec:** `docs/superpowers/specs/2026-08-27-speaker-quotation-conversational-intake-design.md` — read it before Task 1. This plan argues from it; where they disagree, the spec wins and you should stop and say so.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Repo root is the `app/` directory.** The git repository *is* `app/`; the parent folder is not a repo. Run every `git`, `pnpm`, and `gh` command from `C:/Users/ASUS TUF/Projects/startup-finance-tools/app`. The `@/` alias points at that directory.
- **Two lib trees exist.** `@/lib/*` (`lib/speaking/…`, `lib/utils.ts`) and `@/app/lib/*` (`app/lib/rate-limit.ts`). They are different. Do not confuse them.
- **Test command is `pnpm exec vitest run`.** Never `pnpm test` — that is bare `vitest`, which enters watch mode in an interactive terminal and looks like a hang. Add a path to filter: `pnpm exec vitest run lib/speaking/__tests__/intake-state.test.ts`.
- **`pnpm build` is the reliable gate.** TypeScript plus Turbopack. It must pass at the end of every task that touches a `.tsx` file.
- **`pnpm lint` fails today** with five pre-existing `react-hooks/set-state-in-effect` errors in `ecosystem-banner`, `compliance-checklist` and `fundraising-guide`. It is not a clean gate. Scope to your own files: `pnpm exec eslint <paths you edited>`.
- **There are no GitHub Actions on this repo.** A green PR page proves nothing. The local gates above are the gate.
- **No jsdom, no Testing Library, no rendering tests.** Every existing test is a pure data assertion or a `node:fs` file sweep. Do not add a test runtime as a side effect of this work. Components are verified by `pnpm build` plus looking at the page.
- **No `shadow-*` classes anywhere.** A guard test fails the build on any of them. Elevation comes from surface steps and hairline borders (`border-rule`).
- **Colours come from CSS variables**, never hex. A guard test enforces this outside an allowlist of logo/favicon assets.
- **The page must work in both light and dark themes.** The toggle is `next-themes`, key `sft-theme`. Do not assume dark.
- **Never type a figure that the rate card can produce.** `lib/speaking/questions.ts` interpolates every peso amount from `rate-card.ts` on purpose, so copy cannot drift from the engine. Follow that rule in any new copy.
- **Do not modify** `lib/speaking/quotation.ts`, `rate-card.ts`, `inclusions.ts`, `availability.ts`, `ics.ts`, or any of their tests. If you believe one needs changing, stop and report — the change has left its scope.
- **Commit after every task**, on the branch `design/speaker-quotation-conversational-intake` (or a branch created from it). Do not push and do not open a PR unless asked.

---

## File Structure

**Created:**

| Path | Responsibility |
| --- | --- |
| `lib/speaking/intake-state.ts` | Pure. Field ids, which fields apply, where each answer came from, which blanks move the price. Imported by both the client page and the API route, so it must stay free of `"use client"` and of React. |
| `lib/speaking/__tests__/intake-state.test.ts` | Tests for the above. |
| `app/tools/speaker-quotation/components/quotation-fields.tsx` | The field registry. One definition of every control; renders the ids it is given, in the order given. |
| `app/tools/speaker-quotation/components/full-form.tsx` | The Full state: today's three `Card`s and its `DetailSection`. |
| `app/tools/speaker-quotation/components/opening-panel.tsx` | The Opening state: one prose box. |
| `app/tools/speaker-quotation/components/reading-panel.tsx` | The Reading state: what I read / what would change the number / the rest / anything else. |
| `lib/speaking/use-quotation-storage.ts` | localStorage read+write via `useSyncExternalStore`. |

**Modified:**

| Path | Change |
| --- | --- |
| `app/tools/speaker-quotation/page.tsx` | Becomes a thin **server** component (Task 7): reads `ANTHROPIC_API_KEY` and renders the client. |
| `app/tools/speaker-quotation/speaker-quotation-client.tsx` | **Created in Task 7** by moving today's client component out of `page.tsx`. The state machine. Loses ~900 lines of JSX to the components above. |
| `app/api/speaking/intake/route.ts` | `assumptions` gains a field id; `questions` removed; rate limit raised. |
| `lib/speaking/use-quotation-assist.ts` | `IntakeDraft` moves out; re-exported for compatibility. |
| `docs/speaker-quotation.md` | Operating notes updated. |

**Deleted:**

| Path | Why |
| --- | --- |
| `app/tools/speaker-quotation/components/intake-assistant.tsx` | Superseded by `opening-panel.tsx` and the "anything else?" line in `reading-panel.tsx`. |

---

## Task 1: Field ids and which fields apply

**Files:**
- Create: `lib/speaking/intake-state.ts`
- Create: `lib/speaking/__tests__/intake-state.test.ts`

**Interfaces:**
- Consumes: `QuotationInput`, `DEFAULT_INPUT` from `@/lib/speaking/quotation`; `formatsFor` from `@/lib/speaking/rate-card`.
- Produces: `FIELD_IDS` (readonly tuple), `type FieldId`, `visibleFieldIds(input): FieldId[]`, `isFieldDisabled(id, input): boolean`. Tasks 3, 4, 5, 6, 8 all import from here.

**Context you need:** the conditionals being extracted live in `app/tools/speaker-quotation/page.tsx` at lines 565 (`!isFacilitation && !isTeamBuilding`), 598 (`isFacilitation`), 811 (`input.ticketed`), 885 (`!isTeamBuilding`), 941 (`!isRemote`), and 733/751 (region `disabled` when remote). Read them before writing the test. Note the asymmetry the spec calls out: `region` is **disabled**, not hidden, for a remote format.

- [ ] **Step 1: Write the failing test**

Create `lib/speaking/__tests__/intake-state.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";
import { FIELD_IDS, visibleFieldIds, isFieldDisabled } from "@/lib/speaking/intake-state";
import { QUESTIONS } from "@/lib/speaking/questions";

const TODAY = "2026-01-15";
const WEDNESDAY = "2026-04-15";

function input(overrides: Partial<QuotationInput> = {}): QuotationInput {
  return { ...DEFAULT_INPUT, today: TODAY, startDate: WEDNESDAY, ...overrides };
}

describe("FIELD_IDS", () => {
  it("has an entry in QUESTIONS for every id", () => {
    for (const id of FIELD_IDS) {
      expect(QUESTIONS[id], `QUESTIONS is missing ${id}`).toBeDefined();
    }
  });

  it("contains no duplicates", () => {
    expect(new Set(FIELD_IDS).size).toBe(FIELD_IDS.length);
  });
});

describe("visibleFieldIds", () => {
  it("shows the subject tier for a talk and hides the facilitation ladder", () => {
    const ids = visibleFieldIds(input({ engagementType: "speaking" }));
    expect(ids).toContain("complexity");
    expect(ids).not.toContain("facilitationScope");
    expect(ids).not.toContain("preparation");
    expect(ids).not.toContain("output");
  });

  it("shows the facilitation ladder and hides the subject tier", () => {
    const ids = visibleFieldIds(input({ engagementType: "facilitation" }));
    expect(ids).toContain("facilitationScope");
    expect(ids).toContain("preparation");
    expect(ids).toContain("output");
    expect(ids).not.toContain("complexity");
  });

  it("hides who is in the room for team building", () => {
    expect(visibleFieldIds(input({ engagementType: "team-building" })))
      .not.toContain("audienceProfile");
  });

  it("gates the two revenue fields on ticketed", () => {
    expect(visibleFieldIds(input({ ticketed: false }))).not.toContain("participantFee");
    expect(visibleFieldIds(input({ ticketed: true }))).toContain("participantFee");
    expect(visibleFieldIds(input({ ticketed: true }))).toContain("expectedPaidAttendees");
  });

  it("hides the logistics switches for a remote format but keeps region visible", () => {
    const remote = input({ engagementType: "speaking", format: "online-webinar" });
    const ids = visibleFieldIds(remote);
    expect(ids).not.toContain("earlyStart");
    expect(ids).not.toContain("travelCovered");
    expect(ids).not.toContain("accommodationCovered");
    expect(ids).toContain("region");
    expect(isFieldDisabled("region", remote)).toBe(true);
  });

  it("leaves region enabled for an in-person format", () => {
    expect(isFieldDisabled("region", input())).toBe(false);
  });

  it("preserves the canonical order", () => {
    const ids = visibleFieldIds(input());
    const positions = ids.map((id) => FIELD_IDS.indexOf(id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
```

**Before running:** confirm the remote format id. Run `grep -n "remote: true" -B 4 lib/speaking/rate-card.ts` and use the real id in the two places the test says `"online-webinar"`. Do not guess it.

- [ ] **Step 2: Run the test to verify it fails**

```
pnpm exec vitest run lib/speaking/__tests__/intake-state.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/speaking/intake-state"`.

- [ ] **Step 3: Write the implementation**

Create `lib/speaking/intake-state.ts`:

```ts
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
 * building its own, so the full form's reading order is defined in exactly one
 * place. The four free-text identity fields (eventTitle, organizationName,
 * venue) are deliberately absent — they do not enter the price and have no
 * QUESTIONS entry.
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

/** Whether the engine's chosen format is remote, resolved the way the page resolves it. */
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
```

- [ ] **Step 4: Run the test to verify it passes**

```
pnpm exec vitest run lib/speaking/__tests__/intake-state.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Run the whole suite to confirm nothing else moved**

```
pnpm exec vitest run
```

Expected: every suite green.

- [ ] **Step 6: Commit**

```bash
git add lib/speaking/intake-state.ts lib/speaking/__tests__/intake-state.test.ts
git commit -m "feat(speaking): extract which questions apply into a pure module"
```

---

## Task 2: Where each answer came from

**Files:**
- Modify: `lib/speaking/intake-state.ts`
- Modify: `lib/speaking/__tests__/intake-state.test.ts`

**Interfaces:**
- Consumes: `FieldId`, `FIELD_IDS` from Task 1.
- Produces: `type FieldStatus = "read" | "assumed" | "blank" | "edited"`, `interface IntakeAssumption { field: FieldId; note: string }`, `interface IntakeDraft`, `fieldProvenance(draft, edits): Record<FieldId, FieldStatus>`.

**Why the draft type moves here:** `IntakeDraft` currently lives in `lib/speaking/use-quotation-assist.ts`, which carries `"use client"`. The API route needs the same shape. Moving it into this pure module gives both sides one definition. Task 4 re-exports it from the old location so nothing else breaks.

- [ ] **Step 1: Write the failing test**

Append to `lib/speaking/__tests__/intake-state.test.ts`:

```ts
import { fieldProvenance, type IntakeDraft } from "@/lib/speaking/intake-state";

function draft(over: Partial<IntakeDraft> = {}): IntakeDraft {
  return { assumptions: [], ...over };
}

describe("fieldProvenance", () => {
  it("marks a field the note stated as read", () => {
    const p = fieldProvenance(draft({ organizerType: "cooperative" }), new Set());
    expect(p.organizerType).toBe("read");
  });

  it("marks a field the model inferred as assumed", () => {
    const p = fieldProvenance(
      draft({
        organizerType: "cooperative",
        assumptions: [{ field: "organizerType", note: "Read 'our co-op' as a cooperative." }],
      }),
      new Set()
    );
    expect(p.organizerType).toBe("assumed");
  });

  it("marks an untouched field as blank", () => {
    expect(fieldProvenance(draft(), new Set()).region).toBe("blank");
  });

  it("marks an edited field as edited, whatever it was before", () => {
    const d = draft({
      organizerType: "cooperative",
      region: "baguio",
      assumptions: [{ field: "organizerType", note: "Guessed." }],
    });
    const p = fieldProvenance(d, new Set<FieldId>(["organizerType", "region"]));
    expect(p.organizerType).toBe("edited");
    expect(p.region).toBe("edited");
  });

  it("drops an assumption naming a field the draft never set", () => {
    const p = fieldProvenance(
      draft({ assumptions: [{ field: "region", note: "Nothing set this." }] }),
      new Set()
    );
    expect(p.region).toBe("blank");
  });

  it("treats a null draft as everything blank", () => {
    const p = fieldProvenance(null, new Set());
    for (const id of FIELD_IDS) expect(p[id]).toBe("blank");
  });

  it("returns an entry for every field id", () => {
    const p = fieldProvenance(draft({ sessions: 2 }), new Set());
    expect(Object.keys(p).sort()).toEqual([...FIELD_IDS].sort());
  });
});
```

Add `type FieldId` to the existing import from `@/lib/speaking/intake-state` at the top of the file.

- [ ] **Step 2: Run the test to verify it fails**

```
pnpm exec vitest run lib/speaking/__tests__/intake-state.test.ts
```

Expected: FAIL — `fieldProvenance is not exported`.

- [ ] **Step 3: Write the implementation**

Append to `lib/speaking/intake-state.ts`:

```ts
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
export function assumptionFor(
  draft: IntakeDraft | null,
  id: FieldId
): string | null {
  return draft?.assumptions.find((a) => a.field === id)?.note ?? null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```
pnpm exec vitest run lib/speaking/__tests__/intake-state.test.ts
```

Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/speaking/intake-state.ts lib/speaking/__tests__/intake-state.test.ts
git commit -m "feat(speaking): track where each intake answer came from"
```

---

## Task 3: Which blanks are worth asking about

**Files:**
- Modify: `lib/speaking/intake-state.ts`
- Modify: `lib/speaking/__tests__/intake-state.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–2; `buildQuotation` from `@/lib/speaking/quotation`; the option lists from `@/lib/speaking/rate-card`.
- Produces: `materialBlanks(input, provenance): FieldId[]`.

**The idea:** for each blank field, re-quote across its plausible values and measure the spread in `quote.total`. Anything that can move the number materially gets asked; the rest falls through to defaults. This is not a new pattern — `assessBudget` in `quotation.ts` already re-quotes once per lever to price each concession.

- [ ] **Step 1: Write the failing test**

Append to `lib/speaking/__tests__/intake-state.test.ts`:

```ts
import { materialBlanks } from "@/lib/speaking/intake-state";

const allBlank = () => fieldProvenance(null, new Set());

describe("materialBlanks", () => {
  it("always asks for the date when it is blank, first", () => {
    expect(materialBlanks(input(), allBlank())[0]).toBe("startDate");
  });

  it("asks for the sector, which is the largest lever on the rate card", () => {
    expect(materialBlanks(input(), allBlank())).toContain("organizerType");
  });

  it("never asks for the budget — a blank budget is an answer", () => {
    expect(materialBlanks(input(), allBlank())).not.toContain("budget");
  });

  it("does not ask about a field that is already read", () => {
    const p = fieldProvenance(draft({ organizerType: "cooperative" }), new Set());
    expect(materialBlanks(input({ organizerType: "cooperative" }), p))
      .not.toContain("organizerType");
  });

  it("does not ask about a field that does not apply", () => {
    const facilitation = input({ engagementType: "facilitation" });
    expect(materialBlanks(facilitation, allBlank())).not.toContain("complexity");
  });

  it("does not ask about a disabled field", () => {
    const remote = input({ engagementType: "speaking", format: "online-webinar" });
    expect(materialBlanks(remote, allBlank())).not.toContain("region");
  });

  it("leaves the small switches out", () => {
    expect(materialBlanks(input(), allBlank())).not.toContain("invoiceRequired");
  });

  it("returns at most five", () => {
    expect(materialBlanks(input(), allBlank()).length).toBeLessThanOrEqual(5);
  });

  it("orders by how much the answer could move the total", () => {
    const ids = materialBlanks(input(), allBlank());
    // startDate is pinned first; the rest are ranked by spread.
    expect(ids[0]).toBe("startDate");
    expect(ids.length).toBeGreaterThan(1);
  });

  it("returns nothing when everything is answered", () => {
    const answered = {} as Record<FieldId, FieldStatus>;
    for (const id of FIELD_IDS) answered[id] = "read";
    expect(materialBlanks(input(), answered)).toEqual([]);
  });
});
```

Use the same real remote format id you found in Task 1.

- [ ] **Step 2: Run the test to verify it fails**

```
pnpm exec vitest run lib/speaking/__tests__/intake-state.test.ts
```

Expected: FAIL — `materialBlanks is not exported`.

- [ ] **Step 3: Write the implementation**

Append to `lib/speaking/intake-state.ts`. Add the rate-card imports to the existing import statement at the top of the file:

```ts
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
```

Then:

```ts
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

/** The values worth trying for one field. Empty means "do not probe". */
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

  const pinned = candidates.filter((id) => ALWAYS_ASK.includes(id));

  const total = buildQuotation(input).total;
  const threshold = Math.max(total * MATERIAL_SHARE, MATERIAL_FLOOR);

  const ranked = candidates
    .filter((id) => !ALWAYS_ASK.includes(id))
    .map((id) => ({ id, spread: spreadFor(id, input) }))
    .filter((c) => c.spread >= threshold)
    .sort((a, b) => b.spread - a.spread)
    .map((c) => c.id);

  return [...pinned, ...ranked].slice(0, MAX_QUESTIONS);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```
pnpm exec vitest run lib/speaking/__tests__/intake-state.test.ts
```

Expected: PASS, 26 tests.

If "asks for the sector" fails, the threshold is too high for the default input — print the spreads (`console.log(FIELD_IDS.map(id => [id, spreadFor(id, input())]))` in a scratch test) and check the constants against reality before changing the test. The test asserts a real property of the rate card: sector is described in `questions.ts` as "the biggest single factor on the price".

- [ ] **Step 5: Run the whole suite**

```
pnpm exec vitest run
```

Expected: every suite green.

- [ ] **Step 6: Commit**

```bash
git add lib/speaking/intake-state.ts lib/speaking/__tests__/intake-state.test.ts
git commit -m "feat(speaking): derive which unanswered questions still move the price"
```

---

## Task 4: Attach every assumption to its field

**Files:**
- Modify: `app/api/speaking/intake/route.ts`
- Modify: `lib/speaking/use-quotation-assist.ts`
- Modify: `app/tools/speaker-quotation/components/intake-assistant.tsx`

**Interfaces:**
- Consumes: `FIELD_IDS`, `IntakeDraft`, `IntakeAssumption` from `@/lib/speaking/intake-state`.
- Produces: an API that returns `assumptions: { field, note }[]` and no `questions`.

**Why:** `assumptions` is `string[]` today — free text attached to nothing, which is why it can only be printed as a bullet list. Reading needs to put each note beside the control it is about.

`questions` is removed entirely: Task 3 derives that set deterministically, and `questions.ts` phrases every one of them better than the model will.

- [ ] **Step 1: Move the draft type out of the client module**

In `lib/speaking/use-quotation-assist.ts`, delete the whole `export interface IntakeDraft { … }` block and replace it with a re-export so existing importers keep working:

```ts
export type { IntakeDraft, IntakeAssumption } from "./intake-state";
```

Add `import type { IntakeDraft } from "./intake-state";` alongside the existing `AvailabilityReport` import, since `useIntakeDraft` still references the type internally.

- [ ] **Step 2: Change the tool schema**

In `app/api/speaking/intake/route.ts`, add to the imports:

```ts
import { FIELD_IDS } from "@/lib/speaking/intake-state";
```

Replace the `assumptions` and `questions` properties inside `draftTool.input_schema.properties` with:

```ts
      assumptions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: {
              type: "string",
              enum: FIELD_IDS as unknown as string[],
              description: "The form field this inference is about.",
            },
            note: {
              type: "string",
              description:
                "One short sentence addressed to the organizer, saying what you took from their words.",
            },
          },
          required: ["field", "note"],
        },
        description:
          "Every field you inferred rather than read. Name the field, and say what you inferred and from what.",
      },
```

Change `required` on the tool schema from `["assumptions", "questions"]` to `["assumptions"]`.

- [ ] **Step 3: Change the zod schema**

In the same file, replace the `assumptions` and `questions` lines in `draftSchema` with:

```ts
  assumptions: z
    .array(
      z.object({
        field: z.enum(FIELD_IDS as unknown as [string, ...string[]]),
        note: z.string().max(300),
      })
    )
    .max(12)
    .default([]),
```

Leave the comment above `draftTool` intact — the principle it states (a tool schema is a request to the model, not a guarantee from it, so zod re-validates regardless) is exactly why both layers exist.

- [ ] **Step 4: Update the system prompt**

In `systemPrompt()`, find the instruction that tells the model to fill `questions` and delete it. Change the instruction about assumptions to name the field, e.g.:

> `- Every inference goes in "assumptions" as a { field, note } pair naming the form field it is about. Do not list a field you did not fill in.`

Do not tell the model what is still missing — that is derived now.

- [ ] **Step 5: Raise the rate limit**

Replace:

```ts
const rateLimiter = new RateLimiter(5, 60_000);
```

with:

```ts
// The organizer can now come back with "and we can cover the hotel" from the
// reading panel, which spends from this same budget — five was enough for one
// pass at the form and not for a conversation.
const rateLimiter = new RateLimiter(10, 60_000);
```

Find where the limiter's rejection is turned into a response and make the message point at the answers rather than at the clock:

> `"I'll stop re-reading for a minute — you can edit any answer directly below."`

- [ ] **Step 6: Keep `intake-assistant.tsx` compiling**

It reads `draft.assumptions` as strings and `draft.questions`. This component is deleted in Task 10, but the build must pass now. Change its assumptions list to render `a.note`, and delete the whole `draft.questions.length > 0 && (…)` block:

```tsx
                {draft.assumptions.map((a) => (
                  <li key={a.field}>{a.note}</li>
                ))}
```

- [ ] **Step 7: Verify**

```
pnpm exec vitest run
pnpm build
pnpm exec eslint app/api/speaking/intake/route.ts lib/speaking/use-quotation-assist.ts app/tools/speaker-quotation/components/intake-assistant.tsx
```

Expected: suites green, build clean, no lint errors in those three files.

- [ ] **Step 8: Test the endpoint by hand**

With `ANTHROPIC_API_KEY` set, run `pnpm dev` and POST a description:

```bash
curl -s -X POST http://localhost:3000/api/speaking/intake \
  -H "Content-Type: application/json" \
  -d '{"description":"We are a rural bank in Tarlac running a two-day in-house training on bookkeeping for our 45 branch managers, none of them accountants. Second week of March, starting 8am. We can cover a hotel and a van from Baguio.","today":"2026-08-27"}'
```

Expected: `assumptions` is an array of `{field, note}` objects, every `field` is one of `FIELD_IDS`, and there is no `questions` key.

- [ ] **Step 9: Commit**

```bash
git add app/api/speaking/intake/route.ts lib/speaking/use-quotation-assist.ts app/tools/speaker-quotation/components/intake-assistant.tsx
git commit -m "feat(speaking): tie each intake assumption to the field it is about"
```

---

## Task 5: One definition of every control

**Files:**
- Create: `app/tools/speaker-quotation/components/quotation-fields.tsx`
- Modify: `app/tools/speaker-quotation/page.tsx`
- Modify: `lib/speaking/__tests__/intake-state.test.ts`

**Interfaces:**
- Consumes: `FieldId`, `FIELD_IDS`, `isFieldDisabled`.
- Produces: `interface FieldContext`, `<QuotationFields ids={FieldId[]} ctx={FieldContext} />`, and `deriveFieldContext(...)` in `page.tsx`.

**This is the task that matters most.** All twenty-two controls are inline JSX in `page.tsx` today. Reading and Full both need them. Two copies **will** drift, and a sector select that differs between two states of one page produces two different prices for one event.

**This task changes no behaviour.** The page must look and price identically before and after. Do not improve anything while moving it — the comments in that JSX record real bugs (a Radix trigger stretching to 805px inside a 375px viewport; a float rendering as `1.7999999999999998`) and every one of them must survive the move.

**Exact source ranges in `app/tools/speaker-quotation/page.tsx`:**

| Field | Lines | Wrapping condition to drop |
| --- | --- | --- |
| `organizerType` | 431–471 | — |
| `engagementType` | 473–505 | — |
| `format` | 507–539 | — |
| `sessions` | 541–563 | — |
| `complexity` | 566–595 | `!isFacilitation && !isTeamBuilding` (565) |
| `facilitationScope` | 600–624 | `isFacilitation` (598) |
| `preparation` | 626–643 | `isFacilitation` |
| `output` | 645–662 | `isFacilitation` |
| `startDate` | 677–703 | — |
| `region` | 713–756 | — (keeps its own `disabled` prop) |
| `returningClient` | 770–785 | — |
| `ticketed` | 787–808 | — |
| `participantFee` | 813–821 | `input.ticketed` (811) |
| `expectedPaidAttendees` | 823–832 | `input.ticketed` |
| `budget` | 840–864 | — |
| `audienceSize` | 872–884 | — |
| `audienceProfile` | 886–906 | `!isTeamBuilding` (885) |
| `earlyStart` | 943–958 | `!isRemote` (941) |
| `travelCovered` | 960–975 | `!isRemote` |
| `accommodationCovered` | 977–994 | `!isRemote` |
| `invoiceRequired` | 997–1018 | — |
| `addOns` | 1019–1060 | — |

Every wrapping conditional is dropped, because `visibleFieldIds` now decides. The identity fields at lines 909–940 (`event-title`, `organization`, `venue`) are **not** part of the registry — they stay where they are and move with the `DetailSection` in Task 6.

- [ ] **Step 1: Write the guard test first**

Append to `lib/speaking/__tests__/intake-state.test.ts`. This is a `node:fs` sweep, matching the house style used by `lib/__tests__/tool-index.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("the field registry", () => {
  const source = readFileSync(
    join(process.cwd(), "app/tools/speaker-quotation/components/quotation-fields.tsx"),
    "utf8"
  );

  it("has a renderer for every field id", () => {
    for (const id of FIELD_IDS) {
      expect(source, `quotation-fields.tsx has no case for ${id}`).toContain(`case "${id}":`);
    }
  });

  it("is the only place the controls are defined", () => {
    const page = readFileSync(
      join(process.cwd(), "app/tools/speaker-quotation/page.tsx"),
      "utf8"
    );
    expect(page).not.toContain("<RateFactorField");
  });
});
```

Without this, a field added to the rate card compiles, builds, passes everything, and silently never renders.

- [ ] **Step 2: Run it to verify it fails**

```
pnpm exec vitest run lib/speaking/__tests__/intake-state.test.ts
```

Expected: FAIL — `ENOENT … quotation-fields.tsx`.

- [ ] **Step 3: Create the context type and the registry shell**

Create `app/tools/speaker-quotation/components/quotation-fields.tsx`:

```tsx
"use client";

import { Fragment } from "react";
import type { QuotationInput, Quotation } from "@/lib/speaking/quotation";
import { type FieldId, isFieldDisabled } from "@/lib/speaking/intake-state";
import { RateFactorField } from "./rate-factor-field";

/**
 * Everything a control needs, resolved once by the page.
 *
 * The derived values are passed in rather than recomputed here because the
 * page already resolves them the way the ENGINE resolves them — reading
 * `complexity.dayRate` directly once put a ₱9,000 travel chip beside the
 * ₱15,000 line the quote actually charged. One resolution, one truth.
 */
export interface FieldContext {
  input: QuotationInput;
  quote: Quotation | null;
  /** Set one answer. Also records the field as edited. */
  set: (id: FieldId, value: unknown) => void;
  setChosenDate: (date: string) => void;
  resetAvailability: () => void;
  /** Derived. Add to this as the compiler names what is missing. */
  d: Record<string, unknown>;
}

interface QuotationFieldsProps {
  ids: FieldId[];
  ctx: FieldContext;
  /** Rendered under a field's control — the assumption note, when there is one. */
  noteFor?: (id: FieldId) => string | null;
}

export function QuotationFields({ ids, ctx, noteFor }: QuotationFieldsProps) {
  return (
    <>
      {ids.map((id) => (
        <Fragment key={id}>{renderField(id, ctx, noteFor?.(id) ?? null)}</Fragment>
      ))}
    </>
  );
}

function renderField(id: FieldId, ctx: FieldContext, note: string | null) {
  switch (id) {
    // one `case "<id>":` per field, each returning the moved JSX
  }
}
```

**Type the context properly rather than leaving `d: Record<string, unknown>`.** That placeholder exists only so the file compiles before the moves begin. As you move each control, TypeScript will name every derived value it needs (`organizer`, `activeDayRate`, `perHeadLine`, `engagementType`, `format`, `availableFormats`, `complexity`, `facilitationScope`, `preparationOption`, `preparationDaysLabel`, `outputOption`, `outputDaysLabel`, `region`, `dayEquivalentsPreview`, `audienceBand`, `audienceProfile`, `leadFactor`, `isFacilitation`, `isTeamBuilding`, `isRemote`, and the module-scope helpers `SELECT_CONTENT`, `SELECT_TRIGGER`, `OptionText`, `factorImpact`, `dayLabel`). Add each to `FieldContext` with its real type as you meet it. Move `SELECT_CONTENT`, `SELECT_TRIGGER`, `OptionText` and `factorImpact` into this file — they are only used by controls — and delete them from `page.tsx`.

- [ ] **Step 4: Move the controls, one field at a time**

For each row of the table above, in order: cut the `<RateFactorField>…</RateFactorField>` block out of `page.tsx`, paste it as the `return` of its `case`, drop the wrapping conditional, and repoint each local variable at the context (`input.` → `ctx.input.`, `organizer` → `ctx.organizer`, `set("x", v)` → `ctx.set("x", v)`).

Two that need care:

- **`region`** keeps `disabled={…}` but sources it from the shared helper: `disabled={isFieldDisabled("region", ctx.input)}`. Its `{isRemote && (…)}` note block stays.
- **`sessions`** calls `availability.reset()` inside its `onChange`. That becomes `ctx.resetAvailability()`. Keep it — without it a one-date "Open" was showing beside a three-date quote.

Render `note` under the control when it is non-null:

```tsx
{note && (
  <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>
)}
```

After each field moves, run `pnpm build`. Do not move all twenty-two and then build once.

- [ ] **Step 5: Render the registry from `page.tsx`**

In `page.tsx`, replace each stretch of removed JSX with a `<QuotationFields>` call carrying the ids that used to be there, so the page renders identically:

```tsx
<QuotationFields
  ids={visibleFieldIds(input).filter((id) => CARD_ONE.includes(id))}
  ctx={fieldContext}
/>
```

Define the three groupings as module constants next to the existing ones:

```tsx
const CARD_ONE: FieldId[] = [
  "organizerType", "engagementType", "format", "sessions",
  "complexity", "facilitationScope", "preparation", "output",
];
const CARD_TWO: FieldId[] = ["startDate", "region"];
const CARD_THREE: FieldId[] = [
  "returningClient", "ticketed", "participantFee", "expectedPaidAttendees", "budget",
];
const DETAILS: FieldId[] = [
  "audienceSize", "audienceProfile", "earlyStart", "travelCovered",
  "accommodationCovered", "invoiceRequired", "addOns",
];
```

Build `fieldContext` with `useMemo` from the values already computed in the component.

- [ ] **Step 6: Verify nothing changed**

```
pnpm exec vitest run
pnpm build
pnpm exec eslint app/tools/speaker-quotation/ lib/speaking/intake-state.ts
```

Then `pnpm dev` and compare against the live page at https://startupfinance.tools/tools/speaker-quotation:

- Every question appears, in the same order, with the same hint and the same "Why I ask" text.
- The impact chips read the same for the same answers.
- Switching to Facilitation swaps the subject tier for the three facilitation questions.
- Ticking "participants pay" reveals the two revenue fields.
- Choosing the remote format greys out Region with its note and hides the three logistics switches.
- The total for a given set of answers is unchanged.
- Check both themes and a 375px-wide viewport. The Radix trigger must not stretch.

- [ ] **Step 7: Commit**

```bash
git add app/tools/speaker-quotation/ lib/speaking/__tests__/intake-state.test.ts
git commit -m "refactor(speaker-quotation): one definition of every control"
```

---

## Task 6: The state machine and the Full state

**Files:**
- Create: `app/tools/speaker-quotation/components/full-form.tsx`
- Modify: `app/tools/speaker-quotation/page.tsx`

**Interfaces:**
- Consumes: `QuotationFields`, `FieldContext`, `CARD_ONE`/`CARD_TWO`/`CARD_THREE`/`DETAILS` (export these from `quotation-fields.tsx` in this task).
- Produces: `type Phase = "opening" | "reading" | "full"`, `<FullForm ctx={FieldContext} />`.

- [ ] **Step 1: Move the form shell into `full-form.tsx`**

Cut the three `<Card>` blocks (`page.tsx:416–866`) and the `<DetailSection>` (`868–1061`) into a new `full-form.tsx` that takes `ctx: FieldContext` and renders them, calling `QuotationFields` exactly as `page.tsx` did. The three free-text identity inputs at lines 909–940 move with the `DetailSection` unchanged.

Move the four id-group constants into `quotation-fields.tsx` and export them, so both `full-form.tsx` and Task 8's `reading-panel.tsx` read one list.

- [ ] **Step 2: Add the phase state**

In `page.tsx`:

```tsx
type Phase = "opening" | "reading" | "full";

const [phase, setPhase] = useState<Phase>("full");
```

It starts at `"full"` in this task; Tasks 7 and 9 change the initial value. Render `<FullForm ctx={fieldContext} />` when `phase === "full"`.

- [ ] **Step 3: Track edits**

Replace the existing `set` callback so it records the field:

```tsx
const [edits, setEdits] = useState<ReadonlySet<FieldId>>(() => new Set());

const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
  setForm((prev) => ({ ...prev, [key]: value }));
  // An organizer who corrects an inferred answer has answered it. The
  // assumption note beside it stops being true the moment they do.
  setEdits((prev) => (prev.has(key as FieldId) ? prev : new Set(prev).add(key as FieldId)));
}, []);
```

`handleReset` must also clear it: `setEdits(new Set())`.

- [ ] **Step 4: Retain the draft**

`applyDraft` currently ends with `intake.dismiss()`, which discards the draft. Keep it:

```tsx
const [draft, setDraft] = useState<IntakeDraft | null>(null);
```

At the end of `applyDraft`, call `setDraft(incoming)` **before** `intake.dismiss()`. Everything in Reading depends on this. Add `setDraft(null)` to `handleReset`.

- [ ] **Step 5: Verify**

```
pnpm exec vitest run
pnpm build
```

Then `pnpm dev`: the page must be indistinguishable from Task 5's result. This task only moves code and adds unused state.

- [ ] **Step 6: Commit**

```bash
git add app/tools/speaker-quotation/
git commit -m "refactor(speaker-quotation): extract the full form and add phase state"
```

---

## Task 7: The Opening state

**Files:**
- Create: `app/tools/speaker-quotation/components/opening-panel.tsx`
- Create: `app/tools/speaker-quotation/speaker-quotation-client.tsx` (by moving today's client component out of `page.tsx`)
- Modify: `app/tools/speaker-quotation/page.tsx` (becomes a thin server component)
- Modify: `lib/speaking/__tests__/intake-state.test.ts` (repoint the registry guard)

**Interfaces:**
- Consumes: `useIntakeDraft` from `@/lib/speaking/use-quotation-assist`.
- Produces: `<OpeningPanel onDraft isDrafting error onSkip />`; `SpeakerQuotationClient` gains an `aiAvailable: boolean` prop.

- [ ] **Step 1: Resolve the key server-side**

The page must **not** infer availability from a failed call — a request can fail for a dozen reasons, and showing the organizer a prose box that cannot work is the one outcome to avoid.

A layout cannot pass props to a page in the App Router, so split the page instead:

1. Move the entire current client component into a new file `app/tools/speaker-quotation/speaker-quotation-client.tsx`, keeping its `"use client"` directive, and rename the export to `SpeakerQuotationClient`. Give it a new prop `aiAvailable: boolean`.
2. Rewrite `app/tools/speaker-quotation/page.tsx` as a thin **server** component with no `"use client"`:

```tsx
import { SpeakerQuotationClient } from "./speaker-quotation-client";

export default function SpeakerQuotationPage() {
  // Whether the front door can exist at all. Resolved here because the client
  // component cannot read the key, and because a failed request is not
  // evidence that the key is missing.
  return <SpeakerQuotationClient aiAvailable={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
```

Leave `layout.tsx` alone — its metadata export is unaffected.

Every later reference in this plan to "the client component" means `speaker-quotation-client.tsx`. The registry guard test in Task 5 asserts `page.tsx` contains no `<RateFactorField` — that still holds, and now trivially. Update that test's second assertion to read `speaker-quotation-client.tsx` instead, so it keeps testing something real.

- [ ] **Step 2: Build the panel**

`opening-panel.tsx` is `intake-assistant.tsx`'s textarea, promoted to the whole screen and stripped of the draft-review section (Reading does that now). Keep: the `MAX_CHARS = 4_000` cap and its counter, the `tooShort` guard at 20 characters, the placeholder example, the loading state. Add the skip link:

```tsx
<button
  type="button"
  onClick={onSkip}
  className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
>
  I'd rather just answer the questions
</button>
```

The standing editorial paragraph (`page.tsx:404–413`, "I would rather you saw the arithmetic…") stays in `page.tsx` above the phase switch — it belongs to all three states.

- [ ] **Step 3: Wire the transitions**

```tsx
const [phase, setPhase] = useState<Phase>(aiAvailable ? "opening" : "full");
```

On a successful draft: `applyDraft(draft)` then `setPhase("reading")`.
On the skip link: `setPhase("full")`.
On error: stay in `"opening"`, show the message inline, **keep the typed text**, and show the skip link. Never lose what they wrote.
On an empty draft (no fields set): still go to `"reading"` — a short form ordered by price impact beats a dead end in Opening.

- [ ] **Step 4: Verify the degradation by hand**

```
pnpm build
```

Then run `pnpm dev` twice:

1. With `ANTHROPIC_API_KEY` set — the page opens on the prose box; the skip link reaches the full form; a pasted description moves it to Reading (which is still the full form until Task 8).
2. With the key **unset** — the page opens directly on the full form, with no Opening state, no error, and no dead button. This is the check that matters most in this task.

Also: submit, then hit browser Back. The page must not be left in a broken state.

- [ ] **Step 5: Commit**

```bash
git add app/tools/speaker-quotation/
git commit -m "feat(speaker-quotation): open with a prose box instead of a form"
```

---

## Task 8: The Reading state

**Files:**
- Create: `app/tools/speaker-quotation/components/reading-panel.tsx`
- Modify: `app/tools/speaker-quotation/page.tsx`

**Interfaces:**
- Consumes: `fieldProvenance`, `assumptionFor`, `materialBlanks`, `visibleFieldIds`, `QuotationFields`, `FieldContext`, `DetailSection`.
- Produces: `<ReadingPanel ctx draft provenance onMore isDrafting error onShowAll />`.

**Order on screen — this is the point of the whole redesign.** The number first, the corrections after it. Do not reorder.

- [ ] **Step 1: Compute the three buckets in `page.tsx`**

```tsx
const provenance = useMemo(() => fieldProvenance(draft, edits), [draft, edits]);

const applicable = useMemo(() => visibleFieldIds(input), [input]);

const known = useMemo(
  () => applicable.filter((id) => provenance[id] === "read" || provenance[id] === "assumed" || provenance[id] === "edited"),
  [applicable, provenance]
);

const asking = useMemo(() => materialBlanks(input, provenance), [input, provenance]);

const rest = useMemo(
  () => applicable.filter((id) => !known.includes(id) && !asking.includes(id)),
  [applicable, known, asking]
);
```

`materialBlanks` re-quotes many times; memoize it on `input` exactly as `quote` is memoized. Do not call it inside a render loop.

- [ ] **Step 2: Build the panel**

`reading-panel.tsx` renders, in this order:

1. Nothing — `QuotationSummary` is rendered by `page.tsx` above the panel, unchanged.
2. **"Here's what I read from your note"** — `<QuotationFields ids={known} ctx={ctx} noteFor={(id) => assumptionFor(draft, id)} />`. Not wrapped in a `DetailSection`; these are visible.
3. **"These would change the number"** — `<QuotationFields ids={asking} ctx={ctx} />`. Skip the whole section when `asking` is empty.
4. **"The rest of the details"** — a `DetailSection` whose `summary` keeps saying what the existing one says: everything inside is optional, has a sensible default, and is already answered on the quote above. Inside it: `<QuotationFields ids={rest} ctx={ctx} />` plus the three identity inputs moved from `full-form.tsx`'s `DetailSection` (render them in both places from a small shared `IdentityFields` component rather than duplicating the markup).
5. **"Anything else I should know?"** — a one-line textarea plus a small submit. On submit it calls the same `requestDraft`, and the result goes through `applyDraft`, which merges: it only overwrites fields the incoming draft actually set.
6. A quiet **"show me every question"** link → `setPhase("full")`.

Section headings use the existing eyebrow style already in this codebase:

```tsx
<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
  Here's what I read from your note
</p>
```

- [ ] **Step 3: Handle the merge correctly**

The "anything else?" submit must **not** clear `edits` — a field the organizer corrected by hand stays corrected. `applyDraft` overwrites it only if the new draft names it, which is the intended behaviour: they said something new about it.

When the rate limiter trips, show the message from Task 4 inline under the box and leave every control usable.

- [ ] **Step 4: Verify by hand**

```
pnpm exec vitest run
pnpm build
pnpm exec eslint app/tools/speaker-quotation/
```

Then with `pnpm dev`, paste the rural-bank example from Task 4 step 8 and check:

- The number renders before any question.
- Sector, engagement type, sessions and audience size appear under "what I read", already set.
- Anything the model inferred carries a note; correcting it makes the note disappear and moves the number.
- "These would change the number" holds a handful of fields, not seventeen, and the date is first.
- "The rest of the details" is collapsed and contains everything else.
- "and we can cover the hotel" in the anything-else box flips accommodation without resetting the other answers.
- Both themes; 375px wide.

- [ ] **Step 5: Commit**

```bash
git add app/tools/speaker-quotation/
git commit -m "feat(speaker-quotation): lead with the number, then what I read"
```

---

## Task 9: Bring them back to their own quote

**Files:**
- Create: `lib/speaking/use-quotation-storage.ts`
- Modify: `app/tools/speaker-quotation/page.tsx` (the client component)

**Interfaces:**
- Produces: `useStoredQuotation(): StoredQuotation | null`, `writeStoredQuotation(value)`, `clearStoredQuotation()`, `const STORAGE_KEY = "sft-speaker-quotation"`.

**Why:** the only meaningful second visit is the organizer coming back after their sponsor said "see if he can do it for ₱X". They want their own quote, not a blank state. Today, coming back means retyping seventeen answers.

**Read this before writing code.** `compliance-checklist` and `fundraising-guide` persist with a read-in-`useEffect`-then-`setState` pattern, and that pattern is exactly what produces three of the five `react-hooks/set-state-in-effect` errors that make `pnpm lint` fail today. **Do not add a sixth.** `page.tsx` already imports `useSyncExternalStore` and uses it correctly for `today` — copy that, with a server snapshot of `null`.

- [ ] **Step 1: Write the module**

```ts
"use client";

import { useSyncExternalStore } from "react";
import type { FieldId, IntakeDraft } from "./intake-state";

export const STORAGE_KEY = "sft-speaker-quotation";

export interface StoredQuotation {
  form: Record<string, unknown>;
  chosenDate: string | null;
  draft: IntakeDraft | null;
  edits: FieldId[];
}

const listeners = new Set<() => void>();
let cache: string | null = null;
let parsed: StoredQuotation | null = null;

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Returns a stable object identity for an unchanged string, because
 * useSyncExternalStore compares snapshots by reference and re-parsing on every
 * render would loop forever.
 */
function getSnapshot(): StoredQuotation | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // Private windows and blocked site data throw on access.
  }
  if (raw !== cache) {
    cache = raw;
    try {
      parsed = raw ? (JSON.parse(raw) as StoredQuotation) : null;
    } catch {
      parsed = null;
    }
  }
  return parsed;
}

const getServerSnapshot = (): StoredQuotation | null => null;

export function useStoredQuotation(): StoredQuotation | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function writeStoredQuotation(value: StoredQuotation): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    return; // Quota or blocked storage. The page still works; nothing persists.
  }
  listeners.forEach((fn) => fn());
}

export function clearStoredQuotation(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  listeners.forEach((fn) => fn());
}
```

- [ ] **Step 2: Restore on mount**

In the client component, use the stored value to pick the initial phase and the initial form:

```tsx
const stored = useStoredQuotation();

const [phase, setPhase] = useState<Phase>(() =>
  stored ? "reading" : aiAvailable ? "opening" : "full"
);
```

Seed `form`, `chosenDate`, `draft` and `edits` from `stored` in their `useState` initialisers. A `useState` initialiser is not an effect, so this does not reintroduce the lint error.

- [ ] **Step 3: Write on change**

Persist whenever the answers change. Because `writeStoredQuotation` is a plain function and not a `setState`, calling it from an effect is fine and does not trip the rule — but prefer calling it from `set`, `applyDraft` and `setChosenDate` directly if that is clean.

- [ ] **Step 4: Clear on reset**

`handleReset` must call `clearStoredQuotation()` alongside the existing resets, and set `phase` back to `aiAvailable ? "opening" : "full"`.

- [ ] **Step 5: Say so on the page**

One line, in the Reading panel near the anything-else box:

> Your answers stay in this browser so you can come back to them. Nothing reaches me until you send the inquiry.

That second clause is already true and should stay easy to verify.

- [ ] **Step 6: Verify by hand**

```
pnpm build
pnpm exec eslint lib/speaking/use-quotation-storage.ts app/tools/speaker-quotation/
```

The eslint run must report **no** `react-hooks/set-state-in-effect` error. Then:

- Fill in a quote, reload → you land on Reading with your number and answers.
- Press reset → back to Opening, and `localStorage.getItem("sft-speaker-quotation")` is null.
- Open the page in a private window with site data blocked → everything works, nothing persists, no console error.

- [ ] **Step 7: Commit**

```bash
git add lib/speaking/use-quotation-storage.ts app/tools/speaker-quotation/
git commit -m "feat(speaker-quotation): bring a returning organizer back to their quote"
```

---

## Task 10: Clean up, document, verify

**Files:**
- Delete: `app/tools/speaker-quotation/components/intake-assistant.tsx`
- Modify: `docs/speaker-quotation.md`
- Modify: `lib/speaking/quotation.ts` **only** for the `contactName` decision below

- [ ] **Step 1: Delete the superseded component**

```bash
git rm app/tools/speaker-quotation/components/intake-assistant.tsx
grep -rn "IntakeAssistant" app/ lib/
```

The grep must return nothing.

- [ ] **Step 2: Resolve `contactName`**

`contactName` is in `DEFAULT_INPUT` and `QuotationInput`, has no control anywhere, and is never set. Check whether `print.ts` or the mailto body reads it:

```bash
grep -rn "contactName" app/ lib/
```

If nothing reads it, delete it from both `QuotationInput` and `DEFAULT_INPUT`. If something does, add an input for it beside the other identity fields. Do not leave it as it is. This is the one permitted edit to `quotation.ts`.

- [ ] **Step 3: Confirm the fetch allowlist is unchanged**

```
pnpm exec vitest run lib/__tests__/homepage-facts.test.ts
```

All network calls must still originate in `lib/speaking/use-quotation-assist.ts`. The homepage claims calculations stay client-side and that claim is tested — if this fails, a `fetch` has leaked into a new module and must move back.

- [ ] **Step 4: Update the operating notes**

In `docs/speaker-quotation.md`:

- Describe the three states and what puts a visitor in each.
- Record that `ANTHROPIC_API_KEY` now decides whether the page opens on the prose box or the full form — it is no longer only "two buttons return a clear error".
- Record the `sft-speaker-quotation` localStorage key, what it holds, and that reset clears it.
- Record the new `assumptions: { field, note }[]` shape and that `questions` is gone.
- Record the rate limit change from 5 to 10 per minute.

- [ ] **Step 5: Full verification**

```
pnpm exec vitest run
pnpm build
pnpm exec eslint app/tools/speaker-quotation/ app/api/speaking/ lib/speaking/
```

All suites green. Build clean. No lint errors in those paths (the five pre-existing errors elsewhere remain and are not yours).

Then walk every row of this table in `pnpm dev`:

| Check | Expected |
| --- | --- |
| Cold visit, key set | Opening |
| Cold visit, key unset | Full, silently |
| Skip link | Full |
| Paste a description | Reading, number first |
| Correct an inferred answer | Note disappears, number moves |
| "show me every question" | Full, answers preserved |
| Same answers in Reading and Full | Identical total |
| Reload after answering | Reading, restored |
| Reset | Opening, storage cleared |
| Intake returns an error | Opening, text kept, skip link offered |
| Light and dark | Both correct |
| 375px wide | No sideways scroll |
| Export PDF, Send inquiry | Both still work |

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(speaker-quotation): retire the intake assistant and document the new intake"
```

---

## Definition of Done

1. All three states work, and the number is identical in Reading and Full for the same answers.
2. One definition of each control, rendered by both states; the registry guard test passes.
3. A missing `ANTHROPIC_API_KEY` opens the page in Full, silently.
4. Reload returns the organizer to their quote; reset clears it.
5. `intake-state.ts` is fully covered, including the field/registry guard.
6. `pnpm build` clean, all vitest suites green, no new lint errors.
7. `docs/speaker-quotation.md` updated.
8. `lib/speaking/quotation.ts`, `rate-card.ts`, `inclusions.ts` and their tests are unchanged apart from the `contactName` decision in Task 10.

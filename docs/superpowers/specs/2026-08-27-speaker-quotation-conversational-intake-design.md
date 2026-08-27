# Speaker Quotation — Conversational Intake

**Date:** 2026-08-27
**Status:** Approved in brainstorming, ready for implementation planning
**Touches:** `/tools/speaker-quotation` only. The pricing engine is not modified.

---

## 1. Why

The page is sent to people who have already emailed asking what it would cost to
book a speaking engagement. They are warm — they have decided they want the
engagement and are trying to find out the price and whether it can be approved.

Two things are wrong for that audience, and only those two. Completion is not
the problem, and neither is accuracy.

- **It is cold.** A friendly email exchange ends at a seventeen-field
  questionnaire. The form is written well, in a person's voice, and it still
  reads as an institution's intake form because that is the shape it has.
- **It is long for what they need.** Ten questions sit above the fold before
  `DetailSection` hides the remaining seven, and most of them do not move the
  number for any given event.

A literal chat UI — the shape this started as — fixes the first and makes the
second worse. Seventeen conversational turns are longer than seventeen fields,
because a form can be skimmed and a conversation cannot. It also fights the
tool's best feature: `budgetFit.levers` is a tweak-and-watch interface, and
linear chat is the worst possible shape for tweak-and-watch.

So: a conversational **front door** onto the existing form, not a chat.

---

## 2. Scope

**In:** a three-state `/tools/speaker-quotation`; a field registry so both
states render one definition of each control; `lib/speaking/intake-state.ts`;
a `{ field, note }` shape for intake assumptions; localStorage persistence of
answers; decomposition of `page.tsx`.

**Out, deliberately:**

- The pricing engine. `lib/speaking/quotation.ts`, `rate-card.ts`,
  `inclusions.ts` and their tests are untouched. This is an intake redesign.
- `QuotationSummary`, `AvailabilityPanel`, `print.ts`, the mailto body, the AI
  explain payload. All keep working against the same `input` and `quote`.
- The `why`/`impact` copy in `questions.ts`. It is the product and it is
  already good. It is re-presented, not rewritten.
- The five pre-existing `react-hooks/set-state-in-effect` lint errors elsewhere
  in the repo. Not ours; see §8 for why they are named here anyway.

---

## 3. Decisions taken during brainstorming — do not reopen

1. **Not a chat.** No message bubbles, no question-at-a-time turn taking. The
   warmth comes from the page opening as a *reply to their note* rather than as
   a form. See §1.

2. **The number comes before the corrections.** In the Reading state the quote
   renders first, then what was read, then what is missing. This audience wants
   a forwardable figure; making them earn it by finishing a form first is the
   thing being fixed.

3. **The set of follow-up questions is derived, never authored.** The model
   does not decide what is still missing. `materialBlanks()` re-quotes across
   each blank field's option range and measures the spread. A hand-typed
   priority list would drift from the rate card, which is the failure
   `questions.ts` already explicitly designs against ("the real figure from the
   rate card interpolated rather than typed").

4. **`questions` leaves the tool schema.** The model currently free-texts what
   is missing. Deriving it (decision 3) is strictly better, and `questions.ts`
   phrases every one of them better than the model will. One less failure mode,
   one less thing to validate, a slightly cheaper call.

5. **Persistence replaces a first-visit toggle.** The question "should Opening
   be the default always, or only on a first visit?" was asked and rejected as
   a false binary. This audience visits once; the only meaningful second visit
   is the organizer returning after their sponsor said "see if he can do it for
   ₱X", and that person wants *their own quote back*, not either blank state.
   See §8.

6. **Full remains reachable and complete.** Every question stays answerable in
   one scroll, on a stable URL. It is the escape hatch, the cold-path fallback,
   and the bookmark for the speaker checking his own rate.

---

## 4. Architecture — three states, one URL

A state machine in `page.tsx`. No routing, no navigation, one `quote` computed
the same way in all three.

### 4.1 Opening

The whole first screen. The standing paragraph that is already on the page
("I would rather you saw the arithmetic than a number I made up on a call…"),
then one large textarea and one button. Underneath, one quiet link:
*"I'd rather just answer the questions"* → Full.

Entered when there is no stored draft and the intake endpoint is available.

### 4.2 Reading

Rendered in this order:

1. **`QuotationSummary`**, unchanged.
2. **"Here's what I read from your note"** — every `read` and `assumed` field,
   rendered as its *live control*, already set. An `assumed` field carries its
   one-line note and reads as provisional; a `read` field is set and quiet.
   Corrections happen in place and the number moves with them.
3. **"These would change the number"** — `materialBlanks()`, typically three or
   four fields, each wrapped in its existing `RateFactorField` so the "Why I
   ask" disclosure is one tap away.
4. **"The rest of the details"** — a `DetailSection` holding every remaining
   applicable field. All have working defaults and all are already answered on
   the quote above, which the summary line must keep saying.
5. **"Anything else I should know?"** — the prose box, shrunk to a single line.
   Re-reads and **merges** into existing answers. This is the one genuinely
   conversational element and it is nearly free: the merge is `applyDraft`,
   which already only overwrites fields the draft actually set.

Then the existing tail: availability, PDF export, "Send this inquiry",
`AiInsightsPanel`, `RelatedTools`.

### 4.3 Full

Today's page, unchanged in content: the three `Card`s and the `DetailSection`,
every field visible in one scroll. Reached from the Opening link, from a *"show
me every question"* control in Reading, and directly by URL.

### 4.4 State transitions

```
                  no stored draft          intake returns
   (arrive) ──────────────────────► Opening ──────────────► Reading
       │                               │                       │
       │ stored draft                  │ "just answer          │ "show me every
       │                               │  the questions"       │  question"
       ▼                               ▼                       ▼
    Reading ◄───────────────────────  Full  ◄──────────────────┘
   (restored)
```

Full never falls back to Opening. Once someone has chosen the form, they have
chosen it for that session.

---

## 5. The field registry — the defect this design would otherwise ship

All twenty-two controls are currently inline JSX inside `page.tsx`. Reading and
Full both need to render them. If they render separate copies they **will**
drift, and a sector select that differs between two states of the same page is
the worst bug available here — it produces two different prices.

So each control is defined once, and both states render:

```tsx
<QuotationFields ids={FieldId[]} input={...} set={...} quote={...} />
```

`components/quotation-fields.tsx` owns the map from `FieldId` to control. It
renders in the order given, each wrapped in `RateFactorField` with its
`QUESTIONS[id]` entry and its live impact chip, exactly as today.

Field ids, all twenty-two already named in `QUESTIONS`:

`organizerType`, `engagementType`, `format`, `sessions`, `complexity`,
`facilitationScope`, `preparation`, `output`, `startDate`, `region`,
`returningClient`, `ticketed`, `participantFee`, `expectedPaidAttendees`,
`budget`, `audienceSize`, `audienceProfile`, `earlyStart`, `travelCovered`,
`accommodationCovered`, `invoiceRequired`, `addOns`.

The free-text identity fields — `eventTitle`, `organizationName`, `venue` — are
not priced and are not part of the registry; they stay in the details group.
(`contactName` is in `DEFAULT_INPUT` and `QuotationInput` but has no control and
is never set. Delete it or wire it; do not leave it.)

---

## 6. `lib/speaking/intake-state.ts` — new, pure, no JSX

Three functions. Everything the three buckets depend on is computable and
therefore testable without a DOM.

### 6.1 `visibleFieldIds(input): FieldId[]`

Which fields apply at all. This logic exists today as `isFacilitation &&`,
`isTeamBuilding`, `input.ticketed &&` and `isRemote` conditionals scattered
through the JSX; extracting it is what makes the id lists computable in the
first place.

Rules, unchanged in behaviour from today's page:

- `facilitationScope`, `preparation`, `output` — facilitation only.
- `complexity` — speaking only.
- `audienceProfile` — hidden for team building.
- `participantFee`, `expectedPaidAttendees` — only when `ticketed`.
- `earlyStart`, `travelCovered`, `accommodationCovered` — hidden when the chosen
  format is remote (`page.tsx:941`).
- `region` stays **visible but disabled** for a remote format, with the
  existing "Online — no travel" note (`page.tsx:733`, `:751`). It is not
  hidden. `visibleFieldIds` returns it; the control's own `disabled` prop
  handles the rest. A remote format must never surface `region` as a blank
  worth asking about — `materialBlanks` excludes disabled fields.

### 6.2 `fieldProvenance(draft, edits): Record<FieldId, Status>`

`Status` is `read | assumed | blank | edited`.

- **read** — present in the draft, absent from `assumptions`.
- **assumed** — present in the draft *and* named in `assumptions`. Shows its
  note; reads as provisional.
- **blank** — absent from the draft.
- **edited** — the organizer has since changed it. The note drops away.

`edits` is a `Set<FieldId>` maintained by `page.tsx`'s `set()` callback.

Today `applyDraft` merges the draft into `form` and then calls
`intake.dismiss()`, discarding it. **The draft must be retained in state** for
any of this to work. That is the single most important code change in §9.

### 6.3 `materialBlanks(input, blanks): FieldId[]`

For each blank field, re-quote across its option range and measure the spread
in `quote.total`. Fields whose spread clears the threshold are surfaced; the
rest fall through to the details group.

- **Threshold:** the greater of 5% of the current total and ₱5,000. Both
  constants live in this module, named, with a comment saying what they are for.
- **Ordering:** by spread, descending. The biggest lever is asked first.
- **Cap:** at most five. Past that the section stops being short, which is the
  point of it.
- **Cost:** memoized on `input` alongside `quote`. This is not a new pattern —
  `budgetFit.levers` already re-quotes once per lever to price each concession,
  so the cost is known-affordable at this option-list size.
- **Continuous fields** (`sessions`, `audienceSize`, `participantFee`,
  `budget`) have no option list. Probe them at the band boundaries the rate
  card already defines (`AUDIENCE_BANDS`, and 1–3 for sessions); `budget` is
  never surfaced by this function, since a blank budget is an answer.

---

## 7. API change — `app/api/speaking/intake/route.ts`

### 7.1 `assumptions` becomes `{ field, note }[]`

Today it is `string[]`: free text, attached to nothing, which is why it can
only be printed as a bullet list. To render an assumption *beside the control
it is about*, it needs the field id.

```ts
assumptions: {
  type: "array",
  items: {
    type: "object",
    properties: {
      field: { type: "string", enum: FIELD_IDS },
      note:  { type: "string" },
    },
    required: ["field", "note"],
  },
}
```

Mirrored in `draftSchema` as `z.array(z.object({ field: z.enum(FIELD_IDS), note: z.string().max(300) })).max(12).default([])`.

The existing principle holds and must stay in the comment: the tool schema is a
request to the model, not a guarantee from it, so zod re-validates regardless.
An assumption naming a field the draft did not set is dropped.

`FIELD_IDS` is exported from `intake-state.ts` and imported here, so the enum
cannot drift from the registry.

### 7.2 `questions` is removed

From the tool schema, from `draftSchema`, from `IntakeDraft`, and from the
system prompt's instructions. See decision 4.

### 7.3 Rate limit

`new RateLimiter(5, 60_000)` is too tight once "anything else?" spends from the
same budget — an organizer correcting themselves twice hits it. Raise to
**10 per 60s**, and when it trips, say so in a way that points at the answers:
*"I'll stop re-reading for a minute — you can edit any answer directly below."*
Never a bare 429.

---

## 8. Persistence

`localStorage`, key `sft-speaker-quotation`, holding the form state, the chosen
date, the retained draft and the `edits` set.

- **No stored answers → Opening.**
- **Stored answers → Reading, restored.** They land on their number with their
  answers under it. This is the returning-sponsor case from decision 5, and it
  fixes something the page handles badly today regardless of this redesign:
  coming back currently means retyping seventeen answers.
- The existing reset button (`handleReset`) **must clear the key**.
- One line on the page says the answers are kept in their browser. Nothing is
  transmitted; that is already true and should stay easy to verify.

**Implementation note, not cosmetic.** `compliance-checklist` and
`fundraising-guide` persist to localStorage with a read-in-`useEffect`-then-
`setState` pattern, and that pattern is precisely what produces three of the
five `react-hooks/set-state-in-effect` errors that make `pnpm lint` fail today.
Do not add a sixth. `page.tsx` already imports `useSyncExternalStore` and uses
it correctly for `today`; read localStorage the same way, with a server
snapshot of `null` so the first paint is deterministic.

---

## 9. Decomposition of `page.tsx`

1,193 lines today, and this change adds to it. Target shape:

| File | Holds |
| --- | --- |
| `page.tsx` | `form`, `chosenDate`, `draft`, `edits`, phase; the phase switch; the shared tail. ~250 lines. |
| `components/opening-panel.tsx` | The front door. |
| `components/reading-panel.tsx` | The three buckets + the "anything else?" line. |
| `components/full-form.tsx` | Today's three `Card`s **and** its `DetailSection`, moved verbatim. The identity fields (§5) live in that `DetailSection` today and stay there. |
| `components/quotation-fields.tsx` | The registry (§5). |
| `lib/speaking/intake-state.ts` | The three pure functions (§6). |

`IntakeAssistant` is superseded — `opening-panel` and the "anything else?" line
replace it. Delete it rather than leaving it orphaned.

All `fetch` stays in `use-quotation-assist.ts`, so the fetch allowlist pinned by
`lib/__tests__/homepage-facts.test.ts` does not change. Verify this rather than
assume it; the homepage claims calculations stay client-side and that claim is
tested.

---

## 10. Degradation

| Condition | Behaviour |
| --- | --- |
| `ANTHROPIC_API_KEY` unset | Page opens in **Full**. No Opening state, no error, no dead button. The flag is resolved server-side and passed to the client component as a prop — it must not be inferred from a failed call. |
| Intake call fails or times out | Stay in Opening, show the error inline, keep the typed text, offer the Full link. Never lose what they wrote. |
| Rate limit tripped | §7.3. |
| Model returns an empty draft | Treat as "read nothing": go to Reading with every applicable field blank, which degrades to a short form ordered by price impact. Still better than Opening's dead end. |
| localStorage unavailable | Everything works, nothing persists. Wrap reads and writes. |

**Known cost, accepted:** a crawler currently finds a form full of content at
this URL and would find one textarea. `layout.tsx` metadata still carries the
SEO. Noted so it is a decision rather than a discovery.

---

## 11. Tests

House style: no jsdom, no Testing Library. Every test here is a pure data
assertion, matching `quotation.test.ts` and `rate-card.test.ts`.

`lib/speaking/__tests__/intake-state.test.ts`:

- `visibleFieldIds` — facilitation shows scope/preparation/output and hides
  complexity; team building hides `audienceProfile`; `ticketed` gates the two
  revenue fields; a remote format hides region and both logistics switches.
- `fieldProvenance` — the four statuses; an assumption naming a field the draft
  did not set is dropped; an edit clears `assumed`.
- `materialBlanks` — a blank `organizerType` always surfaces (it is the largest
  lever on the rate card); `earlyStart` alone never does; the cap holds at five;
  ordering is by spread descending; `budget` is never returned.
- **A guard that every `FieldId` has a `QUESTIONS` entry and a registry
  renderer**, and vice versa. Without it a field added to the rate card
  compiles, builds, passes everything, and silently never renders — the same
  gap the ecosystem-banner follow-up in the project memory describes.

Existing suites must stay green untouched. If `quotation.test.ts` or
`rate-card.test.ts` needs an edit, the change has left its scope — stop.

---

## 12. Verification

- `pnpm exec vitest run` — all suites. **Not** `pnpm test`, which is bare
  `vitest` and drops into watch mode in an interactive terminal.
- `pnpm build` — the reliable gate. The route count must not drop.
- `pnpm exec eslint` scoped to the edited files only. Repo-wide lint fails
  today on five pre-existing errors; scope to know whether this change added
  one.
- Look at the page in both themes, and on a phone width. There are no rendering
  tests in this repo and there should not be new ones as a side effect of this
  work.
- Walk the three states by hand, including: unset key → Full; a paste that
  returns nothing; a correction that changes the price; reload mid-quote →
  Reading restored; reset → Opening.

There are no GitHub Actions on this repo. The local gates above are the gate.

---

## 13. Definition of done

1. All three states work, and the number is identical in Reading and Full for
   the same answers.
2. One definition of each control, rendered by both states.
3. A missing `ANTHROPIC_API_KEY` opens the page in Full, silently.
4. Reload returns the organizer to their quote; reset clears it.
5. `intake-state.ts` is fully covered, including the field/registry guard.
6. `pnpm build` clean, all vitest suites green, no new lint errors.
7. `docs/speaker-quotation.md` updated: the three states, the persistence key
   and what clears it, the new `assumptions` shape, and the raised rate limit.

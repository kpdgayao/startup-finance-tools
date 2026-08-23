# Speaker Quotation — operating notes

The tool at `/tools/speaker-quotation` lets an event organiser cost an
engagement themselves, against a published rate card, with every factor shown
as its own line. This file covers the parts you maintain.

## Environment variables

| Variable | Required | What it does |
| --- | --- | --- |
| `SPEAKER_CALENDAR_ICS_URL` | No | Private iCal feed used for the calendar check. Without it the check falls back to the manual blackout list and says so on the page. |
| `ANTHROPIC_API_KEY` | No | Powers the optional "fill in the form for me" step and the AI explanation. Without it the form still works; those two buttons return a clear error. |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-haiku-4-5-20251001`. |

### Getting the calendar URL

In Google Calendar: **Settings → [your calendar] → Integrate calendar → Secret
address in iCal format.** Copy that URL into `SPEAKER_CALENDAR_ICS_URL`.

Treat it as a credential. Anyone holding it can read the whole calendar,
including event titles. Rotate it from the same screen if it leaks.

**What the app exposes is narrower than what the feed contains.** The parser in
`lib/speaking/ics.ts` reads only `DTSTART`, `DTEND`, `STATUS`, `TRANSP` and
`RRULE`. It never reads a summary, description, location or attendee, and the
API returns dates and statuses only. An organiser learns that a date is taken,
never what it is taken by. Keep it that way if you extend it.

Other behaviour worth knowing:

- The feed is cached for 10 minutes, so a booking you add shows up within that.
- If the feed is unreachable, the last good copy is served; if there is no copy,
  the page degrades to the manual list and tells the organiser to confirm by
  email. It never claims a date is free because the fetch failed.
- Events marked cancelled, or marked "free" (`TRANSP:TRANSPARENT`), do not block.
- Daily and weekly recurrences expand up to 400 days. Monthly and yearly rules
  only block their first occurrence.

## Holding dates by hand

`BLACKOUT_DATES` in `lib/speaking/availability.ts` holds dates that are not on
the calendar. Reasons stay on the server and never reach the browser.

```ts
export const BLACKOUT_DATES: BlackoutEntry[] = [
  { from: "2026-11-12", to: "2026-11-14", reason: "SLU graduate term start" },
  { from: "2026-12-20", to: "2027-01-04", reason: "Holidays", tentative: true },
];
```

`tentative: true` means "worth asking" rather than "committed".

## Philippine holidays

`PH_HOLIDAYS` in the same file drives the 30% holiday premium. It carries 2026
and 2027 from the annual proclamations. **Extend it each year** — an expired map
silently stops applying the premium rather than failing loudly. Eid'l Fitr and
Eid'l Adha are not included, because they are proclaimed only weeks ahead.

## Changing the rate card

Everything lives in `lib/speaking/rate-card.ts`: the topic rate ladder, the
format day-equivalents, every multiplier, the add-ons and the regional travel
estimates. The form copy in `lib/speaking/questions.ts` interpolates those
numbers rather than restating them, so changing a rate updates the questions,
the quote, the printed PDF and the AI prompt together.
`lib/speaking/__tests__/rate-card.test.ts` fails if someone replaces an
interpolation with a typed literal.

### The topic rate ladder

There is no single day rate. `COMPLEXITY_TIERS` carries one per tier, because
what a day costs is decided by what has to happen before it:

| Tier | Day rate | What it means |
| --- | --- | --- |
| `routine` | ₱15,000 | Settled ground — bookkeeping, accounting, cash flow, pricing, valuation. |
| `tailored` | ₱18,000 | The same ground, rebuilt around one industry's cases and figures. |
| `applied` | ₱21,000 | A new programme, still within finance and accounting. |
| `frontier` | ₱24,000 | Needs fresh research — AI and accounting, a standard that just changed. |

**Nothing in this ladder says "off the shelf", and it must not.** Every session
is adapted to the room: the examples, the figures and the exercises change even
when the subject does not. The cheapest tier means the SUBJECT is settled, not
that the delivery is generic. An earlier draft said "already in the catalogue,
delivered as it stands" — untrue, and it told a paying organiser they were
booking a canned talk. A test in `lib/speaking/__tests__/quotation.test.ts`
fails on that vocabulary reappearing, on the tier copy or on the quote itself.

The tier is deliberately understated in the output: it appears once, as a short
clause on the fee's base line, and nowhere in the printed quotation's header.
Classifying a client's own subject more prominently than that reads as a verdict
on it rather than an explanation of the price.

### Engagement types

The tool covers three kinds of work, chosen first on the form, because they are
not variations on one service:

| Type | Day rate from | Notes |
| --- | --- | --- |
| Talk, workshop or training | `COMPLEXITY_TIERS`, ₱15,000–₱24,000 | Priced by how much new ground the subject covers |
| Planning facilitation | `FACILITATION_SCOPES`, ₱25,000–₱30,000 | Above every speaking tier — bespoke by definition, nothing reusable |
| Team building | `TEAM_BUILDING_DAY_RATE`, ₱22,000 | Inside the speaking range: above a settled subject, below the research tier |

`ENGAGEMENT_FORMATS` are tagged with the types they belong to, so a keynote is
never offered for a board retreat, and carry `altLabels` so the same full day
reads as a "workshop", a "session" or a "programme" depending on the type.

Facilitation adds two lines nothing else has — `PREPARATION_OPTIONS` (interviews
and document review before) and `OUTPUT_OPTIONS` (what gets written after) —
billed as desk days at `DESK_DAY_FACTOR` (70%) of the room rate. That factor is
the point: time in the room is the premium, but a day of writing up a plan is
not free either, and folding it into "the day" is how half a planning
engagement ends up unpaid. A facilitation quote with neither raises a flag.

The audience-composition factor is skipped entirely for team building: those
profiles describe how much finance the room already knows, which changes how a
session on cash flow is built and changes nothing about running a day of
activities.

### Audience composition

`AUDIENCE_PROFILES` prices WHO is in the room, separately from `AUDIENCE_BANDS`,
which prices how many. They are different costs: size is logistics — materials,
breakout support, marking — while composition is content. Teaching cash flow to
the people who prepare the statements is a different build from teaching it to
the people who only ever see the summary, and a room holding both has to be
pitched twice.

| Profile | Factor |
| --- | --- |
| Students, or staff and managers without a finance background | none |
| Finance, accounting or audit practitioners | +10% |
| A mixed room | +10% |
| Owners, executives or board members | +15% |

Kept gentle and neutral for the two commonest rooms, so a quote does not read as
a stack of surcharges. Justify it as preparation — what the material has to hold
up to — never as a judgement about the people attending; there is a test for
that too, because this copy is read by the organiser and sometimes by the
audience itself.

The two ends are the real anchors; the middle two interpolate so an engagement
that is neither pure delivery nor a research project need not round to whichever
end is nearer.

Three floors, checked in this order:

- `MINIMUM_ENGAGEMENT_FEE` (₱10,000) — before concessions, so they apply to the
  whole fee. Must stay below `DAY_RATE_MIN`, or every format on a core subject
  prices identically and the format dropdown stops meaning anything.
- `MISSION_FLOOR_DAY_RATE` (₱12,000/day) — the concessionary rate cannot go
  below this per day. Expressed as a day rate, so on short formats it does not
  bind.
- `ABSOLUTE_MINIMUM_FEE` (₱8,000) — last, after every concession has compounded.
  This one exists because the mission floor is a day rate: mission plus
  returning-client took a 0.4-day panel to ₱7,600 while the card promised no
  lower than ₱8,000. It is the answer to "how low can this possibly go".

Concessions themselves are the 20% mission rate and the 5%
`RETURNING_CLIENT_DISCOUNT`, which is a real saving rather than a loyalty
gimmick — the discovery is already done, so the preparation genuinely costs
less. Small on purpose: a large returning-client discount only says the first
quote was padded.

**The tier prices the subject, not the audience or the buyer.** Bookkeeping for
non-accountants is `routine` even when the deck is written from scratch, because
the subject is standard. The gap between that and a lowball offer comes from
counting two days honestly, not from reclassifying a basic subject as difficult.

The order the factors apply in is fixed and documented at the top of
`lib/speaking/quotation.ts`. Reordering the steps changes the number.

## How the price is built

1. Base fee — the topic's day rate × day-equivalents for the format and session
   count. The tier is named on this line rather than charged as a premium.
2. Multipliers — audience size, weekend/holiday, notice, organiser type. Each is
   listed on the quote even when it changes nothing.
3. Minimum engagement fee (₱10,000), before concessions.
4. Add-ons — percentages read the pre-add-on fee; flat amounts are added after.
5. Travel days at half the topic's day rate.
6. Mission concession of 20%, floored at ₱12,000/day.
7. Revenue-share floor — for ticketed events, 15% of projected gross gate,
   capped at twice the rate-card fee. It can only raise the fee.
8. Reimbursables — transport, accommodation and per diem, shown at zero when
   the organiser arranges them directly, with the estimate still visible.

Withholding tax is displayed for transparency and is not deducted: it is the
organiser's obligation to remit.

## Invoicing

An organiser who needs a formal invoice gets one from `INVOICING_ENTITY` in the
rate card. **This does not change the professional fee** — issuing a proper
invoice is not extra work worth charging for. What it changes is the tax
presentation:

- **Withholding basis.** Billed personally it is the individual professional
  rate (10%, or 5% with a sworn declaration on file). Billed by the firm it is
  the corporate rate — the quote uses 2%, the contractor rate a training
  provider is ordinarily withheld at, and says on its face that a payor
  classifying the billing as professional fees of a juridical entity withholds
  10% instead. The organiser's own classification governs.
- **VAT.** The firm is below the ₱3M threshold, so `vatRegistered` is `false`
  and no VAT is added. If it registers, flip that one constant: VAT then
  appears as its own line and the total changes on every quote.
- **Percentage tax.** A non-VAT entity bears 3% on gross receipts. It is the
  firm's cost, not the organiser's, so `quote.invoicing.percentageTax` is
  computed for working out net take-home but deliberately never rendered on the
  organiser's quote. It is also NOT built into the day rates — if you decide to
  stay whole by passing it on, gross up the rate ladder rather than adding a
  surcharge line an organiser will read as a tax they are being charged.

A quote for a corporate, association, government or academic organiser that
does *not* request an invoice raises a flag, because those payors cannot
release funds without one and finding out afterwards is a delayed payment.

## Mobile

The tool is checked at 320, 375 and 390px. Two traps are worth knowing about,
because both are invisible to a naive overflow check:

- **`#main-content` is its own scroll container** (`overflow-auto` in
  `app/tools/layout.tsx`). Content wider than the viewport therefore scrolls
  *main* rather than the document, so `document.scrollWidth` stays clean while
  the page slides sideways. Any overflow audit has to measure
  `main.scrollWidth - main.clientWidth` as well.
- **shadcn's `SelectTrigger` is `w-fit`.** Radix mirrors the selected item's
  markup into the trigger, so a long option label stretches it without limit —
  one measured 805px on a 375px phone. Every trigger here passes `w-full` and an
  explicit `<SelectValue>{label}</SelectValue>`, and the option's explanation
  lives in a wrapping second line inside the dropdown rather than in the trigger.

## What the tool does not do

- It does not book anything. Availability is confirmed by email.
- It does not store enquiries. "Send this enquiry" opens the organiser's own
  mail client with the quote summary prefilled, matching how `/contact` works.
- The quote arithmetic runs entirely in the browser. Only the calendar check and
  the optional AI draft reach the server, which is why
  `lib/__tests__/homepage-facts.test.ts` still passes with the homepage's
  "calculations stay in your browser" claim intact.

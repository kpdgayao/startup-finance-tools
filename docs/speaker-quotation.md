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
| `routine` | ₱15,000 | Core catalogue — basic accounting, bookkeeping, cash flow, pricing, valuation. Taught many times. |
| `tailored` | ₱18,000 | The same ground, rebuilt around one industry's figures. |
| `applied` | ₱21,000 | New curriculum, still inside core expertise. |
| `frontier` | ₱24,000 | Beyond it — AI and accounting, a standard that just changed. Days of reading before anything can be taught. |

The two ends are the real anchors; the middle two interpolate so an engagement
that is neither pure delivery nor a research project need not round to whichever
end is nearer.

Two floors are derived from `DAY_RATE_MIN` and must stay below it:
`MISSION_FLOOR_DAY_RATE` (₱12,000, exactly the routine rate less the 20%
concession) and `MINIMUM_ENGAGEMENT_FEE` (₱10,000). If the minimum ever reaches
the routine rate, every format on a core topic prices identically and the format
dropdown stops meaning anything — there is a test for it.

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

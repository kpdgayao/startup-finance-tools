# Speaker Quotation — operating notes

The tool at `/tools/speaker-quotation` lets an event organizer cost an
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
API returns dates and statuses only. An organizer learns that a date is taken,
never what it is taken by. Keep it that way if you extend it.

Other behavior worth knowing:

- The feed is cached for 10 minutes, so a booking you add shows up within that.
- If the feed is unreachable, the last good copy is served; if there is no copy,
  the page degrades to the manual list and tells the organizer to confirm by
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

### Sector rates

`ORGANIZER_TYPES` carries a `rateMultiplier` that scales the ladders below into
each sector's own rate. It is a rate, not a surcharge, and the distinction is
the whole point: it replaced a 15% corporate premium that could not reach the
corporate market and priced a two-day corporate workshop at ₱41,000 — roughly
what one in-house session costs at the very bottom of the range, for two days
of work.

| Sector | × | Day rate, settled subject | Basis |
| --- | --- | --- | --- |
| Government, LGU, SUC | 1.0 | ₱15,000 | DBM BC 2007-1 caps a resource person near ₱21,000/day, so this is a ceiling rather than a discount |
| Mission (before the −20%) | 1.0 | ₱15,000 | The public rate |
| Private school or university | 1.6 | ₱24,000 | A training budget, but not a corporate one |
| Cooperative or federation | 2.0 | ₱30,000 | RA 9520 reserves up to 10% of net surplus for the education and training fund, half spent by the co-op itself — a statutory budget, but members' money rather than profit |

| Association, ticketed conference | 2.5 | ₱38,000 | Sells seats, rarely on a corporate training budget |
| Company or corporate | 3.2 | ₱48,000 | PH in-house training runs ₱40,000–280,000 a session, ₱100,000–500,000 for two days |

**Facilitated work is scaled separately**, by `facilitationMultiplier` rather
than `rateMultiplier`. The split is teaching versus facilitated room work, not
"facilitation versus everything else": a planning session AND a team-building
day both use it, because what they sell is a facilitator's time rather than a
subject taught, and that market does not widen between sectors nearly as far as
a training budget does.

Facilitation also had only international comparables (roughly ₱70,000–440,000 a
day), and scaling it by the speaking multiplier imported that range wholesale: a
corporate planning day came out at ₱90,000, above any observed Philippine
training day, on no Philippine evidence at all.

| Sector | × | Planning day, whole organization | Team-building day |
| --- | --- | --- | --- |
| Government, LGU, SUC, mission | 1.0 | ₱28,000 | ₱22,000 |
| Private school or university | 1.4 | ₱39,000 | ₱31,000 |
| Cooperative or federation | 1.6 | ₱45,000 | ₱35,000 |
| Association, ticketed conference | 1.9 | ₱53,000 | ₱42,000 |
| Company or corporate | 2.5 | ₱70,000 | ₱55,000 |

Team building on the SPEAKING multiplier is the thing to resist: it reached
₱70,000 for a corporate day, which is above a corporate one-team planning day at
₱63,000 and so contradicts the rate card's own account of what team building is.
On the facilitation multiplier the whole ladder holds in every sector —
settled subject < team building < research subject, and team building < every
facilitation scope — which `rate-card.test.ts` now asserts sector by sector. The
₱55,000 corporate day is also better supported: Philippine team-building
providers quote from about ₱40,000 for a half-day package and from ₱60,000 for a
full facilitation with their own delivery team, so a solo facilitation-only day
belongs at the lower end of that, not the top.

One consequence worth knowing before someone "fixes" it: facilitation is above
every speaking tier at the PUBLIC rate, but no longer at the corporate one — a
corporate research-heavy teaching day is ₱77,000 against a ₱70,000 corporate
planning day. That is the intended result of pricing two markets separately, and
`rate-card.test.ts` asserts that ordering at the public rate only.

`sectorMultiplier(organizer, type)` is the one place that decides which
multiplier applies; every surface resolves it through there rather than reaching
for a field, so the two ladders cannot disagree on one screen.

### The honorarium ceiling

`HONORARIUM_DAY_CEILING` (₱21,000) is what DBM BC 2007-1 allows a public body to
pay a resource person per day — twice the hourly rate of the pegged salary
grade, for delivery hours plus equal preparation hours, which is ₱18,700–21,200
at SG-24 to SG-25 on the 2026 table.

The card deliberately quotes above it in two places: the top of the subject
ladder (₱24,000) and all of facilitation (₱25,000 and up). That is defensible —
work at that level is procured as a service or consultancy contract rather than
paid as an honorarium — but it is a **different rule, not an exemption**, so a
public-sector quote above the ceiling raises a flag saying exactly that. A
procurement officer who discovers the mismatch after the fact loses weeks, not
pesos. The comparison uses the concessionary rate for mission organizers, since
they are never asked for the list rate.

Which tiers the circular governs is its own field, `honorariumRules`, rather
than an inference from `sectorLabel`. The engine used to decide it by matching
that label's text, so renaming a display string would have silently switched off
a flag a procurement officer depends on; a new tier now has to answer the
question rather than inherit an answer.

Researched August 2026 against the DBM circular and the 2026 salary table
(firm), Philippine corporate training price guides (reasonably firm), and the
widely cited PAPS speaker range of ₱15,000–120,000 (softer — no primary
schedule was reachable). Tests in `rate-card.test.ts` pin the sectors to those
benchmarks: a corporate day may not undercut the ₱40,000 session floor, the
ordering public < academic < cooperative < association < corporate must hold,
and no sector may fall below the public rate.

One cooperative rate cannot fit a sector running from a village store to a
multi-billion-peso bank, and pretending otherwise loses the small co-ops
silently. A cooperative quote therefore carries a flag saying so, pointing large
cooperative banks and federations at the corporate rate and inviting a small
primary co-op to say so rather than walk away.

Derived rates round to the nearest ₱1,000. A quote that opens with "₱76,800 a
day" invites arithmetic; ₱77,000 invites a decision.

The sector does NOT appear as its own factor line — it is named on the fee's
base line beside the rate it produced. A ratio printed on the quote is a ratio
the reader negotiates against; the rate is the thing to discuss.

### The topic rate ladder

There is no single day rate. `COMPLEXITY_TIERS` carries one per tier, because
what a day costs is decided by what has to happen before it:

| Tier | Day rate | What it means |
| --- | --- | --- |
| `routine` | ₱15,000 | Settled ground — bookkeeping, accounting, cash flow, pricing, valuation. |
| `tailored` | ₱18,000 | The same ground, rebuilt around one industry's cases and figures. |
| `applied` | ₱21,000 | A new program, still within finance and accounting. |
| `frontier` | ₱24,000 | Needs fresh research — AI and accounting, a standard that just changed. |

**Nothing in this ladder says "off the shelf", and it must not.** Every session
is adapted to the room: the examples, the figures and the exercises change even
when the subject does not. The cheapest tier means the SUBJECT is settled, not
that the delivery is generic. An earlier draft said "already in the catalogue,
delivered as it stands" — untrue, and it told a paying organizer they were
booking a canned talk. A test in `lib/speaking/__tests__/quotation.test.ts`
fails on that vocabulary reappearing, on the tier copy or on the quote itself.

The tier is deliberately understated in the output. Since sector pricing landed
it no longer appears on the quote at all — the base line names the *sector* that
set the rate, because that is what explains why this reader's number differs
from someone else's. The tier still reaches the AI explanation through
`quote.topicTier`, where there is room to explain it. Classifying a client's own
subject on the face of their quote reads as a verdict on it rather than an
explanation of the price.

### Engagement types

The tool covers three kinds of work, chosen first on the form, because they are
not variations on one service:

| Type | Day rate from | Notes |
| --- | --- | --- |
| Talk, workshop or training | `COMPLEXITY_TIERS`, ₱15,000–₱24,000 | Priced by how much new ground the subject covers |
| Planning facilitation | `FACILITATION_SCOPES`, ₱25,000–₱30,000 | Above every speaking tier at the public rate — bespoke by definition, nothing reusable. Scaled by `facilitationMultiplier` |
| Team building | `TEAM_BUILDING_DAY_RATE`, ₱22,000 | Inside the speaking range: above a settled subject, below the research tier. Scaled by `facilitationMultiplier` — it sells a facilitator's day, not a subject |

`ENGAGEMENT_FORMATS` are tagged with the types they belong to, so a keynote is
never offered for a board retreat, and carry `altLabels` so the same full day
reads as a "workshop", a "session" or a "program" depending on the type.

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
that too, because this copy is read by the organizer and sometimes by the
audience itself.

The two ends are the real anchors; the middle two interpolate so an engagement
that is neither pure delivery nor a research project need not round to whichever
end is nearer.

**The facilitation ladder is the least evidenced part of this card.** Its
corporate rate (about ₱90,000/day) is extrapolated from international
facilitation rates of roughly ₱70,000–440,000 a day; no reliable Philippine
figure was found. Treat it as a hypothesis to test against real enquiries. It
also sits above the ~₱21,000 DBM honorarium ceiling even at the public rate, on
the basis that planning work is normally procured as a consultancy contract
rather than paid as a resource-person honorarium — a different rule, not an
exemption from that one.

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
2. Multipliers — audience size, weekend/holiday, notice. Each is listed on the
   quote even when it changes nothing. The organizer's sector is NOT here; it
   scaled the day rate in step 1.
3. Minimum engagement fee (₱10,000), before concessions.
4. Add-ons — percentages read the pre-add-on fee; flat amounts are added after.
5. Travel time at `TRAVEL_DAY_FEE` per travel day — see below.
6. Mission concession of 20%, floored at ₱12,000/day.
7. Revenue-share floor — for ticketed events, 15% of projected gross registration revenue,
   capped at twice the rate-card fee. It can only raise the fee.
8. Reimbursables — transport, accommodation and per diem, shown at zero when
   the organizer arranges them directly, with the estimate still visible.

Withholding tax is displayed for transparency and is not deducted: it is the
organizer's obligation to remit.

### Travel time

`TRAVEL_DAY_FEE` is FLAT: the same figure for every client, in every sector, on
every subject. It is derived as half of the lowest day rate on the card.

It used to be half of the CLIENT'S day rate, and that was wrong twice over.
There is no answer to an organizer who asks why the identical bus ride to Manila
is worth ₱29,000 from a company and ₱7,500 from a government agency — it is the
same journey. And on a one-day corporate booking it made travel a third of the
whole professional fee, which is a shocking thing to meet on a quote before any
work has happened, and the single line most likely to lose a booking.

Half of the LOWEST day rate is the deliberate anchor. What a travel day costs is
a working day that cannot be sold, and the realistic alternative use of a random
Tuesday is ordinary work, not a guaranteed corporate booking. Pricing it off the
top of the ladder assumed the opposite.

Worth knowing about the wider practice: most professional speakers do not
itemize travel time at all. The norm is one fee that already includes it, plus
expenses — or a flat travel buyout agreed in advance, which is what the larger
bureaus now push because it gives the planner budget certainty. Itemising is
still right for this tool, whose whole argument is that the reader can check
every line, and it is what lets the budget panel show that going online removes
the whole thing. What was wrong was the amount and what it was derived from.

`travelDays` per region is what carries how far the journey actually is, and it
is the only thing left that does once the fee is flat. Visayas and Mindanao is
1.5, not 1: Baguio is not an airport city, so reaching a venue there is a road
trip to Manila or Clark, a flight, and a transfer at the far end — a whole day
gone before the engagement and most of another getting back. It sat at 1 while
travel was billed at half the client's day rate, where the figure was large
enough that under-counting the days did not show.

The line is labelled "Travel time", not "One travel day": a day on a quote reads
as a day being sold, and what is being compensated is time lost. Its detail says
the rate is flat and that the fare and the hotel are billed separately, because
billing the journey here as well as in the reimbursables would be billing twice.

## Organizers who already have a budget

The form asks for a budget, optionally, and it is the last question in its card
on purpose: asking before the rate card has explained itself reads as "how much
have you got", asking after reads as "tell me what to build for what you have".

**The budget enters no calculation.** `buildQuotation` prices the engagement
first and only then compares it (`assessBudget`), so the same two days of work
cost the same whatever the organizer said they had. Anything else would make
the rate card decorative and would punish the organizer who answered honestly.
The quotation reference deliberately excludes the budget from its seed for the
same reason: two quotes differing only in a stated budget are the same quote.

What it produces instead is a list of **levers** — changes to what is being
bought, each priced by re-running the engine with that one change made, so the
saving shown is exactly what the form will produce if the organizer pulls it:
booking the logistics themselves, dropping the extras, a day fewer, a shorter
format, delivering it online, skipping the facilitation groundwork or the
write-up, or moving to a plain weekday 30 days out. Levers carry a `slot`;
where two rewrite the same field (a shorter format and an online one both do)
the combined floor counts only the better of them, and the floor itself is
priced as one real variant rather than summed, because the levers interact — a
day fewer is also a hotel night fewer.

The principle to keep, in the copy and in the engine: **scope to the budget,
never discount to it.** If nothing reaches the figure, the panel says so.

## Invoicing

An organizer who needs a formal invoice gets one from `INVOICING_ENTITY` in the
rate card. **This does not change the professional fee** — issuing a proper
invoice is not extra work worth charging for. What it changes is the tax
presentation:

- **Withholding basis.** Billed personally it is the individual professional
  rate (10%, or 5% with a sworn declaration on file). Billed by the firm it is
  the corporate rate — the quote uses 2%, the contractor rate a training
  provider is ordinarily withheld at, and says on its face that a payor
  classifying the billing as professional fees of a juridical entity withholds
  10% instead. The organizer's own classification governs.
- **VAT.** The firm is below the ₱3M threshold, so `vatRegistered` is `false`
  and no VAT is added. If it registers, flip that one constant: VAT then
  appears as its own line and the total changes on every quote.
- **Percentage tax.** A non-VAT entity bears 3% on gross receipts. It is the
  firm's cost, not the organizer's, so `quote.invoicing.percentageTax` is
  computed for working out net take-home but deliberately never rendered on the
  organizer's quote. It is also NOT built into the day rates — if you decide to
  stay whole by passing it on, gross up the rate ladder rather than adding a
  surcharge line an organizer will read as a tax they are being charged.

A quote for any organizer outside the mission tier that does *not* request an
invoice raises a flag, because those payors cannot
release funds without one and finding out afterwards is a delayed payment.

## Saying what the organizer gets

The quotation spent its whole life explaining COST. Every line said why the
number is what it is; not one said what arrives. That is a strange document to
hand someone — it argues a price without describing the thing being priced —
and a reader with nothing else to go on concludes the only available thing,
which is that it is expensive.

`lib/speaking/inclusions.ts` builds the answer, and **nothing in it is
invented**. Every inclusion is read off a choice already on the rate card: the
format says what happens in the room ("6 to 8 hours, hands-on, materials and
facilitation included"), the subject tier says what gets rebuilt beforehand, the
add-ons say what was bought on top. All of it was already there and all of it
was buried — the format's promise of materials sat inside a dropdown that closes
the moment you choose from it. A test pins the one thing that would break this:
a keynote's own description mentions no materials, so the list must not claim
any.

It also renders **what is NOT included**, which is worth more than it looks. A
list of exclusions reads as confidence rather than meanness, and it settles on
paper the arguments that otherwise happen on the day, in front of participants,
about who was bringing the projector. The catch-all line is the useful one:
everything argued about on the day is something neither side thought to name.

### The comparison

`PUBLIC_COURSE_RATE_MIN`/`MAX` (₱2,500–15,000 per participant per day) is the
only outside number on the card. It is there because it is the comparison an
organizer is making anyway, whether or not the quote helps them make it: *for
this money, could I just send these people on a course?*

Three rules keep it honest:

1. **Compared against the bottom of the range, never the middle.** A claim that
   only holds against the dearest competitor is a sales trick.
2. **Only where something comparable is sold by the seat.** Workshops and online
   sessions, yes. A keynote, no — nobody sells seats to a 90-minute plenary by
   the head, and a per-seat comparison beside one is arithmetic with no
   referent. Facilitation, no — there is no open-enrollment strategic plan.
3. **It answers in both directions.** Below the break-even head count the panel
   says plainly that sending them on a public course is the better buy. That is
   the only reason the other direction is worth believing.

The break-even is computed by **re-pricing the engagement at each head count**,
not by dividing this quote's total. The total is not fixed — a bigger room
carries a bigger audience factor — so dividing the current one produced a
threshold the engine contradicted a sentence later: a 40-person quote claimed
in-house paid from 21 people while a 20-person quote of the same engagement was
already cheaper. Within one audience band the fee does not move at all, so
probing each band once is exact and costs five re-prices rather than three
hundred.

The panel sits **above** the fee breakdown, on screen and in the PDF. Order is
most of the point.

## Leading with the right number

Two presentation rules, both learned from a reader balking at a figure that was
perfectly defensible.

**Ask who is asking, first.** The sector question sits at the top of the first
card, above everything. It used to sit two cards down, which meant the first
number a visitor met was the DEAREST sector's day rate — quoted before they had
said a word about themselves, so a school or an NGO had to read the corporate
figure and work downwards. Every rate on the page below that question is now
already the reader's own.

**Seats are the unit, not days.** The summary leads with cost per participant,
and the same figure is restated inline the moment the day rate first appears.
A day rate is the most alarming way to state a fee — it invites "for ONE day?"
— and it is also the least useful, because nobody is buying a day. The same
corporate two-day workshop is ₱127,700, or ₱1,600 a head, which is below the
₱2,500–15,000 per participant per day that an open program charges for the
same seat. Both numbers are true; the second is the one an organizer can take
to whoever holds the budget.

The day rate is not hidden — it is on the fee's base line in the breakdown,
where its reasoning is attached to it. It is just no longer the headline.

Facilitation is the exception on both counts: nobody in a planning room is a
seat, and dividing a strategy engagement by heads produces a number that means
nothing, so those quotes keep cost-per-day. `quote.engagementType` is what the
screen and the print check.

The intro paragraph carries one sentence of framing — that a day here is not a
day of talking, and the preparation is the larger half. It is the cheapest
possible defence against a day rate being read as an hourly wage, and it is said
once, before the number, rather than argued for afterwards against a figure the
reader has already balked at.

## Mobile

The tool is checked at 320, 375 and 390px. Two traps are worth knowing about,
because both are invisible to a naive overflow check:

- **A full-width trigger can still clip its own label.** `w-full` stops the
  trigger stretching the page; it does not stop the value inside being cut off
  mid-word. The trigger is `whitespace-nowrap` and its value is a flex item,
  which will not shrink below its content without `min-w-0` — so "Company or
  corporate in-house training" rendered as "…in-house trainin", with no ellipsis
  to show anything had been cut. `SELECT_TRIGGER` carries both classes and a
  guard test pins them.
- **`#main-content` used to be its own scroll container** (`overflow-auto`),
  which meant content wider than the viewport scrolled *main* rather than the
  document: `document.scrollWidth` stayed clean while the page slid sideways,
  and an overflow audit reported the page as fine. It now uses `min-w-0`, which
  keeps the flex item shrinkable without swallowing the evidence, and
  `lib/__tests__/mobile-layout.test.ts` fails if `overflow-auto` returns. An
  audit should still measure `main.scrollWidth - main.clientWidth` as well as
  the document — cheap, and it catches the same class of bug elsewhere.
- **shadcn's `SelectTrigger` is `w-fit`.** Radix mirrors the selected item's
  markup into the trigger, so a long option label stretches it without limit —
  one measured 805px on a 375px phone. Every trigger here passes `w-full` and an
  explicit `<SelectValue>{label}</SelectValue>`, and the option's explanation
  lives in a wrapping second line inside the dropdown rather than in the trigger.

## Philippine English

Not a style preference. Philippine English follows the **American spelling
convention** and the **American date order**, so British forms read to a Filipino
reader as a document written somewhere else — the wrong signal on a quotation
whose whole argument is that it was priced for their situation. Dates render as
"April 15, 2026", never "15 April 2026".

Vocabulary matters more than spelling. The words a Philippine organizer actually
uses:

| Not this | This |
| --- | --- |
| ticket price, the gate, gross gate | registration fee, what the event collects |
| Q&A | open forum |
| fireside chat | forum |
| follow-up clinic | follow-up consultation |
| "will you arrange and pay for transport?" | "will you **shoulder** the transportation?" |
| flipcharts | manila paper |
| pre-event survey / post-event report | pre-test, post-test |
| mark (papers) | check |
| a clear remit, competing principals | a clear mandate, interests that compete |
| the deck | the slides |
| enquiry | inquiry |
| official receipt (for services) | invoice — see below |
| finance department | accounting |

Terms that are already right and should stay: honorarium, professional fee,
resource person, per diem, liquidation, purchase order, accreditation, LGU, SUC,
student congress, faculty development, reactor, plenary.

**Invoice, not official receipt.** Since the Ease of Paying Taxes Act (RA 11976)
and RR 7-2024, the invoice is the primary document for a sale of services and
the OR was removed for services entirely. Naming both tells a Philippine finance
officer the quote was written from the old rules. The AI intake route is the one
exception: it still LISTENS for "official receipt", because organizers do still
say it.

**BIR Form 2307** is named in the withholding note on screen and in the printed
quote. It is the certificate of creditable tax withheld, every Philippine
organizer knows it, and asking for it in writing is the difference between
having it and chasing it.

`lib/__tests__/philippine-english.test.ts` pins all of this. It strips comments
before matching, because comments routinely quote the wrong form in order to
explain why it is wrong, and a guard that failed on its own explanation would
teach the next person to delete the explanation rather than keep the rule.

## Length and voice

The form asks nine questions before showing a number; everything else lives in
one collapsed `DetailSection` with sensible defaults. This is deliberate and
worth preserving: completion falls with each field a person has to consider
past roughly eight, and the count that matters is fields considered, not screens
they are spread over — so spreading the same questions across more steps is not
a substitute. Anything moved out of the disclosure should be something that
genuinely moves the number, and a test asserts the quote-critical questions stay
outside it.

The copy is first person throughout, because it is one person's rate card and a
neutral institutional register read as distancing to the organizer who reviewed
it. A test asserts most rationales stay that way.

## What the tool does not do

- It does not book anything. Availability is confirmed by email.
- It does not store enquiries. "Send this enquiry" opens the organizer's own
  mail client with the quote summary prefilled, matching how `/contact` works.
- The quote arithmetic runs entirely in the browser. Only the calendar check and
  the optional AI draft reach the server, which is why
  `lib/__tests__/homepage-facts.test.ts` still passes with the homepage's
  "calculations stay in your browser" claim intact.

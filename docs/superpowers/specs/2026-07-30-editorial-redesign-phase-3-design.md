# Editorial Redesign Phase 3 — Margin Notes, About, Footer Typography, Result-Card Dark Treatment

**Date:** 2026-07-30
**Status:** Ready for planning (client content resolved)
**Predecessor:** `2026-07-29-editorial-redesign-phase-2-design.md` (shipped as `d19bfa2`, PR #5)
**Source:** `design_handoff_editorial_redesign/` — `Implementation Plan v2.html` (authoritative, §v.w3), `README.md` §3 (MarginNote), §2 (About), §5 (Footer), `Dark Mode.html` §iii–iv (result-card + SFT-105). Margin-note content mined from the author's presentation decks: `Fundraising, Networking, Valuation and Equity Divisions.pdf`, `Startup Entrepreneurial Accounting and Financial Management.pdf`, `Startup Finance.pptx.pdf`, `Startup Valuation Workshop .pdf`, `Developing Financial Models.pdf`.

---

## 1. Goal

Phase 3 delivers the redesign's "competence surface": the unsigned, opinionated **margin notes** that replace every promotional element the client cut from v1, plus the **`/about` rebuild** that concentrates all credentials in one place, the **footer typography restyle**, and the **result-card dark treatment** — the one component whose light-mode trick (a solid ink slab) does not transfer to dark mode.

Phase 2 left the tool pages and `/about` untouched; they still render in the new paper-and-ink palette but with pre-redesign structure. Phase 3 is the largest content phase: the handoff calls the margin-note copy "the single highest-value input" and explicitly assigns it to the author, not the developer.

### Why these four things together

The handoff groups them as week 3 (SFT-301 through SFT-304) for a reason: the `MarginNote` component, the `lib/notes.ts` content, and the `/about` rebuild are the three surfaces that establish credibility *without* self-promotion. The footer typography restyle and the result-card dark treatment are small carry-overs from phases 1–2 that were deferred because they depend on this phase's components landing first — the footer rests on the editorial type system, and the result-card change is moot until margin notes sit beside results.

### Decisions taken during design

| Decision | Choice | Rationale |
|---|---|---|
| `lastVerified` field on compliance data | **Not added — already covered** | Phase 2 reused the existing `DATA_LAST_UPDATED = "2026-02"` constant (FactStrip cell 3 reads `DATA_LAST_UPDATED.slice(0, 4)`). The handoff proposed `lastVerified`; Phase 2 shipped an equivalent. Adding a second field creates two sources of truth for the same date. Do not add it. |
| Final byline wording | **Client-directed, supersedes Phase 2** | Phase 2 shipped a credentials-form byline. The client directed a shorter, humbler wording for the homepage hero: "Built by Kevin Philip Gayao, derived from over a decade of fundraising experience and teaching." Phase 3 updates `components/home/quiet-hero.tsx` to this wording. The footer credit line ("Startup Finance Toolkit — by Kevin Gayao for IOL Inc.") is unchanged. |
| Result-card light-mode treatment | **Implement the ink slab now** | The current `result-card.tsx` is still the pre-redesign shadcn Card with subtle `bg-good/5` variant tints — the ink slab was never built. Phase 1 deferred it; Phase 3 is where it lands. Light mode: solid `--ink` fill, paper text, ochre numeral. Dark mode: surface step 3 (`#262319`) + `#4A4530` hairline, ochre numeral. |
| `MarginNote` placement | **Grid beside the result, below on mobile** | `grid-template-columns: 1fr 230px; gap: 30px`, collapsing to one column under 760px with the note *below* the result — not into a sidebar. Matches the handoff's Unit Economics mock exactly. |
| Note content sourcing | **Client-authored, shipped real or subset** | `lib/notes.ts` is Kevin's writing, not developer-written. Ship the component with real copy or a clearly-marked subset. **Do not fill with invented financial advice** — a note that is wrong is worse than a note that is missing. |
| `/about` two-column vs. single | **Two-column, stacks under 920px** | Per handoff §2. Left rail (portrait + grant timeline), right column (bio + pull-quote + org wall + CTA). Current page is `max-w-3xl` single column — full rebuild. |
| Footer | **Typography only, copy already trimmed** | Phase 2 already collapsed the credit to one line ("Startup Finance Toolkit — by Kevin Gayao for IOL Inc.") and removed the extra author mentions. Phase 3 applies the editorial type system (serif wordmark, mono qualifier, hairline rules) and deletes the v1 `<AuthorColophon>` concept. No copy change. |
| Markdown in margin notes | **Yes, minimal renderer** | Notes must carry formulas and links to Learn modules. Use a tiny inline renderer (or `react-markdown` if already a dep — check) — never a full MDX pipeline for 12–15 short strings. |

### Out of scope

| Deferred to | What |
|---|---|
| Phase 4 | Tool index — featured "Start Here" row, sparklines, numbered chapters, `ToolCard`, method sidebar, `subtitle` on `TOOL_GROUPS` |
| Phase 5 | Cross-links to `kevin.iol.ph` with UTM tags (the About closing line *points* there in Phase 3, but UTM tagging is Phase 5) |
| Unassigned | Header restyle (brand qualifier, ochre active-nav underline, `₱ · PHILIPPINES` meta) |

The `MarginNote` component is built in Phase 3 but **not yet composed into tool pages** beyond a minimal wiring so the guard tests can exercise it. Composing margin notes into every tool page's layout is part of Phase 3's task list, but the `lib/notes.ts` content set may ship as a subset if the client copy is incomplete — see §6.

---

## 2. Architecture

Four independently-verifiable workstreams with almost no file overlap:

```
  Workstream A (MarginNote)         Workstream B (About)
  ┌─────────────────────┐           ┌──────────────────────┐
  │ components/shared/  │           │ app/about/page.tsx    │  (rebuild)
  │   margin-note.tsx   │ (new)     │ components/about/     │  (new dir)
  │ lib/notes.ts        │ (new)     │   grant-timeline.tsx  │  (new)
  │ tool page layouts   │ (modify)  │   organization-wall   │  (new)
  └─────────────────────┘           │ lib/kevin.ts          │  (new)
                                    │ lib/orgs.ts           │  (new)
                                    └──────────────────────┘
  Workstream C (Footer)             Workstream D (Result card)
  ┌─────────────────────┐           ┌──────────────────────┐
  │ components/layout/  │           │ components/shared/    │
  │   footer.tsx        │ (modify)  │   result-card.tsx     │  (modify)
  └─────────────────────┘           └──────────────────────┘
```

A and D both touch `components/shared/` but on different files, so they can proceed in parallel. B is the largest and has no dependency on the others. C is the smallest and can land anytime.

### Tech stack

Next.js 16.1.6 (App Router, RSC), React 19.2.3, TypeScript, Tailwind CSS v4 (`@theme inline` tokens), shadcn/ui, Recharts 3.7, Vitest 4, pnpm 10.28.2. No new runtime dependencies unless a markdown renderer is needed (see §3.1 decision).

### Working directory

`C:/Users/ASUS TUF/Projects/startup-finance-tools/app`. This directory *is* the git repo; the project root above it is not. Run all `git`, `pnpm`, and path-relative commands from here.

---

## 3. Component specifications

### 3.1 `<MarginNote>` — `components/shared/margin-note.tsx` (new)

The core competence surface. A small ochre-ruled aside placed beside a tool's result.

| Element | Spec |
|---|---|
| Container | 2px `--ochre` left border, `padding-left: 15px`. **No background, no card, no avatar, no name, no badge.** |
| Label | 9.5px mono, `0.14em`, uppercase, `--ochre-deep` (light) / `--ochre` (dark). Text: "Note" |
| Body | 14.5px **serif**, line-height 1.5, `--ink-2`, margin-top 8px. Renders markdown so a note can carry a formula or a link to a Learn module. |

**Props:**

```ts
interface MarginNoteProps {
  toolId: string;        // key into lib/notes.ts
  noteIndex?: number;    // default 0; a tool may have 2–3 notes
  className?: string;
}
```

The component looks up its content from `lib/notes.ts` by `toolId` + `noteIndex`. A `tone` field on each note (`rule` | `watch` | `ph`) may optionally render a tiny tone tag before the body, but the handoff's mock shows only the "Note" label — keep it unless the client asks for tone labels.

**Markdown rendering:** check `package.json` for an existing `react-markdown` dependency. If present, use it with `remark-gfm` for the formula/links. If absent, write a ~40-line inline renderer handling paragraphs, `**bold**`, `*italic*`, `` `code` ``, `[text](url)`, and line breaks — nothing else. Do not pull in a full MDX pipeline for 12–15 short strings.

**Layout integration (tool pages):** the tool page wraps its result + margin-note area in:

```
grid grid-cols-1 min-[760px]:grid-cols-[1fr_230px] gap-[30px]
```

The note sits in the right column at ≥760px and below the result under 760px. Each tool page that has notes adds the grid wrapper around its existing result block. Tools with no note content render the result without the wrapper — the absence is invisible.

### 3.2 `lib/notes.ts` (new) — margin-note content

Keyed by tool id. **Content is client-authored** (Kevin's writing). Ship the component with real copy or a clearly-marked subset.

```ts
export type NoteTone = "rule" | "watch" | "ph";

export interface MarginNoteData {
  tone: NoteTone;
  body: string;          // markdown — may contain formulas, links to Learn modules
}
```ts
export const NOTES: Record<string, MarginNoteData[]> = {
  "valuation-calculator": [
    {
      tone: "rule",
      body: "No single valuation method is right. I always run at least two — usually Scorecard or Berkus for pre-revenue, DCF or Revenue Multiple once there's traction — and treat the spread as the negotiation range, not a single number to defend.",
    },
    {
      tone: "watch",
      body: "The biggest mistake I see is founders anchoring on a top-down market size and deriving valuation from it. Investors discount that hard. A bottom-up estimate (real customers × real ARPU) survives due diligence; a 1% of a 10B market claim does not.",
    },
    {
      tone: "ph",
      body: "For PH pre-revenue startups, the Scorecard method lands better than DCF — comparable funded startups in the region give you a defensible anchor, whereas 5-year cash-flow projections for a company with no revenue are fiction the investor will politely ignore.",
    },
  ],
  "equity-simulator": [
    {
      tone: "rule",
      body: "Founder equity should align with contributions, not with equal splits. I've seen equal three-way splits kill companies when one founder stops showing up. Vesting — usually 4 years with a 1-year cliff — is non-negotiable before anyone writes a check.",
    },
    {
      tone: "watch",
      body: "Carve out the ESOP pool before pricing the round, not after. If you set aside 10% after investors come in, the dilution falls entirely on the founders. Set it first and the dilution is shared.",
    },
    {
      tone: "ph",
      body: "Typical PH founder ownership at seed lands 60–80%, investor 10–40%. Going below 60% founder ownership at the first priced round is a red flag for later investors — it signals the cap table is already heavy before the hard work starts.",
    },
  ],
  "safe-calculator": [
    {
      tone: "rule",
      body: "A SAFE is not priced equity — it converts at a later round, so the cap and the discount are the only two numbers that matter today. I treat the cap as my downside and the discount (usually 20%) as my reward for taking the early risk.",
    },
    {
      tone: "watch",
      body: "Stacking SAFEs with different caps distorts the cap table in ways most founders don't model until it's too late. Run the conversion at two or three different next-round valuations before you sign the second SAFE — the ownership outcomes can swing wildly.",
    },
    {
      tone: "ph",
      body: "SAFEs are still uncommon enough in the Philippines that some early investors will push for convertible notes instead. Notes carry interest and a maturity date SAFEs don't — if you're choosing, the SAFE is friendlier to the founder. Push back gently but push back.",
    },
  ],
  "burn-rate": [
    {
      tone: "rule",
      body: "I size every raise to cover 12–18 months of cash burn. Less than 12 and you're back fundraising before the work lands; more than 18 and you're diluting for capital you don't yet need. The answer is almost always in that band.",
    },
    {
      tone: "watch",
      body: "Profitable on paper and out of cash are two different things. A negative cash flow month is the warning, not a negative P&L. I review cash flow weekly — the income statement can look fine while the bank account empties.",
    },
    {
      tone: "ph",
      body: "Build a cash reserve of 3–6 months of operating expenses before you scale. PH grants and donor funding can disburse late — I've seen EU-PH partnership tranches slip by a quarter. The reserve is what keeps you from raising a bridge at punitive terms.",
    },
  ],
  "unit-economics": [
    {
      tone: "rule",
      body: "Anything under 3× and you're buying revenue, not building a business. Above 5× usually means you're underspending on growth — not that you're efficient.\n\nFor PH SaaS at seed, I look for 3–4× with payback under 12 months. Grant-funded companies can run leaner because the capital isn't priced.",
    },
    {
      tone: "watch",
      body: "Churn is the silent killer of LTV. A 4.5% monthly churn halves your LTV compared to a 2% churn — and most founders model LTV on the optimistic number. Run the calculation at your real churn, not the one you hope to hit.",
    },
  ],
  "compliance-checklist": [
    {
      tone: "ph",
      body: "Register in this order: DTI or SEC first, then BIR, then the local business permit, then SSS/PhilHealth/HDMF. Each step depends on the one before it — skipping ahead wastes weeks, not days.",
    },
    {
      tone: "ph",
      body: "Budget for the BIR filing cadence, not just registration. Monthly, quarterly, and annual filings add up to 34 forms a year for a small corporation. Missing a deadline costs more in penalties than the compliance itself — set calendar reminders the day you get your TIN.",
    },
    {
      tone: "watch",
      body: "Keep personal and business accounts separate from day one. Mixing them is the most common startup accounting mistake I see — it turns tax filing into a forensic exercise and undermines your books when an investor asks for due diligence.",
    },
  ],
};
```

**17 notes** across the six required tools (3 each, except Unit Economics which has 2). All content mined from the author's presentation decks and filtered through the content rules below — no invented financial advice.

**Content rules (enforced by a guard test — see §5):**
- 12–17 notes minimum, two to three each across Valuation, Equity/Cap Table, SAFE, Burn Rate, Unit Economics, and PH Compliance. (This spec ships 17.)
- Each note is a **threshold** ("below X, expect pushback"), a **common mistake**, or a **PH-specific caveat**.
- **None mention Kevin, IOL, credentials, or seminars.** A note that mentions the author's credentials is a failed note.
- Voice is **first-person singular, unhedged** — the opinion is the value.
- Highest leverage: **SAFE calculator and PH compliance** — the two tools where local expertise is most visible.

**If the client copy is incomplete at build time:** ship the component + the guard test + whatever notes exist, and leave the remaining tool ids absent from `NOTES`. The `MarginNote` component must render nothing (not a placeholder) when `NOTES[toolId]` is undefined. Track the missing notes in the PR description.

### 3.3 `/about` — `app/about/page.tsx` (rebuild)

The single place on the toolkit where full credentials live. Two-column: left rail `1fr`, right column `1.4fr`. Stacks under 920px.

**Left rail** — `--paper-2` (`--muted`) background, 1px right rule (`--rule`), padding `48px 36px`, flex column gap 20px:

| Element | Spec |
|---|---|
| Portrait | `aspect-ratio: 1`, full width, 1px `--rule`. **Client-supplied** — `C:/Users/ASUS TUF/OneDrive/Pictures/kpdg profile photo.jpg` (400×400 JPEG). Copy into `public/` (e.g. `public/about-portrait.jpg`) and lazy-load (`loading="lazy"`) for Lighthouse. |
| Role line | 11px mono, `0.12em`, uppercase, `--muted` — "CPA · MBA · CEO, IOL Inc." |
| Name | 28px serif, line-height 1.1 |
| Grant timeline | A `<dl>` of year-tag + entry rows. Each row: 1px top rule (`--rule`), padding-top 8px, year in 11px mono `--ochre-deep` fixed 36px width, entry in serif `--ink` 13px. |

Grant timeline entries (confirm dates/amounts with client before shipping — these are from the handoff draft):

| Year | Entry |
|---|---|
| 2021 | DOST-PCIEERD Startup Grant |
| 2023 | DOST-TAPI TECHNiCOM Grant |
| 2018 | Angel investment via IdeaSpace Cohort 7 |
| 2020–24 | Finance Manager, Vivita Philippines (Mistletoe-backed) |
| 2024 | EU-PH Green Economy Partnership grant |
| Ongoing | Visiting Lecturer, SLU Graduate School |
| Ongoing | Finance Mentor, New Energy Nexus |
| Ongoing | Certified Mentor, PCE / Go Negosyo |

**Right column** — padding `48px 40px`, flex column gap 28px:

| Element | Spec |
|---|---|
| Eyebrow | 11px mono, `0.18em`, uppercase, `--muted` |
| h2 | 36px serif, line-height 1.05, `--ink` |
| Body | 17px **serif** (not sans), line-height 1.55, `--ink-2` |
| Pull-quote | 3px `--ochre` left border, padding-left 18px, 19px serif italic, line-height 1.45. Copy derived from the existing about page's thesis: *"This toolkit transforms the teaching into interactive calculators that founders can use to make real financial decisions — from pricing their first product to modeling their cap table through multiple funding rounds."* The implementer may refine the wording but must keep it to one sentence and in the author's voice. |
| `<OrganizationWall>` | wrap-flow row of org names, each prefixed by a 14px circle color-coded by kind: `gov` = ochre, `edu` = teal, `solid` = ink, default = hollow `--rule-strong`. Names in 13.5px serif 600. **Full set here, unfiltered.** |
| Dual CTA | Contact + LinkedIn |
| Closing line | One quiet line linking to `kevin.iol.ph` for the broader practice (UTM tags deferred to Phase 5) |

**New files:**
- `components/about/grant-timeline.tsx` — the `<dl>` renderer. Takes the timeline array from `lib/kevin.ts`.
- `components/about/organization-wall.tsx` — the org row. Takes `lib/orgs.ts`. **This is the only page that renders it** — the homepage org wall was dropped in Phase 2.
- `lib/kevin.ts` — bio chunks, grant timeline, role lines. Consumed by `/about` only.
- `lib/orgs.ts` — org listings with `{ name, kind: "gov" | "edu" | "solid" | "other" }`. Single source of truth.

### 3.4 Footer — `components/layout/footer.tsx` (modify)

Phase 2 already trimmed the credit copy to one line and removed the extra author mentions. Phase 3 applies the editorial type system — **copy does not change**:

- Serif wordmark, mono qualifier where applicable, hairline rules between sections.
- Credit line: "Startup Finance Toolkit — by Kevin Gayao for IOL Inc." in editorial type.
- LinkedIn icon stays. **Do not add** a portrait thumbnail, a CTA button, or a dedicated author band. The `<AuthorColophon>` concept from v1 is cancelled.
- Ecosystem strip stays as-is (Phase 5 reconciles it with `kevin.iol.ph`).

### 3.5 Result card — `components/shared/result-card.tsx` (modify)

The one component whose light-mode trick doesn't transfer to dark. Current state: pre-redesign shadcn `Card` with subtle `bg-good/5` / `bg-warn/5` / `bg-bad/5` variant tints, `text-2xl font-bold` value. No ink slab exists yet.

**Light mode (new):**
- Solid `--ink` (`#1A1815`) fill, `--paper` (`#F6F2EA`) text — maximum contrast against the page.
- Variant tints (`success`/`warning`/`danger`) carry through as the numeral color: `--good` / `--warn` / `--bad`, plus the existing variant icon.
- Result numeral: 32–34px serif, line-height 1, `font-variant-numeric: tabular-nums`. Unit as a non-italic `<em>` in ochre (`--ochre-deep`).
- Label above numeral: 10px mono, `0.12em`, uppercase, on the paper-colored text.

**Dark mode (new):**
- **Not** a bone slab (it would glare). Surface step 3: `#262319` (`--muted` in dark) fill with a `#4A4530` (`--rule-strong` dark) hairline border.
- Ochre numeral (`--ochre` / `#D9A45F`) carries the emphasis instead of the slab contrast.
- Label in `--muted-foreground` (dark).

Implement via the existing tokens — do not hardcode hexes. The dark variant is `dark:bg-[var(--muted)] dark:border-[var(--rule-strong)]` (or the Tailwind-mapped equivalents) layered over the light `bg-ink text-paper`. This is the only component in the app whose treatment genuinely differs between themes; everything else inherits from tokens.

---

## 4. Data / constants changes

| File | Change | Phase |
|---|---|---|
| `lib/notes.ts` | **New.** Margin-note content keyed by tool id. Client-authored. | 3 |
| `lib/kevin.ts` | **New.** Bio chunks, grant timeline, role lines. Consumed by `/about` only. | 3 |
| `lib/orgs.ts` | **New.** Org listings with `{ name, kind }`. Single source of truth. | 3 |
| `lib/calculations/compliance-checklist.ts` | **No change.** `DATA_LAST_UPDATED` already exists and feeds FactStrip cell 3. The handoff's proposed `lastVerified` field is **not** added — see §1 decisions. | — |
| `lib/constants.ts` | **No change in Phase 3.** `subtitle` on `TOOL_GROUPS` is Phase 4. `CHART_COLORS` already reads CSS vars (Phase 1). | — |

---

## 5. Tests

Follow the repo's established pattern: pure data assertions and file-content sweeps, **no component-rendering tests** (no jsdom, no Testing Library). Phase 2 added 4 guard tests; Phase 3 adds the following.

### New test file: `lib/__tests__/margin-notes.test.ts`

- Every `NOTES` entry: body is non-empty, `tone` is one of the three allowed values.
- **No note body mentions "Kevin", "IOL", "credentials", or "seminar"** (case-insensitive). A note that fails this is a failed note.
- At least 12 notes total across the required six tool ids. (If shipping a subset, lower this floor and document it in the PR — do not silently ship fewer than promised.)
- Each of the six required tool ids (`valuation-calculator`, `equity-simulator`, `safe-calculator`, `burn-rate`, `unit-economics`, `compliance-checklist`) has at least 2 notes.

### New test file: `lib/__tests__/about-content.test.ts`

- `lib/kevin.ts` exports a grant timeline array with at least the entries listed in §3.3.
- `lib/orgs.ts` exports an array where every entry has a valid `kind` (`gov` | `edu` | `solid` | `other`).
- The author's name appears at most twice on `/about` — once in the rail, once in the credit/close. (Sweep `app/about/page.tsx` source for the name string.)

### Existing guards — must stay green

- `lib/__tests__/design-tokens.test.ts` (Phase 1): no hex literals, no gradients, no `shadow-*`, radius ceiling. The result-card change and the new components must not introduce violations.
- `lib/__tests__/homepage-facts.test.ts` (Phase 2): the author-name-twice and fetch-allowlist guards. Phase 3 does not touch the homepage, but the `MarginNote` and `/about` work must not regress these.

### Verification gates

- `pnpm exec vitest run` — the full suite (329 tests at the Phase 2 branch point) must pass. Phase 3 adds the two test files above.
- `pnpm build` — must succeed and emit 27 pages + 3 API routes.
- **Not** `pnpm lint` — it fails with 5 pre-existing `react-hooks/set-state-in-effect` errors in `ecosystem-banner.tsx`, `compliance-checklist/page.tsx`, and `fundraising-guide/page.tsx`. Scope lint to files you edited.
- **Manual:** `/about` and at least one tool page with a margin note must be eyeballed in both themes at 375 / 760 / 920 / 1280px. The repo has no rendering tests; `pnpm build` cannot catch a visual regression here.

---

## 6. Sequencing

Suggested task order within Phase 3 (each task is independently verifiable):

1. **`MarginNote` component + `lib/notes.ts` skeleton + guard test.** Build the component with the Unit Economics note (verbatim from the handoff mock) as the only entry. Ship the guard test with the content rules. This proves the component and the test harness before the bulk content lands.
2. **Result-card dark treatment.** Independent of the margin note; can land first if it unblocks the dark visual check. Light-mode ink slab + dark-mode surface step 3.
3. **Wire `MarginNote` into one tool page** (Unit Economics) with the grid wrapper. Verifies the layout integration before rolling out.
4. **Footer typography restyle.** Small, independent.
5. **`lib/kevin.ts` + `lib/orgs.ts` + `/about` rebuild.** The largest workstream. Depends on `lib/orgs.ts` and `lib/kevin.ts` being written first; the `grant-timeline.tsx` and `organization-wall.tsx` components follow.
6. **Roll out `MarginNote` to the remaining five tool pages** once the client copy for each lands in `lib/notes.ts`.
7. **Final guard pass + manual visual review in both themes.**

Tasks 1–4 can largely proceed in parallel; 5 is the long pole. Task 6 is gated on client content and may ship as a follow-up to the Phase 3 PR if the copy is incomplete — but the component, the test, and the wiring must land together so the mechanism is proven.

---

## 7. Client content — resolved

All five content blockers from the handoff's "Client decisions still outstanding" are resolved for this phase:

| # | Blocker | Resolution |
|---|---|---|
| 1 | Margin-note copy | **Done.** 17 notes mined from the author's five presentation decks (see §3.2). Verbatim handoff example retained for Unit Economics; the rest are extracted from the author's stated thresholds, common-mistake lists, and PH-specific caveats. No invented financial advice. |
| 2 | Portrait photograph | **Provided.** `C:/Users/ASUS TUF/OneDrive/Pictures/kpdg profile photo.jpg` (400×400 JPEG). Copy into `public/about-portrait.jpg` during implementation. |
| 3 | Final byline wording | **Client-directed.** Homepage hero byline: "Built by Kevin Philip Gayao, derived from over a decade of fundraising experience and teaching." Short and humble per client instruction. Update `components/home/quiet-hero.tsx` (Phase 2 shipped a credentials-form variant — this supersedes it). |
| 4 | Grant timeline dates | **Confirmed with one correction.** Angel investment year is **2018** (not 2021 as the handoff draft stated). All other entries are correct as listed in §3.3. No amounts included. |
| 5 | Pull-quote text for `/about` | **Derived from existing about page.** See §3.3 — the closing paragraph of the current `app/about/page.tsx` ("This toolkit transforms those teachings into interactive calculators...") is the thesis; the pull-quote distills it into one italic serif line. |

No content blockers remain. The implementation plan can proceed immediately.

---

## 8. Definition of done (Phase 3 contribution to the redesign's DoD)

Carried from the handoff's revised DoD, scoped to what Phase 3 delivers:

- [ ] At least 12 margin notes shipped, none self-referential. Each says something useful and specific.
- [ ] The author's name appears at most twice on any page (once in the homepage hero byline, once in the footer; on `/about` only, the full credentials live). Phase 1/2 guards still pass.
- [ ] Zero photographs of the author outside `/about`. No hero portrait, no footer thumbnail, no avatar on the AI panel.
- [ ] `/about` is the only page carrying the org wall, the portrait, and the grant timeline.
- [ ] Result-card reads as a solid ink slab in light mode and as surface step 3 + ochre numeral in dark mode — no glare in either theme.
- [ ] Footer credit is one editorial line; no `<AuthorColophon>` band.
- [ ] `pnpm exec vitest run` and `pnpm build` pass.
- [ ] Both themes verified at 375 / 760 / 920 / 1280px on `/about` and at least one tool page with a margin note.
- [ ] No new hex literals, gradients, or `shadow-*` classes (Phase 1 guards still pass).

---

**Next step:** this spec is ready for an implementation plan (`docs/superpowers/plans/2026-07-30-editorial-redesign-phase-3.md`) once the client content blockers in §7 are acknowledged. The plan should follow the same task-by-task checkbox structure as phases 1 and 2.

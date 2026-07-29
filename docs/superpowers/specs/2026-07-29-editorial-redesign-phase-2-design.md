# Editorial Redesign Phase 2 — Homepage

**Date:** 2026-07-29
**Status:** Approved, ready for planning
**Predecessor:** `2026-07-29-editorial-redesign-phase-1-design.md` (shipped as `5f95497`, PR #4)
**Source:** `design_handoff_editorial_redesign/` — `Implementation Plan v2.html` (authoritative)
and `README.md` §1a, §1b, §5

---

## 1. Goal

Replace the homepage's default-SaaS hero with the handoff's `QuietHero` and `FactStrip`, so the
first screen establishes credibility through verifiable product facts rather than a generic
value proposition.

Phase 1 deliberately left the hero's *content* untouched — it only removed the gradient
overlay — so the current `<h1>`, both `<p>` elements and the CTA row are still the pre-redesign
copy sitting inside the new paper-and-ink palette.

## 2. Scope

**In:**

- `QuietHero` — new component
- `FactStrip` — new component
- Composition of `app/page.tsx`
- One new colour token pair (`--ink-2`)
- Footer credit **copy** trim (see §7 — pulled in from phase 3 for a specific reason)
- A homepage-facts guard test file

**Out, explicitly:**

| Deferred to | What |
|---|---|
| Phase 3 | Margin notes, `/about` rebuild, footer *typography* restyle, result-card dark treatment |
| Phase 4 | Tool index — featured "Start Here" row, sparklines, numbered chapters, `ToolCard`, method sidebar |
| Unassigned | Header restyle (handoff §4 — brand qualifier, ochre active-nav underline, `₱ · PHILIPPINES` meta) |

The tool grid below the fact strip keeps its current grouped shadcn cards, tinted icon tiles
and all. This leaves the page visibly half-redesigned until phase 4; that is an accepted
consequence of following the handoff's build order.

## 3. Composition

```
Header
  QuietHero      ← new
  FactStrip      ← new
  tool grid      ← unchanged
Footer
```

The existing hero `<section>` (with its `border-b`) is deleted. `FactStrip`'s own top and
bottom rules take over the job of separating the bands, and the tool-grid section changes from
`pb-16` to `py-14` to replace the vertical space the deleted hero used to supply.

### Container alignment — a deviation from the spec, on purpose

The handoff gives `QuietHero` its own padding (`48px 44px 38px`). The app's header, footer and
tool grid all align to `container mx-auto px-4`. Both new components use that container so the
hero text, the fact-strip rules and the tool cards share a single left edge; a hero indented to
44px against a grid at container padding reads as a bug. Vertical padding follows the spec
(48px top, 38px bottom).

## 4. `components/home/quiet-hero.tsx`

Server component. No `"use client"`, no state, no client JS.

| Element | Spec | Copy |
|---|---|---|
| Eyebrow | existing `eyebrow` utility — already an exact match (11px mono, `0.18em`, uppercase, `--muted-foreground`) | `Sixteen tools · free · nothing leaves your browser` |
| h1 | `clamp(34px, 6vw, 52px)` serif 600, line-height 1.04, `-0.02em`, `max-w-[18ch]`, margin-top 14px | `Run the ` *numbers* ` on your startup — properly.` |
| — the `<em>` | italic, `text-[var(--ochre-deep)] dark:text-[var(--ochre)]` | |
| Deck | 17px, line-height 1.55, `--ink-2`, `max-w-[52ch]`, margin-top 18px | `Valuation, cap tables, SAFEs, burn rate, break-even, unit economics, PH compliance, MSME planning. Peso-native, built for how funding actually works in the Philippines.` |
| CTA row | flex, gap 10px, margin-top 26px, wraps | |
| — primary | `<Button variant="ochre" size="lg" asChild>` → `/tools/self-assessment`, trailing `ArrowRight` | `Start with the {n}-question assessment` |
| — secondary | `<Button variant="outline" size="lg" asChild>` → `/tools` | `Browse all {n} tools` |
| Byline | margin-top 34px, padding-top 14px, 1px top rule on `--border`, 13px, `--muted-foreground`, line-height 1.6, `max-w-[60ch]` | `Built by ` [Kevin Gayao](/about) ` — CPA, MBA, CEO of IOL Inc.` |

The h1 is the widest element on the page; the byline is among the smallest. Non-breaking spaces
in the deck before "compliance" and "the Philippines" per the mock.

### Derived numbers

Both CTA counts are read from data, never typed: `QUIZ_QUESTIONS.length` (25) from
`lib/calculations/self-assessment.ts` and `TOOLS.length` (16) from `lib/constants.ts`.

The eyebrow's "Sixteen" is spelled out and cannot be interpolated. It is guarded by a test
instead (§8).

### Two decisions taken during design

**Byline wording.** The handoff's draft was *"Built by Kevin Gayao, a CPA who raised the grants
and rounds these tools model — for IOL Inc."* The approved wording is the credentials form,
`Built by Kevin Gayao — CPA, MBA, CEO of IOL Inc.`, which matches the existing `/learn` article
bylines so the site reads consistently. This is a knowing departure from the Quiet Authority
argument, which prefers a checkable claim to a credentials list. Client decision; do not revert
it.

**Assessment CTA.** The mock said "5-minute assessment". The app states no duration anywhere,
and 25 multiple-choice questions across 6 categories at 5 minutes is 12 seconds per question —
a number invented at the CTA and defensible by nothing. The CTA uses the derived question count
instead, which the visitor confirms the moment the page loads.

### Base-layer gotchas

Two things phase 1's `@layer base` does that this component must override:

1. `:where(p, li, dd, blockquote) a { color: var(--link) }` — the byline is a `<p>`, so its
   "Kevin Gayao" link inherits teal, while the design calls for `--ink-2`. Needs an explicit
   colour override. Keep the underline (affordance) and hover to `--ochre-deep`.
2. `h1, h2, h3, h4 { letter-spacing: -0.015em; text-wrap: balance }` — the hero h1 wants
   `-0.02em`, so tracking must be set on the element. `text-wrap: balance` is left in place; it
   helps an 18ch headline rather than fighting it.

## 5. `components/home/fact-strip.tsx`

Server component. Four cells, 1px top rule, 1px left rule between cells (first cell none), cell
padding `20px 24px`, sitting on `--background` — not an ink band. A bottom rule separates it
from the tool grid.

| Cell | Numeral | Source | Label |
|---|---|---|---|
| 1 | `16` | `TOOLS.length` | Tools, no signup |
| 2 | `₱` | literal, in `--ochre-deep` | Peso-native throughout |
| 3 | `2026` | `DATA_LAST_UPDATED`, year portion | SEC / DTI / BIR fees current |
| 4 | `0` | literal | Data sent to a server |

Numeral: 30px serif, line-height 1, `-0.01em`. Label: 10px mono, `0.12em`, uppercase,
`--muted-foreground`, margin-top 8px, line-height 1.5. The `₱` is wrapped in a non-italic `<em>`
per the mock's markup.

Responsive: 2×2 below **820px** (the spec's breakpoint, expressed as `min-[820px]:grid-cols-4` —
not Tailwind's `md`, which is 768px). Odd cells drop `border-l`; cells 3–4 gain `border-t`.

No cell may reference the author, years of experience, or programs taught.

### Cell 3 needs no new field

The handoff proposed adding a `lastVerified` field to the compliance-checklist data.
`DATA_LAST_UPDATED = "2026-02"` **already exists** in `lib/calculations/compliance-checklist.ts`
and already renders on the compliance tool page as "As of 2026-02". Reusing it means the
homepage claim and the tool page cannot disagree, and it satisfies "verifiable within one click"
literally — the visitor clicks through and sees the same date. Do not add a second field.

## 6. New token: `--ink-2`

Phase 1 shipped `--foreground` (`#1A1815`) and `--muted-foreground` (`#6B6356`) but no mid-tone.
The hero deck and the byline link both need one.

| Token | Light | Dark | Contrast on its background |
|---|---|---|---|
| `--ink-2` | `#2E2A24` | `#CFC7B5` | 12.6:1 light, 11.0:1 dark — AAA both |

Values are the handoff's own (`styles.css` line 14; `Dark Mode.html` line 19). Three edits in
`app/globals.css`: the pair in `:root` and `.dark` beside the other brand tokens, plus
`--color-ink-2` in `@theme inline`.

The name is kept from the handoff even though in dark mode the value is a bone tone rather than
ink. `--ochre-deep` already inverts the same way, and keeping the design docs and the code in
agreement is worth more than being literal.

## 7. Footer credit trim

**Why this is in phase 2 at all.** The handoff assigns the footer restyle to phase 3. But
`footer.tsx` currently carries three visible mentions of the author (lines 24, 39, 46) plus an
`aria-label`. Adding the hero byline puts the homepage at four visible mentions against the
handoff's hard limit of two — the page phase 2 exists to fix would ship in violation of the rule
phase 2 exists to serve. Because the footer is sitewide, the fix also repairs every other page.

Scope is **copy only**. Typography restyle remains phase 3.

| Line | Before | After |
|---|---|---|
| 24 | `Built by IOL Inc. — Based on startup finance teachings by Kevin (CPA, MBA)` | `Startup Finance Toolkit — by Kevin Gayao for IOL Inc.` |
| 39 | `Kevin Philip D. Gayao` | `LinkedIn` |
| 46 | `Contact Kevin` | `Contact` |

`IOL Inc.` keeps its outbound link to `iol.ph`. The footer's `Kevin Gayao` stays plain text —
`/about` is already reachable from the nav and from the hero byline, which is the two entry
points the handoff asks for. The `aria-label` on the LinkedIn link is an accessible name, not
prose, and is exempt from the count; retitle it to `LinkedIn profile` for consistency.

Result: hero 1 + footer 1 = exactly 2.

## 8. Files

| File | Change |
|---|---|
| `app/globals.css` | `--ink-2` pair + `@theme inline` mapping |
| `components/home/quiet-hero.tsx` | **new** |
| `components/home/fact-strip.tsx` | **new** |
| `app/page.tsx` | delete hero `<section>`, compose the two, restore grid padding |
| `components/layout/footer.tsx` | credit copy trim (§7) |
| `lib/__tests__/homepage-facts.test.ts` | **new** — guards below |

`components/home/` is a new directory, matching the handoff's own path
(`components/home/fact-strip.tsx`) and the existing `components/layout` / `components/shared`
split.

## 9. Testing

Four guards in `lib/__tests__/homepage-facts.test.ts`. Each exists because a fact on the page
would otherwise go stale silently — the same principle that drives cell 3.

1. `TOOLS.length === 16`, failing with a message naming the eyebrow ("Sixteen") and the
   secondary CTA. A 17th tool must break a test rather than quietly make the page lie.
2. `QUIZ_QUESTIONS.length === 25`, same reason, for the primary CTA.
3. `DATA_LAST_UPDATED` matches `/^\d{4}-\d{2}$/`, so the year slice feeding cell 3 cannot
   produce garbage.
4. **Quiet Authority guard** — the author's name appears at most twice across the homepage's
   component tree (`app/page.tsx`, `components/home/*.tsx`, `components/layout/footer.tsx`).
   This mechanizes the handoff's own definition-of-done item, which it lists as a manual `grep`.
   Counts visible text; exempts `aria-label`.

**Gates:** `pnpm test` (325 → ~329) and `pnpm build`. **Not** `pnpm lint` — it has 5 known
pre-existing `react-hooks/set-state-in-effect` errors in unrelated files and is not a clean
gate; scope eslint to edited files if checking.

**Manual:** both themes at 375 / 820 / 1280px. 820px specifically confirms the fact strip's
2×2 border flip. Verify no flash of wrong theme and that the h1 remains the widest element.

## 10. Definition of done

- [ ] Homepage renders `Header → QuietHero → FactStrip → tool grid → Footer`
- [ ] Every number on the page derives from data, or is guarded by a test
- [ ] Fact cell 3 agrees with `/tools/compliance-checklist`
- [ ] The author's name appears exactly twice on the homepage, zero photos
- [ ] `--ink-2` present in both themes, AAA in both
- [ ] `pnpm test` and `pnpm build` pass
- [ ] Both themes verified at 375 / 820 / 1280px
- [ ] No new hex literals, gradients, or `shadow-*` classes (phase-1 guards still pass)

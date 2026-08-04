# Editorial Redesign — Phases 4 & 5 (Tool Index + Cross-links)

**Date:** 2026-08-05
**Status:** Approved, ready for implementation
**Closes:** the "Quiet Authority" editorial redesign. Phases 1–3 shipped as PRs #4, #5, #6, #7.

---

## 1. Why

The homepage above the fold is redesigned; everything below it is not. `app/page.tsx`
renders `QuietHero` and `FactStrip` from phase 2, then drops straight into an unchanged
shadcn card grid with tinted icon tiles. `app/tools/page.tsx` renders the *same grid,
byte-for-byte*. Phase 4 replaces both with the editorial tool index. Phase 5 is one link.

Source: `design_handoff_editorial_redesign/README.md` §1c and §"Suggested build order" 4–5.
The handoff's `Design Review.html` tool-index mock is still live (unlike its hero and About
mocks, which are the rejected promotional v1).

---

## 2. Scope

**In:** `ToolCard`, `ToolChapter`, `ToolIndex`; featured "Start Here" row; numbered chapters
with subtitles; `ToolSidebar` editorial restyle; the stale tool count on `/tools`; UTM tags
on the `kevin.iol.ph` link.

**Out, deliberately:** the burn-rate "Adjusted Path" chart-area colour bug, the `orgs.ts`
hollow-dot visibility nit, the dangling `MarginNote` ochre rule. All three are real, all
three are recorded in the project memory, none belong to this phase.

---

## 3. Decisions taken during brainstorming — do not reopen

1. **No method sidebar.** The handoff spec'd a 280px sticky rail on `/tools` listing the
   five chapters with `IntersectionObserver` active tracking. It was written assuming
   `/tools` is a standalone page. It is not: `app/tools/layout.tsx` already wraps it in
   `ToolSidebar`, a 280px left rail listing all 16 tools grouped. A second rail is a
   layout fight for no gain. **Restyle the existing `ToolSidebar` instead** so `/tools`
   gets the chapter-navigation feel from the rail it already has.

2. **No sparklines.** The handoff put a hand-authored inline-SVG sparkline on each featured
   card. The featured group is `TOOL_GROUPS[0]` = `self-assessment` + `fundraising-guide` —
   a 25-question quiz and a 42-item checklist. Neither has a numeric series to preview, and
   inventing a decorative curve for them fails the Quiet Authority rule that homepage facts
   be verifiable. **Replace with a derived mono meta line** (§5.2).

3. **No per-card tag.** The handoff's card has a 10px mono uppercase ochre tag above the
   name. `TOOLS` entries have no tag data, and on a grouped index every card in a chapter
   would repeat the chapter heading directly above it. **Dropped.** Ochre stays reserved for
   the hover border, the chapter ordinal, and margin notes.

4. **Differentiated composition, shared card.** The homepage renders featured row +
   chapters; `/tools` renders chapters only. `/` and `/tools` currently serve identical
   grids — two indexed pages with the same content. `/tools` has the sidebar doing the
   orientation job, so a featured row there would be the third element on screen saying
   "start here". One `ToolCard` component removes the duplication that actually matters.

5. **Chapter subtitles are drafted here, approved before merge.** Five lines in §5.3.
   They are developer-drafted, unlike the margin notes (mined from Kevin's decks). They
   must not ship without sign-off.

6. **No `lastVerified` field.** The handoff asks for one on the compliance data. Phase 2
   decision 4 settled that a second date field can silently drift from the existing
   `DATA_LAST_UPDATED`. Nothing in this phase reopens it.

---

## 4. Architecture

Three new components under `components/tools/`. Both index pages become thin.

```
app/page.tsx          ──┐
                        ├─→ <ToolIndex featured />   ─→ <ToolChapter> ─→ <ToolCard>
app/tools/page.tsx    ──┘   <ToolIndex />
```

`ToolIndex` is a server component. Nothing here needs client JS — no observer, no state.
`ToolSidebar` stays a client component (it already is, for `usePathname`).

---

## 5. Components

### 5.1 `components/tools/tool-card.tsx`

```ts
interface ToolCardProps {
  tool: (typeof TOOLS)[number];
  ordinal: string;              // "01.2" | "00.01"
  variant?: "default" | "featured";
  meta?: string;                // featured only; e.g. "25 QUESTIONS · 6 CATEGORIES"
}
```

| Element | Spec |
|---|---|
| Container | `bg-card`, 1px `--rule` border, `18px 20px` padding, `rounded` (4px ceiling), flex column gap 10px, `relative` |
| Ordinal | absolute `top-3.5 right-5`, 11px mono, `--rule-strong`, `0.08em` |
| Name | 20px serif 600, line-height 1.2, `--foreground` |
| Description | 13px sans, `--muted-foreground`, line-height 1.5 |
| Hover | border → 1.5px `--ochre`. **No shadow** — a guard test fails the build on any `shadow-*` |

`variant="featured"`: name → 28px serif, padding → `28px 30px`, and `meta` renders at the
foot as 10px mono, `0.12em`, uppercase, `--muted-foreground`, above a 1px `--rule` top border.

Drop the tinted icon tile (`p-2 rounded-md bg-primary/10`) entirely. Lucide icons may be
retained at 14px in ink per the handoff, but not inside a coloured square — simplest is to
omit them from the card; `iconMap` stays in use by `ToolSidebar`.

### 5.2 Featured meta strings — derived, never typed

Both counts are read from the data they describe, same rule as `FactStrip`. Verified
2026-08-05: the values below are what the code currently produces.

| Tool | Source | Value |
|---|---|---|
| `self-assessment` | `QUIZ_QUESTIONS.length`, and `new Set(QUIZ_QUESTIONS.map(q => q.category)).size` from `lib/calculations/self-assessment.ts` | `25 QUESTIONS · 6 CATEGORIES` |
| `fundraising-guide` | `STAGE_ORDER.length`, and `STAGE_ORDER.reduce((n, s) => n + getStageChecklist(s).length, 0)` from `lib/calculations/fundraising-guide.ts` | `42 STEPS · 5 STAGES` |

`STAGE_CHECKLISTS` is module-private; `getStageChecklist` is already exported, so **no new
export is needed**. Do not add one.

Compute these in `ToolIndex` (or a small helper beside it) and pass as `meta`. Do not
hard-code the strings.

### 5.3 `components/tools/tool-chapter.tsx`

Renders one `TOOL_GROUPS` entry: mono ordinal + em-dash + serif heading, then the subtitle,
then a 1px `--rule` divider, then the grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`,
gap 4).

Heading line: `01 — Valuation & Fundraising` — ordinal in 11px mono `--ochre-deep`, heading
in 24px serif 600.
Subtitle: 13px sans, `--muted-foreground`, `max-w-[52ch]`.

**Subtitles to add as `subtitle` on each `TOOL_GROUPS` entry — DRAFT, requires sign-off:**

| Group | Subtitle |
|---|---|
| Start Here | Two ways to find out where you actually stand. |
| Valuation & Fundraising | What a round costs you, before you sign. |
| Revenue & Growth | Whether the unit works before you scale it. |
| Cash & Operations | How long the money lasts, and what the government wants from you. |
| MSME Toolkit | Five-year planning for cooperatives and small enterprises. |

### 5.4 `components/tools/tool-index.tsx`

```ts
interface ToolIndexProps {
  featured?: boolean;   // homepage only
}
```

- `featured` true: `TOOL_GROUPS[0]` renders as a 2-up grid (`grid-cols-1 md:grid-cols-2`)
  of `variant="featured"` cards with ordinals `00.01`, `00.02` — no chapter heading, it sits
  directly under `FactStrip`. Groups 1–4 render as chapters `01`–`04`.
- `featured` false: all five groups render as chapters `00`–`04`.

Card ordinals within a chapter are `{chapterOrdinal}.{index + 1}`, e.g. `01.1` … `01.4`.
Featured cards use the handoff mock's two-digit form, `00.01` and `00.02`. The asymmetry is
intentional — it is the mock's, and the featured pair is the only place it appears.

---

## 6. `ToolSidebar` restyle

`components/layout/tool-sidebar.tsx`. Structure is already correct; this is typography and
one active-state affordance. Apply the same changes to **both** the desktop `<nav>` and
`MobileToolNav` so they cannot drift.

- Group label `text-xs font-semibold uppercase tracking-wider` → the existing `eyebrow`
  utility (`app/globals.css:262`, 11px mono / `0.18em` — an exact spec match from phase 1),
  with a right-aligned `--rule-strong` count of the group's tools.
- Active item keeps its `bg-accent` tonal fill and gains a **1.5px `--ochre` left rule**.
  Note `--accent` is `#EFE9DD` (the paper-2 surface well), *not* ochre — phase 1 mapped it
  to the tonal step. The fill alone is too quiet to read as "you are here"; the rule carries it.
- 1px `--rule` hairline dividers between groups.
- Keep `usePathname`, keep the mobile disclosure behaviour, keep the icons.

---

## 7. Data and copy changes

**`lib/constants.ts`**
- Add `subtitle: string` to every `TOOL_GROUPS` entry (§5.3). The array is `as const`;
  adding a field is safe.

**`app/tools/page.tsx` — the stale count.** The page says "15 interactive financial tools"
in three places: the `h1` subtitle (line ~32), `metadata.description` (~18), and
`metadata.openGraph.description` (~22). `TOOLS` has **16** entries; this went stale when the
MSME tool landed and is in indexed metadata. Replace all three with `TOOLS.length` — a
template literal inside the static `metadata` export is fine. Fixing the digit without
wiring it to the array only resets the clock until tool 17.

**`app/about/page.tsx:118` — phase 5, in full.** The `kevin.iol.ph` href gains
`?utm_source=startupfinance.tools&utm_medium=referral&utm_campaign=about`. Nothing else.

---

## 8. Tests

New file `lib/__tests__/tool-index.test.ts`, following the `homepage-facts.test.ts` pattern:
pure data assertions and `node:fs` file-content sweeps. **No jsdom, no Testing Library** —
do not add a render runtime as a side effect of this work.

1. Every `TOOL_GROUPS` entry has a non-empty `subtitle`.
2. **Every `TOOLS` id appears in exactly one `TOOL_GROUPS` entry, and every grouped id
   exists in `TOOLS`.** This covers a live latent bug, not a hypothetical: both index pages
   do `TOOLS.find(...)` then `if (!tool) return null`, so a tool added to `TOOLS` but never
   grouped renders nowhere, silently, with no build error.
3. No hard-coded tool count in `app/page.tsx` or `app/tools/page.tsx` copy — sweep for a
   bare `15`/`16` adjacent to "tool". Pins the §7 bug class shut.
4. `components/tools/tool-card.tsx` contains no `shadow-` class. (The global
   `design-tokens.test.ts` sweep already covers this; a local assertion documents intent.)

Also confirm the existing colour-literal guard in `lib/__tests__/design-tokens.test.ts`
still passes — the new components must use tokens, not hex.

Baseline is **331 tests**; expect ~335.

---

## 9. Verification

```
pnpm exec vitest run          # NOT `pnpm test` — that is bare vitest and enters watch mode
pnpm build                    # the reliable gate; 35 routes
pnpm build && pnpm start      # then look at / and /tools in BOTH themes
```

Do **not** verify against `next dev` — a running dev server serves stale CSS for new token
values and it looks like a code defect.

Responsive check at 1280 / 920 / 760 / 375. Drive it with **same-origin iframes**
(`f.width = 375`), not `resize_window`: a snapped window silently ignores width changes and
reports success while `window.innerWidth` stays pinned, so the check tests nothing.

If a Recharts figure appears flat at ~18% height during automation, check `document.hidden`
before believing it — backgrounded tabs throttle rAF and the mount animation never completes.
Not applicable to this phase's components, but `/tools` links to pages full of charts.

---

## 10. Definition of done

- `/` and `/tools` both render the editorial index; no shadcn `Card` or tinted icon tile
  remains in either file.
- The card markup exists in exactly one place.
- Featured meta lines are derived; grepping for `"25 QUESTIONS"` finds nothing.
- `/tools` states 16 tools, from `TOOLS.length`.
- `ToolSidebar` desktop and mobile carry the same restyle.
- The `kevin.iol.ph` link is UTM-tagged.
- Subtitles signed off by Kevin.
- `pnpm exec vitest run` and `pnpm build` both pass; both themes checked against
  `pnpm start`.

Note `pnpm lint` fails on 5 **pre-existing** `react-hooks/set-state-in-effect` errors in
`ecosystem-banner`, `compliance-checklist`, and `fundraising-guide`. It is not a clean gate.
Scope eslint to the edited files rather than assuming this phase broke it.

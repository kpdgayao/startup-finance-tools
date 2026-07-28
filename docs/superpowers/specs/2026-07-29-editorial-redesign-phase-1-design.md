# Editorial Redesign — Phase 1 (Foundation)

**Date:** 2026-07-29
**Status:** Approved for planning
**Source:** `Startup Finance Tools Redesign.zip` → `design_handoff_editorial_redesign/`

---

## 1. Context

The handoff bundle specifies a full visual and structural redesign of startupfinance.tools —
from the default shadcn/Vercel identity to a warm **paper-and-ink editorial system**, governed
by a content constraint the docs call **Quiet Authority**.

The bundle is five files. Read them in this order:

| File | Authority |
|---|---|
| `Implementation Plan v2.html` | **Authoritative.** Quiet Authority model, revised backlog, DoD |
| `Dark Mode.html` | **Authoritative** for the dark palette and `SFT-105` |
| `README.md` | Consolidated handoff; token tables, per-screen specs |
| `Design Review.html` | **Partly superseded.** Its hero and About mocks are the *rejected* v1 (portrait, credentials grid, "Kevin"/"Method" nav). Its palette, type pairing, logo directions and tool-index mock remain live |
| `Brand Architecture.html` | Context only. Argues for `kevin.iol.ph` as a separate property |

The handoff proposes five phases at roughly one week each. **This spec covers Phase 1 only**
— the foundation. Phases 2–5 (homepage, margin notes + About, tool index, cross-links) each
get their own spec and plan cycle.

### Why Phase 1 alone

Phase 1 is self-contained, unblocks every later phase, and carries the only risk that isn't
purely visual: the site is **dark-only today** (`app/layout.tsx` hardcodes
`className="dark"`), and this phase flips all 27 pages from neutral-dark to light-first
editorial in one move. Nothing downstream can be evaluated until that has landed and been
looked at.

### Decisions taken during design

| Decision | Choice | Rationale |
|---|---|---|
| Logo direction | **A — editorial monogram** | Only direction with a *specified* dark treatment. B and C would need one invented. Zero new SVG assets |
| Typographic depth | **Level 2** — tokens + global editorial base layer | Level 1 (token values only) leaves the site reading as shadcn in warm colours, which misses the point of the redesign. Level 3 is Phase 4 |
| Chart series | **B — extended muted set** | Slots 1–3 match the spec exactly; 4–10 reuse existing semantic colours plus three low-chroma hues, so 6-holder cap tables stay readable |
| Sequencing | **B — mechanism first, then aesthetics** | Isolates the only functionally risky work (theme toggle) from the large visual diff |
| Theme default | Follow the spec: `prefers-color-scheme` on first visit | Per README. Note this changes the site's out-of-box appearance |
| 106 hardcoded hexes | **In Phase 1** | Tailwind blue on `#F6F2EA` paper is the most visible way this redesign could ship broken |
| `export-pdf-button.tsx` `PRINT_CSS` (27 hexes) | **Deferred** | Theme-independent; invisible on-screen. Own ticket later |
| Newsletter email gradient | **Deferred** | Email template, not a page. Would drag email-client testing into a visual phase |

### Out of scope

Layout changes, `QuietHero`, `FactStrip`, `MarginNote`, `/about`, the tool index redesign,
`lib/notes.ts`, `lib/kevin.ts`, `lib/orgs.ts`, `subtitle` on `TOOL_GROUPS`, `lastVerified`
on the compliance data, and `kevin.iol.ph`. One deliberate exception is noted in §4.

---

## 2. Architecture

Phase 1 splits into two independently-verifiable steps with almost no file overlap.

```
1a  Theme mechanism      functional  ~4 files   no visual change
1b  Editorial swap       visual      ~20 files  no functional change
```

The split is free because 1a touches `layout.tsx` + `header.tsx`, while 1b touches
`globals.css` + primitives + the colour files. Reviewing them separately means a rendering
bug is attributable to one half or the other, rather than to a diff that changed both the
theme mechanism and every colour on the site simultaneously.

---

## 3. Step 1a — Theme mechanism

**Goal:** a working light/dark toggle with *no visual change to the site*. Dark looks
identical to today; light is stock shadcn light.

### Behaviour

- State is `'light' | 'dark'`, persisted under a single `localStorage` key.
- Key absent → follow `prefers-color-scheme`. Key present → it wins permanently.
- Applied as `.dark` on `<html>`.

`app/globals.css` already declares `@custom-variant dark (&:is(.dark *))`, so the class
strategy is wired. 1a only has to drive the class.

### Implementation: `next-themes`

Add `next-themes` rather than hand-rolling. Correctness here means handling four things, not
one: pre-paint, hydration mismatch on the toggle's own icon, cross-tab sync via the `storage`
event, and OS theme changes while the tab is open. `next-themes` handles all four in ~3 KB,
is what shadcn's own documentation recommends, and internally does exactly what the handoff
describes (`suppressHydrationWarning` + inline pre-paint script) — so it satisfies the
requirement rather than sidestepping it.

`ThemeProvider` is a client component but renders `{children}` untouched, so server
components below it stay server components — the same shape as the `TooltipProvider` already
in `layout.tsx`.

The equivalent pre-paint logic, for reference and for the acceptance criteria below:

```js
(function () {
  try {
    var stored = localStorage.getItem('sft-theme');
    var dark = stored ? stored === 'dark'
                      : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
```

`colorScheme` is not decorative — it is what makes native scrollbars, date pickers and
autofill backgrounds match the theme. Omitting it is the usual reason a working toggle still
looks half-broken. The `try/catch` is because `localStorage` throws outright in Safari
private mode.

### Files

| File | Change |
|---|---|
| `app/layout.tsx` | Remove hardcoded `className="dark"`; add `suppressHydrationWarning` to `<html>`; mount `ThemeProvider` |
| `components/shared/theme-toggle.tsx` | **New.** Client component, icon-only sun/moon, `aria-label` reflecting the target state |
| `components/layout/header.tsx` | Mount the toggle beside the nav |
| `package.json` | Add `next-themes` |

### Acceptance criteria

- Hard reload in dark shows no light flash, and vice versa — **verified with network
  throttled**, since that is when a non-blocking script loses the race.
- No hydration warning in the console on any route.
- Toggle persists across reload; a second tab follows within a paint.
- With `localStorage` cleared, OS preference decides — verified in both directions.
- `pnpm build` succeeds and generates every page (27 pages + 3 API routes).
- Screenshots before/after in dark mode are visually identical.

---

## 4. Step 1b — Editorial swap

**Goal:** the full identity change, with no functional change.

### 4.1 Fonts

```ts
const serif = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],            // 8–60, as specified
  display: "swap",
});
const sans = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap" });
```

All three are available as variable fonts in the installed Next 16 (verified against
`next/dist/compiled/@next/font/dist/google/font-data.json`), so `wght` comes free and no
weight arrays are needed. `@theme inline` maps `--font-sans` / `--font-serif` / `--font-mono`
onto them — the same indirection the current Geist setup uses — which makes `font-serif` a
real Tailwind utility.

**Perf watch:** this goes from 2 font files to 4 (serif roman, serif italic, Inter,
JetBrains). The DoD requires Lighthouse mobile performance at or above baseline, so it is
measured before and after, not assumed.

### 4.2 Token mapping

Both `:root` and `.dark` blocks in `app/globals.css` are rewritten from the README and
`Dark Mode.html` token tables, with `--radius: 0.25rem`.

**Brand tokens.** shadcn has no token for an accent *colour* (see correction (a) below), nor
for links or semantic status colours. These are added alongside the shadcn set, defined in
both blocks:

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ochre` | `#B98548` | `#D9A45F` | Primary accent |
| `--ochre-deep` | `#8E6230` | `#F0C88B` | Accent text on light; ochre CTA fill |
| `--rule-strong` | `#B6AB95` | `#4A4530` | Emphasis rules, axis lines |
| `--link` | `#2C5C5C` | `#6FA9A2` | Prose link default (teal) |
| `--link-hover` | `#8E6230` | `#D9A45F` | Prose link hover (ochre) |
| `--good` | `#4A6B3F` | `#8FB77C` | Success, positive delta |
| `--warn` | `#B05A2C` | `#D9925F` | Caution |
| `--bad` | `#94342C` | `#D98878` | Negative. `--destructive` aliases this |

`--good` / `--warn` / `--bad` deliberately share values with `--chart-4` / `--chart-8` /
`--chart-5`. They are separate names because they carry different meaning — a chart series
slot and a semantic status are not the same thing even when they render identically, and
§4.8 depends on that distinction.

Three corrections to the handoff's literal mapping:

**(a) `--accent` must not become ochre.** In shadcn, `--accent` is the *hover-surface*
token — it paints dropdown item hovers, ghost-button hovers, command-palette rows. The Dark
Mode table lists `--accent (ochre)`; following that literally turns every hover state on the
site into a solid ochre block. Ochre gets its own `--ochre` / `--ochre-deep` tokens;
`--accent` stays a neutral surface (`--paper-2` in light, `#262319` in dark). The design
intent — ochre as *the* accent colour — is preserved; only the token name changes.

**(b) A blanket `a { color }` rule would repaint the tool cards.** The handoff says to
define `a` and `a:hover` in the base layer. But every tool card is anchor-wrapped —
`<Link href={tool.href}><Card>…</Card></Link>` — so a global rule makes card titles and
descriptions teal. Scope it to prose contexts:

```css
@layer base {
  a { color: inherit; text-decoration: none; }
  :where(p, li, dd, blockquote) a {
    color: var(--link);
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
  }
  :where(p, li, dd, blockquote) a:hover { color: var(--link-hover); }
}
```

Inline prose links get the specified teal→ochre treatment; structural links inherit.

**(c) `Card` is `rounded-xl`.** With `--radius: 0.25rem`, shadcn's derived `rounded-xl`
computes to **8px** — double the 4px the design allows, on the most visible surface on the
site. `card.tsx` moves to `rounded-lg` (= 4px). Everything else resolves correctly:
`rounded-md` → 2px, matching "buttons and small chips 2px."

`rounded-full` is retained on the six controls that use it (switch thumb, radio, avatar).
"Nothing above 4px" is a rule about cards and frames; squaring off a radio button reads as a
bug, not as editorial.

### 4.3 Base layer

Beyond the link rules above:

- `h1–h4` in `var(--font-serif)`, weight 600, `letter-spacing: -0.015em`, `text-wrap: balance`.
- `@utility eyebrow` — mono, 11px, `0.18em`, uppercase, `--muted-foreground`, weight 500.
- `font-variant-numeric: tabular-nums` on table cells plus a `.tabular` utility, so
  calculator outputs stop shifting as they update.

**Known limitation, accepted:** a global `h1–h4` rule does not catch every heading. Several
calculator pages use `CardTitle` (which renders a `div`) and plain `<p>` for section labels.
Those stay sans until later phases reach them. The alternative is editing page files, which
is precisely what Phase 1 excludes.

### 4.4 Primitives

- `card.tsx` — `rounded-xl` → `rounded-lg`, remove `shadow-sm`.
- `button.tsx` — remove `shadow-xs`; add an **`ochre` variant**.
- 9 further `components/ui/*` files — strip `shadow-*`. 11 of the 22 site-wide occurrences
  live in shadcn primitives.

Dialogs, sheets and select popovers lose their drop shadow and gain a surface step plus a
border, per the design's "elevate with surface, not shadow." This is coherent with the
system but means overlay components are re-checked by eye in both themes.

**On the `ochre` button variant:** the design's primary CTA is ochre-filled while `--primary`
is specified as ink. These are not in conflict — the prototype's `styles.css` has `.btn` and
`.btn.ochre` as separate things. Adding the variant now means Phase 2's hero does not need
arbitrary classes.

### 4.5 Logo — direction A

Italic serif `SF` in a solid `--ink` tile (26px header, 44px large), paired with a serif
wordmark and a mono qualifier. In dark the tile inverts to `--ochre` fill with a `#16150F`
letterform — a solid bone tile would be the brightest object on the page.

Touches `components/shared/logo.tsx`, `public/logo-icon.svg`, `public/logo-full.svg`,
`app/icon.svg`. Deletes the `sft-bar` / `sft-line` blue→violet gradient defs.

### 4.6 Chart tokens

`--chart-1` through `--chart-10` defined in both blocks from series B:

| # | Light | Dark | Role |
|---|---|---|---|
| 1 | `#1A1815` | `#EFE9DB` | Primary series — the only token that swaps role between themes |
| 2 | `#B98548` | `#D9A45F` | Ochre |
| 3 | `#2C5C5C` | `#6FA9A2` | Teal |
| 4 | `#4A6B3F` | `#8FB77C` | Olive / positive |
| 5 | `#94342C` | `#D98878` | Brick / negative |
| 6 | `#4A5A6B` | `#8AA0B8` | Slate |
| 7 | `#6A5A7A` | `#A796B8` | Plum |
| 8 | `#B05A2C` | `#D9925F` | Rust / caution |
| 9 | `#7C8B6F` | `#A8B899` | Sage |
| 10 | `#8E6230` | `#F0C88B` | Ochre-deep |

`CHART_COLORS` in `lib/constants.ts` becomes `["var(--chart-1)", …, "var(--chart-10)"]`.

The array **cannot shrink below ten**: `pre-post-money`, `valuation-calculator` and
`safe-calculator` index into it directly (`CHART_COLORS[index]`) rather than with a modulo,
so a shorter array produces undefined fills on wide charts.

Recharts passes these straight to SVG `fill`/`stroke`, where custom properties resolve
normally — the same mechanism shadcn's own chart component uses. Charts then follow the theme
toggle with zero JS.

### 4.7 Gradient removal

28 occurrences across 8 files (case-insensitive — `linearGradient` is camelCase, which a
naive `grep gradient` misses):

| File | What | Phase 1 |
|---|---|---|
| `components/shared/logo.tsx`, `public/logo-*.svg`, `app/icon.svg` | Blue→violet logo gradients | Yes — §4.5 removes them |
| `app/page.tsx` | Hero radial mask + `bg-gradient-to-b` | Yes |
| `app/tools/burn-rate/page.tsx` (6) | Recharts `<linearGradient>` area fills | Yes |
| `app/tools/cash-flow-forecast/components/cash-flow-charts.tsx` (3) | Same | Yes |
| `app/api/newsletter/subscribe/route.ts` (1) | Blue→violet rule in welcome **email** HTML | **No — deferred** |

The two chart files are a genuine design change, not a find-and-replace: those gradients are
the area fills under the runway and cash-flow curves, and flattening them per "no gradients,
including charts" changes how both charts read.

Removing the hero gradient block from `app/page.tsx` is technically a layout change, which
Phase 1 otherwise excludes. It is included deliberately: it deletes one decorative `<div>`
rather than restructuring anything, and leaving it fails the phase's own definition of done.
**The hero's content is untouched** until Phase 2.

### 4.8 The 106 hardcoded hexes

Across 11 files, outside `CHART_COLORS` entirely. A blind find-and-replace is wrong, because
these colours carry meaning: `#22c55e` is "runway healthy" in `burn-rate` and "positive
variance" in `financial-model-results` — same hex, different tokens. Map by role:

| Current | Count | Role | → |
|---|---|---|---|
| `#3b82f6` | 24 | Primary data series | `--chart-1` |
| `#22c55e` | 20 | Positive / healthy | `--chart-4` / `--good` |
| `#ef4444` | 8 | Critical / negative | `--destructive` |
| `#f59e0b` | 7 | Caution | `--warn` |
| `#8b5cf6` | 7 | Fourth series | `--chart-7` |
| `#e5e7eb` | 2 | Divider | `--border` |
| `#1d4ed8`, `#f97316` | 2 | Incidental | nearest series token |

Distribution by file: `msme-financial-plan` (14), `cash-flow-charts` (13),
`financial-model-results` (10), `burn-rate` (10), `unit-economics` (8), `market-sizing` (6),
`logo` (5), `self-assessment` (2), `safe-calculator` (1), `pre-post-money` (1).

`RUNWAY_ZONES` already exists in `lib/constants.ts` as a numeric threshold constant with no
colours attached. The semantic trio (`good` / `warn` / `bad`) belongs beside it rather than
scattered as `var(--good)` strings through six files.

**Excluded:** the 27 hexes in `components/shared/export-pdf-button.tsx`.

---

## 5. Verification

There is no test coverage for any of this, and `pnpm lint` already fails on 5 pre-existing
`react-hooks/set-state-in-effect` errors — so it is **not** a gate, and a green-vs-red
comparison is meaningless.

| Check | Standard |
|---|---|
| `pnpm build` | Hard gate. Every page generates, TypeScript clean |
| `pnpm test` | Pass count unchanged. Nothing here touches `lib/calculations/`, so movement means something went wrong |
| `pnpm lint` | Scoped to changed files only, compared against the same files pre-change |
| Route sweep | 27 pages × 2 themes, by hand. Priority: the **13 tools that render Recharts**, then the 10 with PDF export, then the rest |
| `grep -riE "linear-gradient\|linearGradient"` | Returns only `app/api/newsletter/subscribe/route.ts` |
| `grep -rE "#[0-9a-fA-F]{6}"` | Returns nothing outside `export-pdf-button.tsx` and `globals.css` |
| Contrast | Body AAA, accents AA, both themes. Verifiable numbers, not opinion |

The route sweep is the real cost of this phase. Naming it is better than pretending the build
covers it.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Pre-paint script conflicts with Next 16 streaming | Isolated into 1a and verified alone, before any visual change exists to confound it |
| Light mode has never been looked at — the site has been dark-only since launch | The 35×2 route sweep is mandatory, not optional. Expect real findings, and budget for them |
| Shadow removal on overlays (dialog, sheet, select) leaves them poorly separated in dark | Surface step + border per the design; re-checked by eye in both themes |
| Recharts does not resolve CSS custom properties in some prop it consumes | Proven pattern (shadcn's own chart component). Verified on all 13 Recharts tools during the sweep; tooltip and legend swatches checked explicitly |
| 4 font files instead of 2 regresses Lighthouse mobile | Measured before and after; `display: swap` and variable fonts throughout |
| Semantic mis-mapping of a hex changes what a chart *means* | Mapping is by role, not by value; the two same-hex-different-meaning cases are called out in §4.8 |

---

## 7. Deferred from this phase

| Item | Where it goes |
|---|---|
| `export-pdf-button.tsx` `PRINT_CSS` — 27 hexes, `#2563eb` header rule | Own ticket. Exported PDFs stay blue-branded until then |
| Newsletter welcome-email gradient | Own ticket, with email-client testing |
| Headings using `CardTitle` / `<p>` that the `h1–h4` rule misses | Phases 2–4, as each page is rebuilt |
| `Callout` vs `MarginNote` overlap — both are ruled asides with tonal variants | Phase 3, when `MarginNote` is designed |
| `EcosystemStrip` / `EcosystemBanner` vs the `kevin.iol.ph` footer module | Phase 5. Reconcile with the existing IOL ecosystem cross-promotion design |
| `Design Review.html`'s superseded v1 hero and About mocks | Not implemented at any phase. Defer to Implementation Plan v2 |

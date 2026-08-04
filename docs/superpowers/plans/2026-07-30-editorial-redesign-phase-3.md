# Editorial Redesign Phase 3 (Margin Notes, About, Footer, Result Card) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the redesign's "competence surface" — unsigned, opinionated margin notes beside tool results; a rebuilt `/about` that concentrates all credentials in one place; the editorial footer typography; and the result-card's light-ink-slab / dark-surface-step-3 treatment — the one component whose light-mode trick doesn't transfer to dark.

**Architecture:** Four workstreams with almost no file overlap. **A** (`MarginNote` + `lib/notes.ts` + tool-page wiring) is the highest-leverage and ships the guard test first. **B** (`/about` rebuild + `lib/kevin.ts` + `lib/orgs.ts` + two new components) is the largest. **C** (footer typography) is the smallest. **D** (result-card) is the one that differs between themes. The byline copy change to `quiet-hero.tsx` lands in Task 1 so the homepage-facts guard stays green throughout. Tasks 1–4 can largely proceed in parallel; Task 5 (About) is the long pole. All 17 margin-note bodies are pre-written in the spec — no content is blocked.

**Tech Stack:** Next.js 16.1.6 (App Router, RSC), React 19.2.3, TypeScript, Tailwind CSS v4 (`@theme inline` tokens), shadcn/ui, Recharts 3.7, Vitest 4, pnpm 10.28.2. `react-markdown@^10.1.0` + `remark-gfm@^4.0.1` are already dependencies — use them for the `MarginNote` markdown renderer; do not write an inline renderer.

**Spec:** `docs/superpowers/specs/2026-07-30-editorial-redesign-phase-3-design.md`

**Branch:** `feat/editorial-redesign-phase-3` (create from `master`). Do **not** work on `master` — Railway auto-deploys it on every push.

**Working directory:** `C:/Users/ASUS TUF/Projects/startup-finance-tools/app`. This directory *is* the git repo; the project root above it is not. Run all `git`, `pnpm`, and path-relative commands from here.

---

## Global Constraints

These apply to every task. Phase 1 shipped guard tests in `lib/__tests__/design-tokens.test.ts` that fail the build on violations; Phase 2 shipped `lib/__tests__/homepage-facts.test.ts`. Both must stay green.

- **No hex colour literals** in `.tsx`/`.ts`/`.svg` under `app/`, `components/`, `lib/`, `public/`. Use CSS custom properties or the Tailwind utilities mapped from them. The one deliberate exception is `lib/notes.ts` and `lib/kevin.ts` / `lib/orgs.ts` if they contain no markup — but they should contain none, so the guard stays green by construction.
- **No gradients** anywhere — the guard greps `/gradient/i` case-insensitively. The allowlisted newsletter email-template gradient is the only exception and this plan does not touch it.
- **No `shadow-*` classes** (`shadow-none` is permitted). Elevation comes from surface steps and hairline borders. The result-card change removes the implicit shadcn card shadow; do not reintroduce it.
- **No Tailwind palette utilities** (`text-blue-500`, `bg-teal-600`, …). Neutral ramps are out of scope of the guard but still shouldn't be needed.
- **No `hsl(var(--x))` / `oklch(var(--x))` wrapping** — the tokens are already complete colours.
- **Radius ceiling 4px.** `--radius: 0.25rem`, so `rounded-md` computes to 2px and `rounded-lg` to 4px. Nothing larger.
- **Author name appears at most twice per page** outside `/about`. Enforced by `homepage-facts.test.ts` (Phase 2). `/about` is the exception — the full credentials live there and only there. A new guard in Task 5 pins `/about` to at most two mentions as well (rail + close).
- **No component-rendering tests.** This repo has no jsdom or Testing Library, and the 331 passing tests are all pure data assertions or file-content sweeps. Follow that pattern — do not add a test runtime as a side effect of this plan. Visual correctness is verified by `pnpm build` plus the manual pass in Task 7.
- **Verification gates:** `pnpm exec vitest run` and `pnpm build`. **Not** `pnpm lint` — it fails with 5 pre-existing `react-hooks/set-state-in-effect` errors in `ecosystem-banner`, `compliance-checklist` and `fundraising-guide`, none of which this plan touches.
- **Run tests as `pnpm exec vitest run`, not `pnpm test`.** The `test` script is bare `vitest`, which enters watch mode in an interactive terminal and will appear to hang. The suite stands at **331 passing** at the branch point; this plan adds tests across two new files.
- **Margin-note content is final.** The 17 note bodies in the spec (§3.2) are mined from the author's presentation decks and approved. Do not rewrite, soften, or "improve" them. If a note reads as opinionated, that is the point — the opinion is the value.
- **`react-markdown` is already a dependency.** Use it + `remark-gfm` for the `MarginNote` body. Do not write a hand-rolled markdown parser and do not pull in a full MDX pipeline.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `components/home/quiet-hero.tsx` | **Modify.** Byline copy only — replace the Phase 2 credentials-form line with the client-directed humble wording. No layout change. | 1 |
| `lib/__tests__/margin-notes.test.ts` | **New.** Guards every note: non-empty body, valid tone, no self-referential terms, minimum counts per tool id. | 1 |
| `lib/notes.ts` | **New.** The 17 margin-note bodies keyed by tool id. Content is in the spec §3.2 — copy verbatim. | 1 |
| `components/shared/margin-note.tsx` | **New.** The ochre-ruled aside. Looks up `NOTES[toolId][noteIndex]`, renders the "Note" label + markdown body. Renders nothing when the key is absent. | 1 |
| `components/shared/result-card.tsx` | **Modify.** Light-mode ink slab + dark-mode surface step 3, serif numeral, tabular-nums, ochre unit. | 2 |
| `app/tools/unit-economics/page.tsx` | **Modify.** Wrap the Key Metrics result grid in the `1fr 230px` grid with a `<MarginNote>` in the right column. | 3 |
| `app/tools/valuation-calculator/page.tsx` | **Modify.** Same grid wrapper + `<MarginNote>`. | 6 |
| `app/tools/equity-simulator/page.tsx` | **Modify.** Same. | 6 |
| `app/tools/safe-calculator/page.tsx` | **Modify.** Same. | 6 |
| `app/tools/burn-rate/page.tsx` | **Modify.** Same. | 6 |
| `app/tools/compliance-checklist/page.tsx` | **Modify.** Same. | 6 |
| `components/layout/footer.tsx` | **Modify.** Editorial typography only — serif wordmark, mono qualifier, hairline rules. Copy unchanged. | 4 |
| `lib/kevin.ts` | **New.** Bio chunks, grant timeline (with the 2018 angel-investment correction), role lines. Consumed by `/about` only. | 5 |
| `lib/orgs.ts` | **New.** Org listings with `{ name, kind }`. Single source of truth. | 5 |
| `components/about/grant-timeline.tsx` | **New.** The `<dl>` renderer for the timeline array. | 5 |
| `components/about/organization-wall.tsx` | **New.** The wrap-flow org row. Only page that renders it. | 5 |
| `app/about/page.tsx` | **Modify (full rebuild).** Two-column: left rail (portrait + timeline), right column (bio + pull-quote + org wall + CTA). | 5 |
| `lib/__tests__/about-content.test.ts` | **New.** Guards `lib/kevin.ts` timeline entries, `lib/orgs.ts` kinds, and the `/about` name-count limit. | 5 |
| `public/about-portrait.jpg` | **New.** Copied from `C:/Users/ASUS TUF/OneDrive/Pictures/kpdg profile photo.jpg`. | 5 |

`components/about/` is a new directory, matching the existing `components/home/`, `components/layout/`, `components/shared/` split.

---

### Task 1: Byline copy + `MarginNote` component + `lib/notes.ts` + guard test

The homepage hero byline must change first: Task 5's `/about` rebuild will add the author's name to `/about`, and the `homepage-facts.test.ts` guard counts `components/home/quiet-hero.tsx`. Updating the byline now keeps the guard green throughout. The `MarginNote` component and its content land together so the guard test can exercise them immediately.

**Files:**
- Modify: `components/home/quiet-hero.tsx` (byline `<p>` only, ~line 341)
- Create: `lib/__tests__/margin-notes.test.ts`
- Create: `lib/notes.ts`
- Create: `components/shared/margin-note.tsx`

**Interfaces:**
- Consumes: `react-markdown` + `remark-gfm` (already in `package.json`).
- Produces: `export function MarginNote({ toolId, noteIndex?, className? })` from `@/components/shared/margin-note`. Tasks 3 and 6 render it inside tool pages. `lib/notes.ts` exports `NOTES`, `NoteTone`, `MarginNoteData`.

- [ ] **Step 1: Update the hero byline**

In `components/home/quiet-hero.tsx`, replace the byline `<p>` block (the `mt-[34px]` paragraph at ~line 341) with:

```tsx
      <p className="mt-[34px] max-w-[60ch] border-t pt-[14px] text-[13px] leading-[1.6] text-muted-foreground">
        Built by{" "}
        <Link href="/about" className="text-ink-2 hover:text-ochre-deep">
          Kevin Philip Gayao
        </Link>
        , derived from over a decade of fundraising experience and teaching.
      </p>
```

The only change from the Phase 2 copy is the text after the `</Link>`: the credentials-form "— CPA, MBA, CEO of IOL Inc." becomes ", derived from over a decade of fundraising experience and teaching." The name still links to `/about` and stays in `text-ink-2`. The `homepage-facts` guard counts "Kevin" — this keeps it at 1 in the hero, so the homepage total stays 2 (hero 1 + footer 1).

- [ ] **Step 2: Verify the homepage guard still passes**

Run: `pnpm exec vitest run homepage-facts`

Expected: PASS, 4 tests. The author-name count is unchanged (hero 1 + footer 1 = 2).

- [ ] **Step 3: Create `lib/notes.ts`**

Copy the full `NOTES` object verbatim from the spec §3.2. It is 17 notes across six tool ids. The file shape:

```ts
export type NoteTone = "rule" | "watch" | "ph";

export interface MarginNoteData {
  tone: NoteTone;
  body: string;          // markdown — may contain formulas, links to Learn modules
}

export const NOTES: Record<string, MarginNoteData[]> = {
  "valuation-calculator": [ /* 3 notes */ ],
  "equity-simulator":     [ /* 3 notes */ ],
  "safe-calculator":      [ /* 3 notes */ ],
  "burn-rate":            [ /* 3 notes */ ],
  "unit-economics":       [ /* 2 notes */ ],
  "compliance-checklist": [ /* 3 notes */ ],
};
```

Do not paraphrase, soften, or reorder the note bodies. They are client-approved content mined from the author's decks. If a note reads as blunt ("Push back gently but push back."), that is the intended voice.

- [ ] **Step 4: Create the guard test**

Create `lib/__tests__/margin-notes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { NOTES, type NoteTone } from "@/lib/notes";

const REQUIRED_TOOLS = [
  "valuation-calculator",
  "equity-simulator",
  "safe-calculator",
  "burn-rate",
  "unit-economics",
  "compliance-checklist",
] as const;

const VALID_TONES: NoteTone[] = ["rule", "watch", "ph"];

// A note that mentions the author's name, firm, credentials, or seminars is
// a failed note — the whole point of the margin note is inferred authority,
// not asserted authority. Case-insensitive.
const FORBIDDEN = ["kevin", "iol", "credential", "seminar", "gayao"];

describe("margin notes", () => {
  it("ships at least 12 notes total", () => {
    const total = Object.values(NOTES).reduce((n, arr) => n + arr.length, 0);
    expect(
      total,
      `Expected at least 12 margin notes; found ${total}.`
    ).toBeGreaterThanOrEqual(12);
  });

  it("covers every required tool id with at least 2 notes", () => {
    for (const toolId of REQUIRED_TOOLS) {
      const arr = NOTES[toolId] ?? [];
      expect(
        arr.length,
        `${toolId} must have at least 2 notes; found ${arr.length}.`
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("every note has a non-empty body and a valid tone", () => {
    for (const [toolId, arr] of Object.entries(NOTES)) {
      expect(arr.length, `${toolId} has an empty notes array`).toBeGreaterThan(0);
      for (let i = 0; i < arr.length; i++) {
        expect(
          arr[i].body.trim(),
          `${toolId}[${i}] has an empty body`
        ).not.toBe("");
        expect(
          VALID_TONES,
          `${toolId}[${i}] has tone "${arr[i].tone}", expected one of ${VALID_TONES.join(", ")}`
        ).toContain(arr[i].tone);
      }
    }
  });

  it("no note mentions the author, firm, credentials, or seminars", () => {
    const failures: string[] = [];
    for (const [toolId, arr] of Object.entries(NOTES)) {
      arr.forEach((note, i) => {
        const low = note.body.toLowerCase();
        for (const term of FORBIDDEN) {
          if (low.includes(term)) {
            failures.push(`${toolId}[${i}] contains "${term}"`);
          }
        }
      });
    }
    expect(
      failures,
      `Margin notes must be unsigned and self-referential-free. ` +
        `Found forbidden terms: ${failures.join(", ")}`
    ).toEqual([]);
  });
});
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `pnpm exec vitest run margin-notes`

Expected: PASS, 4 tests. The content is already final, so passing on first write is correct — these are characterization guards, not TDD drivers.

- [ ] **Step 6: Create the `MarginNote` component**

Create `components/shared/margin-note.tsx`:

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { NOTES } from "@/lib/notes";

interface MarginNoteProps {
  toolId: string;
  noteIndex?: number;
  className?: string;
}

export function MarginNote({ toolId, noteIndex = 0, className }: MarginNoteProps) {
  const notes = NOTES[toolId];
  // A tool with no note content renders nothing — the absence is invisible.
  // Do not render a placeholder.
  if (!notes || notes.length === 0 || noteIndex >= notes.length) return null;
  const note = notes[noteIndex];

  return (
    <aside
      className={cn(
        "border-l-[2px] border-ochre pl-[15px]",
        className
      )}
      aria-label="Editor's note"
    >
      <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ochre-deep dark:text-ochre">
        Note
      </p>
      <div
        className="mt-2 font-serif text-[14.5px] leading-[1.5] text-ink-2 [&_a]:text-link [&_a:hover]:text-ochre-deep [&_a]:underline [&_a]:underline-offset-[3px] [&_code]:font-mono [&_code]:text-[13px]"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.body}</ReactMarkdown>
      </div>
    </aside>
  );
}
```

Notes on the implementation:
- `border-ochre`, `text-ochre-deep`, `text-ochre`, `text-ink-2`, `text-link` are the Tailwind utilities generated from the `@theme inline` mappings — no `var()` or hex, so the colour guards stay green.
- `ReactMarkdown` is already a dependency (`^10.1.0`). The `[&_a]` arbitrary selectors style links inside the rendered markdown without a custom component map — keep it simple.
- `aria-label="Editor's note"` gives screen readers a label without adding visible attribution text.
- The component returns `null` for absent tool ids — this is deliberate so a tool page can always render `<MarginNote toolId="..." />` and get nothing when no note exists.

- [ ] **Step 7: Run the full suite and the build**

Run: `pnpm exec vitest run`

Expected: all pass, 331 → 335 (4 new margin-notes tests). The colour guards in `design-tokens.test.ts` must pass — if `has no hardcoded hex colours` fails, a hex slipped into `margin-note.tsx` or `notes.ts`; use the token utilities.

Run: `pnpm build`

Expected: success, same route count as before (the new files are not yet wired into any page, so no new routes).

- [ ] **Step 8: Commit**

```bash
git add components/home/quiet-hero.tsx lib/notes.ts lib/__tests__/margin-notes.test.ts components/shared/margin-note.tsx
git commit -m "feat(notes): MarginNote component, 17 margin notes, humble byline

Ships the redesign's core competence surface: an unsigned, ochre-ruled
aside beside tool results. 17 notes across six tools, mined from the
author's presentation decks and guarded by a test that fails on any
self-referential term. The hero byline is shortened to the client-directed
humble wording so the homepage-facts name-count guard stays green.

Content is final — do not paraphrase the note bodies."
```

---

### Task 2: Result-card light-ink-slab + dark-surface-step-3

The one component whose light-mode trick doesn't transfer to dark. Current state: pre-redesign shadcn `Card` with subtle `bg-good/5` / `bg-warn/5` / `bg-bad/5` variant tints and a `text-2xl font-bold` value. No ink slab exists yet.

**Files:**
- Modify: `components/shared/result-card.tsx` (full rewrite of the render; keep the props interface and variant icons)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the same `export function ResultCard({...})` signature, so no call site changes. Tasks 3 and 6 compose it inside the margin-note grid.

- [ ] **Step 1: Rewrite the component**

Replace the body of `components/shared/result-card.tsx` with:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface ResultCardProps {
  label: string;
  value: string;
  sublabel?: string;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const variantIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

export function ResultCard({
  label,
  value,
  sublabel,
  variant = "default",
  className,
}: ResultCardProps) {
  const Icon = variant !== "default" ? variantIcons[variant] : null;

  // Light mode: solid --ink slab with paper text — maximum contrast against
  // the page. Dark mode: NOT a bone slab (it would glare). Surface step 3
  // (--muted dark = #262319) with a --rule-strong (#4A4530) hairline, and the
  // ochre numeral carries the emphasis instead. This is the only component
  // in the app whose treatment genuinely differs between themes.
  return (
    <Card
      className={cn(
        "border bg-ink text-paper dark:bg-muted dark:border-rule-strong",
        variant === "success" && "dark:border-good/40",
        variant === "warning" && "dark:border-warn/40",
        variant === "danger" && "dark:border-bad/40",
        className
      )}
    >
      <CardContent className="p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/70 dark:text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 break-words font-serif text-[32px] leading-none tabular tracking-[-0.01em]",
            variant === "success" && "text-good",
            variant === "warning" && "text-warn",
            variant === "danger" && "text-bad"
          )}
          title={value}
        >
          {Icon && (
            <Icon
              className={cn(
                "inline-block h-5 w-5 mr-1.5 -mt-0.5",
                variant === "success" && "text-good",
                variant === "warning" && "text-warn",
                variant === "danger" && "text-bad"
              )}
            />
          )}
          {value}
        </p>
        {sublabel && (
          <p className="mt-1 text-xs text-paper/60 dark:text-muted-foreground">
            {sublabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

Notes:
- `bg-ink`, `text-paper`, `bg-muted`, `border-rule-strong` are the Tailwind utilities mapped from the `@theme inline` tokens — no hex literals, so the colour guards stay green.
- `text-paper/70` and `text-paper/60` use Tailwind's opacity modifier on a token colour — this works because `@theme inline` exposes `--color-paper` as `text-paper`. If the opacity modifier does not compile, fall back to `text-muted-foreground` for the label/sublabel in light mode too; the slab contrast is carried by the numeral, not the label.
- `tabular` is the utility the existing `FactStrip` already uses for `font-variant-numeric: tabular-nums` (see `components/home/fact-strip.tsx:51`). If that utility is defined in `globals.css`, use it; otherwise add `tabular-nums` to the className directly.
- The `Card` primitive from `@/components/ui/card` still wraps the content — the shadcn card's own `shadow-sm` was already removed in Phase 1's primitive tightening, so no shadow reintroduces itself. If `pnpm build` shows a shadow class on the rendered `Card`, Phase 1 missed it in `components/ui/card.tsx` — remove it there, not here.

- [ ] **Step 2: Run the colour guards and the build**

Run: `pnpm exec vitest run design-tokens`

Expected: PASS. If `has no hardcoded hex colours` fails, a hex slipped in — use the token utilities. If `has no shadow classes` fails, the `Card` primitive is re-adding a shadow — fix it in `components/ui/card.tsx`, not here.

Run: `pnpm build`

Expected: success. No new routes; the component is already rendered on every tool page, so the build verifies all 16 tool pages still compile against the new shape.

- [ ] **Step 3: Look at it in both themes**

Run: `pnpm dev`, open any tool page with results (e.g. `/tools/burn-rate`), and confirm in **both** themes:

- **Light:** the result block is a solid dark-ink slab with light-paper text. The numeral is serif and large. Variant colours (good/warn/bad) show on the numeral and icon, not the slab background.
- **Dark:** the result block is a raised surface (step 3, slightly lighter than the page background) with a hairline border and a bone/ochre numeral. It is **not** a bright bone slab — if it glares, `dark:bg-muted` did not apply and the light `bg-ink` is bleeding through.
- The label is small mono uppercase above the numeral; the sublabel is smaller still, below.

- [ ] **Step 4: Commit**

```bash
git add components/shared/result-card.tsx
git commit -m "feat(result-card): ink slab (light) + surface step 3 (dark)

The one component whose light-mode trick doesn't transfer. Light mode
keeps the solid --ink slab with paper text for maximum contrast; dark
mode uses surface step 3 (#262319) with a #4A4530 hairline and lets the
ochre numeral carry the emphasis — a bone slab on dark would glare.
Numeral is now serif with tabular-nums so values don't shift as they
update."
```

---

### Task 3: Wire `MarginNote` into the Unit Economics tool page

Proves the layout integration on one page before rolling out. The Unit Economics page has the verbatim handoff note, so it is the canonical example.

**Files:**
- Modify: `app/tools/unit-economics/page.tsx`

**Interfaces:**
- Consumes: `MarginNote` from Task 1, `ResultCard` from Task 2.
- Produces: a tool page with the `1fr 230px` grid beside its result block, which Task 6 copies to the other five pages.

- [ ] **Step 1: Add the import**

At the top of `app/tools/unit-economics/page.tsx`, after the existing `ResultCard` import (line 13):

```tsx
import { MarginNote } from "@/components/shared/margin-note";
```

- [ ] **Step 2: Wrap the Key Metrics result grid**

The Key Metrics block is the first `grid grid-cols-2 md:grid-cols-4` div at line 248 (`{/* Key Metrics */}`). Wrap it so the results sit in the left column and the margin note in the right:

```tsx
      {/* Key Metrics + margin note */}
      <div className="grid grid-cols-1 min-[760px]:grid-cols-[1fr_230px] gap-[30px]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* ...existing ResultCard blocks, unchanged... */}
        </div>
        <MarginNote toolId="unit-economics" noteIndex={0} />
      </div>
```

The inner `grid grid-cols-2 md:grid-cols-4 gap-4` div and all four `ResultCard` children (lines 249–278) move inside the left column unchanged. The `<MarginNote>` is the only addition. At ≥760px the note sits in the 230px right column; below 760px it collapses below the results — the grid's `grid-cols-1` default handles this.

- [ ] **Step 3: Build and look at it**

Run: `pnpm build`

Expected: success. The page now composes `MarginNote`, which imports `react-markdown` — if the build fails on that import, `react-markdown` is not resolvable (check `pnpm install` ran).

Run: `pnpm dev`, open `/tools/unit-economics`, and confirm in **both** themes:

- At ≥760px width: the result cards are on the left, the margin note is in a narrow right column with an ochre left border. The note's "Note" label is tiny mono uppercase in ochre; the body is serif in `--ink-2`.
- At <760px width: the note drops below the results, full width.
- The note body renders the two paragraphs (the LTV:CAC thresholds + the PH SaaS seed guidance) with the line break preserved.

- [ ] **Step 4: Run the full suite**

Run: `pnpm exec vitest run`

Expected: all pass, 335 tests. No new tests — this is wiring, not logic.

- [ ] **Step 5: Commit**

```bash
git add app/tools/unit-economics/page.tsx
git commit -m "feat(unit-economics): wire MarginNote beside the result grid

First tool page to compose the margin note. The 1fr 230px grid collapses
to a single column under 760px with the note below the results. Task 6
repeats this wiring on the remaining five tool pages."
```

---

### Task 4: Footer editorial typography

Small, independent. Phase 2 already trimmed the credit copy to one line. Phase 3 applies the editorial type system — **copy does not change**.

**Files:**
- Modify: `components/layout/footer.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the same `export function Footer()` signature.

- [ ] **Step 1: Apply the editorial type system**

In `components/layout/footer.tsx`, the credit `<div>` (lines 11–48) keeps its structure and copy. The changes are typography only:

- The credit line `<p>` becomes serif: add `font-serif` to its className. Keep `text-center text-sm text-muted-foreground`.
- The "Designed for Filipino startup founders…" `<p>` stays sans (it is a tagline, not a wordmark) — no change.
- The LinkedIn / Contact row stays mono for the labels: add `font-mono text-[10px] uppercase tracking-[0.12em]` to the `<span>` and `<Link>` inside the row. Keep the existing flex and gap.
- The `Separator` above the credit becomes a hairline rule: it already uses `border-border/50` via the `<footer>` wrapper — no change needed unless the separator itself has a heavier border; if so, set it to `border-t border-rule`.

The implementer should read the current footer (it is 51 lines) and apply the minimal className edits. Do not restructure the JSX, move elements, or change any visible copy.

- [ ] **Step 2: Verify the homepage guard and build**

Run: `pnpm exec vitest run homepage-facts`

Expected: PASS. The footer copy is unchanged, so the author-name count is unchanged.

Run: `pnpm build`

Expected: success.

- [ ] **Step 3: Look at it**

Run: `pnpm dev`, scroll any page to the footer, and confirm in both themes:

- The credit line reads in serif, not sans.
- The LinkedIn / Contact labels are tiny mono uppercase — a clear step down from the credit line.
- No portrait thumbnail, no CTA button, no author band. The structure is identical to Phase 2; only the type changed.

- [ ] **Step 4: Commit**

```bash
git add components/layout/footer.tsx
git commit -m "style(footer): editorial typography — serif credit, mono labels

Copy unchanged from Phase 2. Applies the editorial type system: serif
wordmark on the credit line, mono uppercase on the LinkedIn/Contact
labels. The v1 AuthorColophon concept remains cancelled."
```

---

### Task 5: `lib/kevin.ts` + `lib/orgs.ts` + `/about` rebuild + guard test

The largest workstream. The data files land first so the guard test can exercise them, then the components, then the page rebuild.

**Files:**
- Create: `lib/kevin.ts`
- Create: `lib/orgs.ts`
- Create: `lib/__tests__/about-content.test.ts`
- Create: `components/about/grant-timeline.tsx`
- Create: `components/about/organization-wall.tsx`
- Modify: `app/about/page.tsx` (full rebuild)
- Create: `public/about-portrait.jpg` (copied from the client-supplied photo)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `/about` as a two-column page. The homepage-facts guard does not scan `app/about/` (it scans a fixed homepage file list + `components/home/`), so the rebuild cannot regress it.

- [ ] **Step 1: Copy the portrait into `public/`**

Copy the client-supplied photo:

```bash
cp "C:/Users/ASUS TUF/OneDrive/Pictures/kpdg profile photo.jpg" public/about-portrait.jpg
```

Verify it exists: `ls -la public/about-portrait.jpg` (should be ~19KB, 400×400 JPEG).

- [ ] **Step 2: Create `lib/kevin.ts`**

```ts
export interface GrantTimelineEntry {
  year: string;        // "2018", "2020–24", "Ongoing"
  entry: string;
}

export const ROLE_LINE = "CPA · MBA · CEO, IOL Inc.";
export const NAME = "Kevin Philip Gayao";

export const GRANT_TIMELINE: GrantTimelineEntry[] = [
  { year: "2021",       entry: "DOST-PCIEERD Startup Grant" },
  { year: "2023",       entry: "DOST-TAPI TECHNiCOM Grant" },
  { year: "2018",       entry: "Angel investment via IdeaSpace Cohort 7" },
  { year: "2020–24",    entry: "Finance Manager, Vivita Philippines (Mistletoe-backed)" },
  { year: "2024",       entry: "EU-PH Green Economy Partnership grant" },
  { year: "Ongoing",    entry: "Visiting Lecturer, SLU Graduate School" },
  { year: "Ongoing",    entry: "Finance Mentor, New Energy Nexus" },
  { year: "Ongoing",    entry: "Certified Mentor, PCE / Go Negosyo" },
];

// The right-column body copy. Distilled from the existing about page's
// prose — keep the voice first-person, unhedged, and focused on the work.
export const ABOUT_BIO = [
  "I teach startup finance to Filipino founders because most of the tools available to them were built for Silicon Valley assumptions — priced rounds, venture debt, USD-denominated everything. The Philippines runs on SAFEs that still surprise local investors, grants that disburse late, and a compliance regime that wastes weeks when you do it out of order.",
  "These calculators are the ones I wish I had when I was raising for IOL Inc. — through a DOST-PCIEERD Startup Grant, a DOST-TAPI TECHNiCOM Grant, an angel round via IdeaSpace, and four years managing finance at Vivita Philippines under Mistletoe. Every default in them is set to what I actually look for.",
];

export const PULL_QUOTE =
  "This toolkit transforms the teaching into interactive calculators that founders can use to make real financial decisions — from pricing their first product to modeling their cap table through multiple funding rounds.";
```

The 2018 angel-investment date is the client-corrected value. The pull-quote is distilled from the existing about page's closing paragraph. The implementer may refine `ABOUT_BIO` wording but must keep it first-person and grounded in the listed experience.

- [ ] **Step 3: Create `lib/orgs.ts`**

```ts
export type OrgKind = "gov" | "edu" | "solid" | "other";

export interface Org {
  name: string;
  kind: OrgKind;
}

// Full, unfiltered set — renders on /about only. The homepage org wall was
// dropped in Phase 2. `kind` drives the circle colour: gov = ochre,
// edu = teal, solid = ink, other = hollow --rule-strong.
export const ORGS: Org[] = [
  { name: "DOST-PCIEERD",           kind: "gov" },
  { name: "DOST-TAPI",              kind: "gov" },
  { name: "IdeaSpace Foundation",   kind: "other" },
  { name: "Vivita Philippines",     kind: "solid" },
  { name: "Mistletoe Ventures",     kind: "solid" },
  { name: "EU-PH Green Economy Partnership", kind: "gov" },
  { name: "Saint Louis University", kind: "edu" },
  { name: "New Energy Nexus",       kind: "other" },
  { name: "PCE / Go Negosyo",       kind: "gov" },
  { name: "SEC",                    kind: "gov" },
  { name: "DTI",                    kind: "gov" },
  { name: "BIR",                    kind: "gov" },
];
```

The implementer may add to this list from the existing about page's speaker profiles (UST, San Beda, USTP CDO, CHED Region I, NATCCO, etc.) — the spec calls for the "full set, unfiltered." The `kind` values must be one of the four allowed.

- [ ] **Step 4: Create the guard test**

Create `lib/__tests__/about-content.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GRANT_TIMELINE,
  NAME,
  ABOUT_BIO,
  PULL_QUOTE,
} from "@/lib/kevin";
import { ORGS, type OrgKind } from "@/lib/orgs";

const ROOT = process.cwd();
const VALID_KINDS: OrgKind[] = ["gov", "edu", "solid", "other"];

// The angel investment year was corrected from the handoff's 2021 to 2018
// per the client. This guard locks the correction so it cannot regress.
const REQUIRED_TIMELINE_ENTRIES = [
  "DOST-PCIEERD Startup Grant",
  "DOST-TAPI TECHNiCOM Grant",
  "Angel investment via IdeaSpace Cohort 7",
  "Finance Manager, Vivita Philippines",
  "EU-PH Green Economy Partnership grant",
  "Visiting Lecturer, SLU Graduate School",
  "Finance Mentor, New Energy Nexus",
  "Certified Mentor, PCE / Go Negosyo",
];

describe("about content", () => {
  it("grant timeline has the required entries", () => {
    const entries = GRANT_TIMELINE.map((e) => e.entry);
    for (const required of REQUIRED_TIMELINE_ENTRIES) {
      expect(
        entries.some((e) => e.includes(required)),
        `Grant timeline missing entry containing "${required}"`
      ).toBe(true);
    }
  });

  it("angel investment is dated 2018, not 2021", () => {
    const angel = GRANT_TIMELINE.find((e) =>
      e.entry.includes("Angel investment via IdeaSpace")
    );
    expect(angel, "Angel investment entry must exist").toBeDefined();
    expect(angel!.year).toBe("2018");
  });

  it("bio and pull-quote are non-empty", () => {
    expect(ABOUT_BIO.length).toBeGreaterThanOrEqual(1);
    for (const para of ABOUT_BIO) {
      expect(para.trim()).not.toBe("");
    }
    expect(PULL_QUOTE.trim()).not.toBe("");
  });

  it("every org has a valid kind", () => {
    expect(ORGS.length).toBeGreaterThanOrEqual(8);
    for (const org of ORGS) {
      expect(
        VALID_KINDS,
        `${org.name} has kind "${org.kind}"`
      ).toContain(org.kind);
    }
  });

  it("the author's name appears at most twice on /about", () => {
    // /about is the one page allowed the full credentials, but the name
    // itself should still appear at most twice (once in the rail, once in
    // the closing line) to keep the page from drifting back toward the
    // rejected v1 promotional density.
    const source = readFileSync(join(ROOT, "app/about/page.tsx"), "utf8");
    const count = (source.match(new RegExp(NAME.split(" ")[0], "g")) ?? []).length;
    expect(
      count,
      `${NAME} should appear at most twice in app/about/page.tsx; found ${count}`
    ).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 5: Run the guard test**

Run: `pnpm exec vitest run about-content`

Expected: the first four tests PASS. The fifth (`the author's name appears at most twice on /about`) will FAIL until the page rebuild in Step 7 — the current `app/about/page.tsx` mentions "Kevin" multiple times. That is the expected red state; Step 7 turns it green.

- [ ] **Step 6: Create the `GrantTimeline` component**

Create `components/about/grant-timeline.tsx`:

```tsx
import { GRANT_TIMELINE } from "@/lib/kevin";

export function GrantTimeline() {
  return (
    <dl className="flex flex-col">
      {GRANT_TIMELINE.map((row) => (
        <div
          key={row.year + row.entry}
          className="border-t border-rule pt-2 flex gap-3"
        >
          <dt className="font-mono text-[11px] tracking-[0.08em] text-ochre-deep dark:text-ochre w-9 shrink-0 pt-[2px]">
            {row.year}
          </dt>
          <dd className="font-serif text-[13px] leading-[1.4] text-ink">
            {row.entry}
          </dd>
        </div>
      ))}
    </dl>
  );
}
```

`border-rule`, `text-ochre-deep`, `text-ochre`, `text-ink` are token utilities — no hexes.

- [ ] **Step 7: Create the `OrganizationWall` component**

Create `components/about/organization-wall.tsx`:

```tsx
import { ORGS, type OrgKind } from "@/lib/orgs";
import { cn } from "@/lib/utils";

const KIND_CIRCLE: Record<OrgKind, string> = {
  gov:   "bg-ochre",
  edu:   "bg-teal",
  solid: "bg-ink",
  other: "border border-rule-strong",
};

export function OrganizationWall() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-3">
      {ORGS.map((org) => (
        <li key={org.name} className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-[14px] w-[14px] rounded-full",
              KIND_CIRCLE[org.kind]
            )}
            aria-hidden
          />
          <span className="font-serif text-[13.5px] font-semibold text-ink">
            {org.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

`bg-ochre`, `bg-teal`, `bg-ink`, `border-rule-strong`, `text-ink` are token utilities. The circle is 14px per the spec; `rounded-full` is allowed (the spec's radius ceiling exempts circles on controls/avatars — this is a marker, not a frame).

- [ ] **Step 8: Rebuild `app/about/page.tsx`**

Replace the entire file with the two-column editorial layout. The page is a server component (no client JS). Keep the existing `metadata` export, updated to reflect the narrower scope.

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Linkedin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { GrantTimeline } from "@/components/about/grant-timeline";
import { OrganizationWall } from "@/components/about/organization-wall";
import { NAME, ROLE_LINE, ABOUT_BIO, PULL_QUOTE } from "@/lib/kevin";

export const metadata: Metadata = {
  title: "About",
  description: "The person behind the Startup Finance Toolkit.",
  openGraph: {
    title: "About | Startup Finance Toolkit",
    description: "The person behind the Startup Finance Toolkit.",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="grid grid-cols-1 min-[920px]:grid-cols-[1fr_1.4fr]">
          {/* Left rail */}
          <aside className="bg-muted border-rule p-[48px] min-[920px]:border-r min-[920px]:min-h-screen flex flex-col gap-5">
            <Image
              src="/about-portrait.jpg"
              alt={`${NAME}, CPA and MBA`}
              width={400}
              height={400}
              loading="lazy"
              className="w-full aspect-square border border-rule object-cover"
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {ROLE_LINE}
            </p>
            <h2 className="font-serif text-[28px] leading-[1.1] text-ink">
              {NAME}
            </h2>
            <GrantTimeline />
          </aside>

          {/* Right column */}
          <div className="p-[48px] flex flex-col gap-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              About
            </p>
            <h1 className="font-serif text-[36px] leading-[1.05] text-ink">
              The person behind the toolkit
            </h1>
            {ABOUT_BIO.map((para, i) => (
              <p
                key={i}
                className="font-serif text-[17px] leading-[1.55] text-ink-2"
              >
                {para}
              </p>
            ))}
            <blockquote className="border-l-[3px] border-ochre pl-[18px]">
              <p className="font-serif text-[19px] italic leading-[1.45] text-ink-2">
                {PULL_QUOTE}
              </p>
            </blockquote>
            <OrganizationWall />
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="ochre">
                <Link href="/contact">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Get in touch
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a
                  href="https://www.linkedin.com/in/kpdgayao/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </a>
              </Button>
            </div>
            <p className="font-serif text-[13px] text-muted-foreground border-t border-rule pt-4">
              The broader practice — speaking, seminars, and cooperative
              education — lives at{" "}
              <a
                href="https://kevin.iol.ph"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link hover:text-ochre-deep underline underline-offset-[3px]"
              >
                kevin.iol.ph
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

Notes for the implementer:
- The closing line links to `kevin.iol.ph` **without UTM tags** — those are Phase 5. Do not add them.
- `NAME` appears in the rail (`<h2>`) and in the image `alt` — the guard test counts the first name ("Kevin") in the source, and `alt` is an attribute. The guard in Step 4 counts raw occurrences of `NAME.split(" ")[0]` ("Kevin") in the file source, including `alt`. To stay at ≤2, use `{NAME}` in the `<h2>` and write the `alt` without the first name (e.g. `alt="Portrait"`) or accept that the guard counts `NAME`'s first-name string twice. The implementer should verify the count and adjust the `alt` text if needed to keep the guard green.
- `Image` from `next/image` handles the lazy-load and serves an optimised format. The `width`/`height` match the source (400×400) so no layout shift.

- [ ] **Step 9: Run the guard test and verify it now passes**

Run: `pnpm exec vitest run about-content`

Expected: PASS, 5 tests. The name-count guard turns green once the rebuild is in place.

- [ ] **Step 10: Run the full suite and the build**

Run: `pnpm exec vitest run`

Expected: all pass, 335 → 340 (5 new about-content tests). The `homepage-facts` and `design-tokens` guards must still pass.

Run: `pnpm build`

Expected: success. The `/about` route still exists; no new routes added. If the build fails on an `Image` import or unresolvable path, fix the import — do not bypass `next/image`.

- [ ] **Step 11: Look at it in both themes at four widths**

Run: `pnpm dev`, open `/about`, and confirm at **375px, 760px, 920px, 1280px** in both themes:

- At ≥920px: two columns — left rail with portrait + timeline, right column with bio + pull-quote + org wall + CTAs + closing line.
- At <920px: single column, rail stacks above the right column content.
- The portrait is a 1:1 square with a hairline border.
- The grant timeline rows have a year in ochre mono on the left, entry in serif on the right, separated by hairline rules.
- The pull-quote has an ochre left border and italic serif.
- The org wall circles are colour-coded: ochre (gov), teal (edu), ink (solid), hollow (other).
- The closing line links to `kevin.iol.ph` in teal with an underline.

- [ ] **Step 12: Commit**

```bash
git add lib/kevin.ts lib/orgs.ts lib/__tests__/about-content.test.ts components/about/ app/about/page.tsx public/about-portrait.jpg
git commit -m "feat(about): rebuild as the single credentials page

Two-column editorial layout: left rail with portrait and grant timeline,
right column with serif bio, ochre pull-quote, organization wall, and a
quiet closing line to kevin.iol.ph. The org wall renders here only — the
homepage dropped it in Phase 2. Angel investment date corrected to 2018
per client. Guard test pins the timeline entries, org kinds, and the
two-mention name limit."
```

---

### Task 6: Roll out `MarginNote` to the remaining five tool pages

Repeat the Task 3 wiring on the other five tools. Each page has notes already in `lib/notes.ts` — no content work needed.

**Files:**
- Modify: `app/tools/valuation-calculator/page.tsx`
- Modify: `app/tools/equity-simulator/page.tsx`
- Modify: `app/tools/safe-calculator/page.tsx`
- Modify: `app/tools/burn-rate/page.tsx`
- Modify: `app/tools/compliance-checklist/page.tsx`

**Interfaces:**
- Consumes: `MarginNote` from Task 1, the grid pattern from Task 3.
- Produces: all six required tool pages with margin notes composed beside their results.

For each page, the pattern is identical to Task 3:

- [ ] **Step 1: Valuation Calculator**

Add the `MarginNote` import. Find the primary result block (the `ResultCard` grid or the main result display) and wrap it in the `1fr 230px` grid with `<MarginNote toolId="valuation-calculator" noteIndex={0} />` in the right column. The valuation page has 3 notes — `noteIndex={0}` shows the first ("run at least two methods"). If the layout has room for a second note, add `<MarginNote toolId="valuation-calculator" noteIndex={1} />` below the first in the same right column.

- [ ] **Step 2: Equity Simulator**

Same pattern. `toolId="equity-simulator"`, `noteIndex={0}` (the vesting note).

- [ ] **Step 3: SAFE Calculator**

Same pattern. `toolId="safe-calculator"`, `noteIndex={0}` (the cap/discount note). This is one of the two highest-leverage pages — confirm the note renders fully.

- [ ] **Step 4: Burn Rate**

Same pattern. `toolId="burn-rate"`, `noteIndex={0}` (the 12–18 month runway note).

- [ ] **Step 5: Compliance Checklist**

Same pattern. `toolId="compliance-checklist"`, `noteIndex={0}` (the registration-order note). This is the other highest-leverage page. The compliance page's result block may be a progress summary rather than a `ResultCard` grid — wrap whatever the primary result display is. If the page has no single clear result block, place the margin note beside the checklist summary at the top of the results area.

- [ ] **Step 6: Build and run the full suite**

Run: `pnpm exec vitest run`

Expected: all pass, 340 tests. No new tests — this is wiring.

Run: `pnpm build`

Expected: success, same route count.

- [ ] **Step 7: Spot-check two pages in both themes**

Run: `pnpm dev`, open `/tools/safe-calculator` and `/tools/compliance-checklist`, and confirm in both themes that the margin note renders beside the results at ≥760px and below them at <760px.

- [ ] **Step 8: Commit**

```bash
git add app/tools/valuation-calculator/page.tsx app/tools/equity-simulator/page.tsx app/tools/safe-calculator/page.tsx app/tools/burn-rate/page.tsx app/tools/compliance-checklist/page.tsx
git commit -m "feat(tools): wire MarginNote into the remaining five tool pages

All six required tools now compose margin notes beside their results.
SAFE calculator and PH compliance — the two highest-leverage pages —
carry the local-expertise notes that are least commoditisable."
```

---

### Task 7: Final guard pass, grep the DoD, and open the PR

**Files:** none modified — verification only.

- [ ] **Step 1: Run the full suite**

Run: `pnpm exec vitest run`

Expected: all pass, 340 tests (331 baseline + 4 margin-notes + 5 about-content).

- [ ] **Step 2: Run the build**

Run: `pnpm build`

Expected: success, 27 pages + 3 API routes (unchanged from Phase 2).

- [ ] **Step 3: Grep the definition-of-done items**

```bash
grep -rin "gradient" app components lib --include=*.tsx --include=*.ts --include=*.css
grep -rn "shadow-" app components --include=*.tsx
```

Expected: only the allowlisted newsletter email-template gradient, and no `shadow-*` outside `shadow-none`. `design-tokens.test.ts` already asserts both; this is a human-readable confirmation.

- [ ] **Step 4: Verify the margin-note content rules by hand**

Open `lib/notes.ts` and confirm:
- 17 notes across 6 tools.
- No note mentions "Kevin", "IOL", "credentials", or "seminar".
- Every note is a threshold, a common mistake, or a PH-specific caveat.
- The voice is first-person singular and unhedged.

The guard test already checks the first two; the last two are a human read — the test cannot verify voice.

- [ ] **Step 5: Manual visual review in both themes**

Run: `pnpm dev` and review at 375 / 760 / 920 / 1280px in both themes:

- `/about` — two-column at ≥920px, single column below. Portrait, timeline, pull-quote, org wall, closing line all render correctly.
- `/tools/unit-economics` — margin note beside results at ≥760px, below at <760px.
- `/tools/safe-calculator` — same.
- `/tools/compliance-checklist` — same.
- Any tool page with a `ResultCard` — the ink slab (light) / surface step 3 (dark) treatment, serif numeral, no glare in either theme.
- Footer — serif credit line, mono labels, no author band.

- [ ] **Step 6: Push and open the PR**

```bash
git push -u origin feat/editorial-redesign-phase-3
gh pr create --base master --title "Editorial redesign phase 3: margin notes, about, footer, result card" --body "$(cat <<'EOF'
Delivers the redesign's "competence surface" — the unsigned, opinionated
margin notes that replace every promotional element the client cut from
v1, plus the rebuilt /about, the footer's editorial typography, and the
result-card's theme-specific treatment.

**What changed**
- `MarginNote` — a small ochre-ruled aside beside tool results. 17 notes
  across six tools, mined from the author's presentation decks and
  guarded by a test that fails on any self-referential term.
- `/about` — rebuilt as a two-column editorial page: left rail with
  portrait and grant timeline, right column with serif bio, ochre
  pull-quote, organization wall, and a quiet closing line to kevin.iol.ph.
  The org wall renders here only — the homepage dropped it in Phase 2.
- `ResultCard` — light mode keeps the solid --ink slab with paper text;
  dark mode switches to surface step 3 with a hairline and lets the ochre
  numeral carry the emphasis. A bone slab on dark would glare.
- Footer — editorial typography only (serif credit, mono labels). Copy
  unchanged from Phase 2.
- Hero byline — shortened to the client-directed humble wording: "Built
  by Kevin Philip Gayao, derived from over a decade of fundraising
  experience and teaching."
- Grant timeline — angel investment year corrected to 2018 per client.

**Deliberately not in scope**
The tool index redesign (featured "Start Here" row, sparklines, numbered
chapters, ToolCard, method sidebar) is Phase 4. Cross-links to kevin.iol.ph
with UTM tags are Phase 5. The header restyle is unassigned.

**Review needs a human looking at the rendered pages in both themes** —
the repo has no rendering tests, so pnpm build and the 340 unit tests
cannot catch a visual regression here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Merging is releasing — Railway watches `master` and deploys within about a minute. Do not merge without a human reviewing the rendered pages in both themes.

---

## Notes for the implementer

**Things that look like mistakes but are not:**

- The margin-note bodies are blunt and opinionated ("Push back gently but push back."). That is the intended voice — the opinion is the value. Do not soften them. The guard test locks the content; if you rewrite a note, the test still passes but the design intent is broken.
- The `ResultCard` dark treatment is the only component in the app that genuinely differs between themes. Everything else inherits from tokens. If you find yourself adding `dark:` variants elsewhere, stop — you are probably working around a token that should be fixed in `globals.css` instead.
- The `/about` page is the only page allowed more than one author mention and the only page with a photograph, the org wall, and the grant timeline. If a later phase tries to add any of those elsewhere, the `homepage-facts` guard will catch the name count — but the photo/org/timeline exclusions are not test-guarded. Review enforces them.
- The closing line on `/about` links to `kevin.iol.ph` **without UTM tags**. Those are Phase 5. Do not add them now — the spec is explicit.
- `lib/notes.ts` and `lib/kevin.ts` contain no JSX and no CSS, so the `design-tokens` hex-literal guard does not scan them. If you add markup to a note body, do it in markdown (the `ReactMarkdown` renderer handles it) — do not inject raw HTML, because `react-markdown`'s default disallows it and the guard does not expect it.
- The `Image` import in `app/about/page.tsx` uses `next/image` with a fixed `width`/`height` of 400 — matching the source file. If the client supplies a higher-resolution portrait later, update the `width`/`height` to the new dimensions to avoid layout shift, and re-run Lighthouse.

**If a step's expected output does not match:** stop and report rather than adapting. Every count and line number in this plan was verified against the tree at `master` (commit `d19bfa2`) on 2026-07-30. The test count was 331 passing at that point.

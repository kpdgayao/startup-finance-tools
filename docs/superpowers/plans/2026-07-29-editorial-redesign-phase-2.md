# Editorial Redesign Phase 2 (Homepage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage's pre-redesign hero with the handoff's `QuietHero` and `FactStrip`, so the first screen establishes credibility through verifiable product facts.

**Architecture:** Two new server components under `components/home/`, composed into `app/page.tsx` in place of the deleted hero `<section>`. Every number on the page derives from existing data (`TOOLS`, `QUIZ_QUESTIONS`, `DATA_LAST_UPDATED`) or is locked by a guard test. One new colour token pair (`--ink-2`) fills the mid-tone gap phase 1 left. The footer's author-name copy is trimmed first, because otherwise adding the hero byline breaks the redesign's own two-mentions-per-page rule.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind CSS 4 (`@theme inline` tokens), shadcn/ui, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-07-29-editorial-redesign-phase-2-design.md`

**Branch:** `feat/editorial-redesign-phase-2` (already created; the spec commit `1fe4eee` is on it). Do **not** work on `master` — Railway auto-deploys it on every push.

**Working directory:** `C:/Users/ASUS TUF/Projects/startup-finance-tools/app`. This directory *is* the git repo; the project root above it is not. Run all `git`, `pnpm`, and path-relative commands from here.

---

## Global Constraints

These apply to every task. Phase 1 shipped guard tests in `lib/__tests__/design-tokens.test.ts` that fail the build on violations.

- **No hex colour literals** in `.tsx`/`.ts`/`.svg` under `app/`, `components/`, `lib/`, `public/`. Use CSS custom properties or the Tailwind utilities mapped from them.
- **No gradients** anywhere — the guard greps `/gradient/i` case-insensitively.
- **No `shadow-*` classes** (`shadow-none` is permitted). Elevation comes from surface steps and hairline borders.
- **No Tailwind palette utilities** (`text-blue-500`, `bg-teal-600`, …). Neutral ramps are out of scope of the guard but still shouldn't be needed.
- **No `hsl(var(--x))` / `oklch(var(--x))` wrapping** — the tokens are already complete colours.
- **Radius ceiling 4px.** `--radius: 0.25rem`, so `rounded-md` computes to 2px and `rounded-lg` to 4px. Nothing larger.
- **Author name appears at most twice per page.** Enforced by a test written in Task 1.
- **No component-rendering tests.** This repo has no jsdom or Testing Library, and phase 1's 325 tests are all pure data assertions or file-content sweeps. Follow that pattern — do not add a test runtime as a side effect of this plan. Visual correctness is verified by `pnpm build` plus the manual pass in Task 4.
- **Verification gates:** tests and `pnpm build`. **Not** `pnpm lint` — it fails with 5 pre-existing `react-hooks/set-state-in-effect` errors in `ecosystem-banner`, `compliance-checklist` and `fundraising-guide`, none of which this plan touches.
- **Run tests as `pnpm exec vitest run`, not `pnpm test`.** The `test` script is bare `vitest`, which enters watch mode in an interactive terminal and will appear to hang. The suite stands at **325 passing** at the branch point; this plan adds 4.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/__tests__/homepage-facts.test.ts` | **New.** Guards every claim the homepage makes: the two spelled-out/derived counts, the compliance date format, and the author-name limit. | 1, 2, 3 |
| `components/layout/footer.tsx` | **Modify.** Credit copy only — collapse to the spec's single line, retitle the LinkedIn and contact links. No typography changes (phase 3). | 1 |
| `app/globals.css` | **Modify.** Add the `--ink-2` token pair and its `@theme inline` mapping. | 2 |
| `components/home/quiet-hero.tsx` | **New.** Eyebrow, headline, deck, CTA row, byline. Server component, no client JS. | 2 |
| `components/home/fact-strip.tsx` | **New.** Four verifiable product facts on hairline rules. Server component. | 3 |
| `app/page.tsx` | **Modify.** Delete the hero `<section>`, render the two new components, restore vertical padding on the tool grid. | 2, 3 |

`components/home/` is a new directory. It matches the handoff's own path (`components/home/fact-strip.tsx`) and the existing `components/layout` / `components/shared` split.

---

### Task 1: Footer credit trim, driven by the Quiet Authority guard

The homepage currently mentions the author four times — three in the footer (`footer.tsx:24`, `:39`, `:46`) and once in the old hero (`page.tsx:38`). The limit is two. Trimming the footer first means every later task keeps the guard green.

**Files:**
- Create: `lib/__tests__/homepage-facts.test.ts`
- Modify: `components/layout/footer.tsx:13-49`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `lib/__tests__/homepage-facts.test.ts` with a `describe("homepage facts")` block that Tasks 2 and 3 append `it(...)` cases to. The name-count guard scans a fixed file list plus every `.tsx` in `components/home/` if that directory exists, so it keeps working as later tasks add files.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/homepage-facts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Vitest runs from the repo root, which IS the `app/` directory.
// Do not use __dirname — this file is ESM and it is undefined there.
const ROOT = process.cwd();

// Every component that renders on the homepage. Listed explicitly rather
// than crawled: the point is to assert a property of one specific page, and
// a crawl would silently start covering pages this rule scores differently
// (/about is allowed the full credentials treatment).
const HOMEPAGE_FILES = [
  "app/page.tsx",
  "components/layout/header.tsx",
  "components/layout/footer.tsx",
  "components/shared/newsletter-section.tsx",
  "components/shared/ecosystem-strip.tsx",
];

// components/home/ does not exist until Task 2. Once it does, everything in
// it renders on the homepage and counts.
function homeComponents(): string[] {
  const dir = join(ROOT, "components", "home");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `components/home/${f}`);
}

// The rule is about what a visitor reads. Comments are not rendered, and
// aria-label/alt/title are accessible names rather than prose — a screen
// reader user hearing "Kevin's LinkedIn" is not being marketed to.
function visibleText(source: string): string {
  return source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "") // {/* jsx comment */}
    .replace(/\/\*[\s\S]*?\*\//g, "") // /* block comment */
    .replace(/^\s*\/\/.*$/gm, "") // // line comment
    .replace(/(aria-label|alt|title)=(["'])[\s\S]*?\2/g, "");
}

describe("homepage facts", () => {
  it("mentions the author at most twice", () => {
    const counts: string[] = [];
    let total = 0;
    for (const rel of [...HOMEPAGE_FILES, ...homeComponents()]) {
      const source = readFileSync(join(ROOT, rel), "utf8");
      const n = (visibleText(source).match(/Kevin/g) ?? []).length;
      if (n > 0) counts.push(`${rel}: ${n}`);
      total += n;
    }
    expect(
      total,
      `Quiet Authority allows the author's name at most twice on any page ` +
        `(once in the hero byline, once in the footer credit). Found ` +
        `${total}: ${counts.join(", ")}`
    ).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm exec vitest run homepage-facts`

Expected: FAIL. The message should read roughly `Found 4: app/page.tsx: 1, components/layout/footer.tsx: 3`.

If it reports a different total, stop and reconcile — someone has edited these files since the plan was written.

- [ ] **Step 3: Trim the footer credit copy**

In `components/layout/footer.tsx`, replace the whole `<div className="py-6 …">` block (lines 13–49) with:

```tsx
      <div className="py-6 container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>
          Startup Finance Toolkit — by Kevin Gayao for{" "}
          <a
            href="https://www.iol.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4"
          >
            IOL Inc.
          </a>
        </p>
        <p className="mt-1">
          Designed for Filipino startup founders. All calculations run
          client-side.
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a
            href="https://www.linkedin.com/in/kpdgayao/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            aria-label="LinkedIn profile"
          >
            <Linkedin className="h-4 w-4" />
            <span className="text-xs">LinkedIn</span>
          </a>
          <span className="text-border">|</span>
          <Link
            href="/contact"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Contact
          </Link>
        </div>
      </div>
```

Three deliberate details: `IOL Inc.` keeps its outbound link so no outbound reference is lost; `Kevin Gayao` is plain text because `/about` is already reachable from the nav and (after Task 2) the hero byline; the `aria-label` becomes `LinkedIn profile` because the visible label no longer names anyone. Imports and the surrounding `<footer>`/`NewsletterSection`/`EcosystemStrip`/`Separator` structure are unchanged.

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm exec vitest run homepage-facts`

Expected: PASS. Total is now 1 (`app/page.tsx`, the old hero line that Task 2 deletes).

- [ ] **Step 5: Run the full suite**

Run: `pnpm exec vitest run`

Expected: all pass, count 325 → 326.

- [ ] **Step 6: Commit**

```bash
git add lib/__tests__/homepage-facts.test.ts components/layout/footer.tsx
git commit -m "refactor(footer): trim author mentions to one, guarded by a test

The redesign allows the author's name at most twice per page. The footer
alone carried three, so adding the homepage hero byline would have put the
page at four. Copy only — the footer's editorial typography restyle stays
in phase 3."
```

---

### Task 2: `--ink-2` token and `<QuietHero>`

**Files:**
- Modify: `app/globals.css` (`@theme inline` block, `:root` brand tokens, `.dark` brand tokens)
- Create: `components/home/quiet-hero.tsx`
- Modify: `app/page.tsx:1-54`
- Modify: `lib/__tests__/homepage-facts.test.ts`

**Interfaces:**
- Consumes: the `describe("homepage facts")` block from Task 1.
- Produces: `export function QuietHero(): JSX.Element` from `@/components/home/quiet-hero` — no props. Task 3 renders `<FactStrip />` immediately after it in `app/page.tsx`.

- [ ] **Step 1: Add the two count guards**

Append inside the existing `describe("homepage facts")` block in `lib/__tests__/homepage-facts.test.ts`, and add the two imports at the top of the file:

```ts
import { TOOLS } from "@/lib/constants";
import { QUIZ_QUESTIONS } from "@/lib/calculations/self-assessment";
```

```ts
  it("has the tool count the hero copy claims", () => {
    // The hero eyebrow spells the number as a word ("Sixteen tools · free
    // · nothing leaves your browser") and cannot interpolate it. If a tool
    // is added or removed, this must fail loudly rather than let the page
    // state something untrue.
    expect(
      TOOLS.length,
      "TOOLS.length changed. Update the word in the eyebrow copy in " +
        "components/home/quiet-hero.tsx. The secondary CTA and FactStrip " +
        "cell 1 derive the number and need no edit."
    ).toBe(16);
  });

  it("has the question count the primary CTA claims", () => {
    // The CTA interpolates this, so it cannot drift — but the *claim* that
    // 25 questions is a reasonable ask is a copy decision. A jump to 60
    // should prompt a rewrite, not silently ship "Start with the
    // 60-question assessment".
    expect(
      QUIZ_QUESTIONS.length,
      "QUIZ_QUESTIONS.length changed. Re-read the primary CTA copy in " +
        "components/home/quiet-hero.tsx before updating this number."
    ).toBe(25);
  });
```

- [ ] **Step 2: Run and verify they pass**

Run: `pnpm exec vitest run homepage-facts`

Expected: PASS, 3 tests. These two are characterization guards — they lock values that are already correct rather than driving new code, so passing on first write is the correct outcome, not a mistake.

- [ ] **Step 3: Add the `--ink-2` token pair**

Three edits in `app/globals.css`.

In the `@theme inline` block, immediately after `--color-ochre-deep: var(--ochre-deep);` (around line 32):

```css
  --color-ink-2: var(--ink-2);
```

In `:root`, in the brand-token group — immediately after the `/* Brand tokens — shadcn has no slot for an accent *colour*, links, or status */` comment and before `--ochre` (around line 86):

```css
  /* The mid-tone between --foreground (#1A1815) and --muted-foreground
     (#6B6356), which phase 1 did not ship. Secondary body text: the hero
     deck and the byline's name link. Name kept from the design handoff even
     though the dark value is a bone tone rather than ink — --ochre-deep
     inverts the same way, and matching the design docs beats being literal. */
  --ink-2: #2E2A24;
```

In `.dark`, in the matching position immediately before `--ochre: #D9A45F;` (around line 146):

```css
  --ink-2: #CFC7B5;
```

Contrast is AAA in both themes: 12.6:1 on `#F6F2EA`, 11.0:1 on `#16150F`.

- [ ] **Step 4: Create the component**

Create `components/home/quiet-hero.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/constants";
import { QUIZ_QUESTIONS } from "@/lib/calculations/self-assessment";

export function QuietHero() {
  return (
    <section className="container mx-auto px-4 pt-12 pb-[38px]">
      <p className="eyebrow">
        Sixteen tools · free · nothing leaves your browser
      </p>

      {/* tracking is set here on purpose: the base layer gives h1-h4
          -0.015em, the hero wants -0.02em. text-wrap: balance is inherited
          from the base layer and left alone — it helps an 18ch headline. */}
      <h1 className="mt-[14px] max-w-[18ch] text-[clamp(34px,6vw,52px)] leading-[1.04] tracking-[-0.02em]">
        Run the{" "}
        <em className="italic text-ochre-deep dark:text-ochre">numbers</em> on
        your startup — properly.
      </h1>

      <p className="mt-[18px] max-w-[52ch] text-[17px] leading-[1.55] text-ink-2">
        Valuation, cap tables, SAFEs, burn rate, break-even, unit economics,
        PH&nbsp;compliance, MSME planning. Peso-native, built for how funding
        actually works in the&nbsp;Philippines.
      </p>

      <div className="mt-[26px] flex flex-wrap gap-[10px]">
        <Button asChild size="lg" variant="ochre">
          <Link href="/tools/self-assessment">
            Start with the {QUIZ_QUESTIONS.length}-question assessment
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/tools">Browse all {TOOLS.length} tools</Link>
        </Button>
      </div>

      {/* The base layer paints links inside a <p> with --link (teal). The
          design wants the name in --ink-2, so the colour is set explicitly;
          the class beats the :where() rule, which has zero specificity. The
          underline from that rule is kept deliberately — it is the only
          affordance marking this as a link. */}
      <p className="mt-[34px] max-w-[60ch] border-t pt-[14px] text-[13px] leading-[1.6] text-muted-foreground">
        Built by{" "}
        <Link href="/about" className="text-ink-2 hover:text-ochre-deep">
          Kevin Gayao
        </Link>{" "}
        — CPA, MBA, CEO of IOL Inc.
      </p>
    </section>
  );
}
```

Note `text-ochre-deep`, `text-ochre` and `text-ink-2` are the Tailwind utilities generated from the `@theme inline` mappings — no `var()` or hex needed, so the colour guards stay green.

- [ ] **Step 5: Render it and delete the old hero**

In `app/page.tsx`:

1. Delete the entire hero `<section>` (lines 27–54, the `relative overflow-hidden border-b` block).
2. Render `<QuietHero />` in its place as the first child of `<main>`.
3. Add the import `import { QuietHero } from "@/components/home/quiet-hero";`.
4. Remove the now-unused imports `Button` (from `@/components/ui/button`) and `ArrowRight` (from `lucide-react`). Keep `Link` — the tool cards still use it.
5. Leave the tool-grid section alone for now; Task 3 adjusts its padding.

The `<main>` should read:

```tsx
      <main id="main-content" className="flex-1">
        <QuietHero />

        <section className="container mx-auto px-4 pb-16 space-y-10">
```

- [ ] **Step 6: Run the tests and the build**

Run: `pnpm exec vitest run`

Expected: all pass, 328 tests. In particular the author-name guard now totals 2 (footer 1 + hero 1) and the phase-1 colour guards still pass — if `has no hardcoded hex colours` fails, a hex literal slipped into `quiet-hero.tsx`; use the token utilities.

Run: `pnpm build`

Expected: success, 35 routes generated. A failure here on unused `Button`/`ArrowRight` means step 5.4 was skipped.

- [ ] **Step 7: Look at it**

Run: `pnpm dev`, open `http://localhost:3000`, and confirm in **both** themes:

- The headline is the widest element on the page and the byline among the smallest.
- "numbers" is italic and ochre — deeper ochre on paper, lifted ochre on the dark background.
- The deck is a clear step lighter than the headline but clearly darker than the byline. If the deck and byline look the same weight, `--ink-2` did not apply.
- The byline's "Kevin Gayao" is ink-toned and underlined, **not** teal. Teal means the class lost to the base-layer rule.

- [ ] **Step 8: Commit**

```bash
git add app/globals.css components/home/quiet-hero.tsx app/page.tsx lib/__tests__/homepage-facts.test.ts
git commit -m "feat(home): editorial QuietHero, replacing the pre-redesign hero

Phase 1 swapped the palette but deliberately left the hero's copy, so the
page still opened with generic SaaS framing inside the new system. Adds the
--ink-2 mid-tone phase 1 skipped; both CTA counts derive from data and are
guarded by tests."
```

---

### Task 3: `<FactStrip>`

**Files:**
- Create: `components/home/fact-strip.tsx`
- Modify: `app/page.tsx`
- Modify: `lib/__tests__/homepage-facts.test.ts`

**Interfaces:**
- Consumes: `QuietHero` from Task 2 — `FactStrip` renders directly beneath it.
- Produces: `export function FactStrip(): JSX.Element` from `@/components/home/fact-strip` — no props.

- [ ] **Step 1: Guard the date the strip reads**

Add the import at the top of `lib/__tests__/homepage-facts.test.ts`:

```ts
import { DATA_LAST_UPDATED } from "@/lib/calculations/compliance-checklist";
```

And append inside `describe("homepage facts")`:

```ts
  it("has a compliance date FactStrip can slice a year from", () => {
    // FactStrip cell 3 renders DATA_LAST_UPDATED.slice(0, 4) as "2026" and
    // labels it "SEC / DTI / BIR fees current". Reusing the constant the
    // compliance tool already displays means the homepage claim and the
    // tool page cannot disagree — but only if the format holds.
    expect(
      DATA_LAST_UPDATED,
      "FactStrip cell 3 slices the first four characters as a year. " +
        "DATA_LAST_UPDATED must stay YYYY-MM."
    ).toMatch(/^\d{4}-\d{2}$/);
  });
```

- [ ] **Step 2: Run and verify it passes**

Run: `pnpm exec vitest run homepage-facts`

Expected: PASS, 4 tests. Another characterization guard — it locks a format the new component depends on.

- [ ] **Step 3: Create the component**

Create `components/home/fact-strip.tsx`:

```tsx
import type { ReactNode } from "react";
import { TOOLS } from "@/lib/constants";
import { DATA_LAST_UPDATED } from "@/lib/calculations/compliance-checklist";
import { cn } from "@/lib/utils";

// Every fact is checkable by the visitor without leaving the site: the tool
// count is the grid below, the peso is every figure in every calculator,
// the year is what /tools/compliance-checklist prints as "As of", and the
// zero is verifiable in devtools. No biographical claims — that is the rule.
const FACTS: { numeral: ReactNode; label: string }[] = [
  { numeral: String(TOOLS.length), label: "Tools, no signup" },
  {
    numeral: <em className="not-italic text-ochre-deep">₱</em>,
    label: "Peso-native throughout",
  },
  {
    numeral: DATA_LAST_UPDATED.slice(0, 4),
    label: "SEC / DTI / BIR fees current",
  },
  { numeral: "0", label: "Data sent to a server" },
];

export function FactStrip() {
  return (
    <section className="container mx-auto px-4">
      <dl className="grid grid-cols-2 border-t border-b min-[820px]:grid-cols-4">
        {FACTS.map((fact, i) => (
          // flex-col-reverse: the label is the term and the numeral its
          // value, so <dt> must precede <dd> in the DOM for a screen reader
          // ("Tools, no signup: 16") while the numeral reads first visually.
          <div
            key={fact.label}
            className={cn(
              "flex flex-col-reverse px-6 py-5",
              // 2x2 below 820px: cells 2 and 4 take the vertical rule,
              // cells 3 and 4 take a horizontal one.
              i % 2 === 1 && "border-l",
              i >= 2 && "border-t",
              // 1x4 at 820px and up: no horizontal rules inside the strip,
              // vertical rules between every pair.
              "min-[820px]:border-t-0",
              i > 0 && "min-[820px]:border-l"
            )}
          >
            <dt className="mt-2 font-mono text-[10px] uppercase leading-[1.5] tracking-[0.12em] text-muted-foreground">
              {fact.label}
            </dt>
            <dd className="tabular font-serif text-[30px] leading-none tracking-[-0.01em]">
              {fact.numeral}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

`820px` is the handoff's breakpoint, not Tailwind's `md` (768px), hence the arbitrary `min-[820px]:` variant. `tabular` and `eyebrow` are the custom utilities phase 1 added to `app/globals.css`.

- [ ] **Step 4: Render it and restore the grid's spacing**

In `app/page.tsx`:

1. Add `import { FactStrip } from "@/components/home/fact-strip";`.
2. Render `<FactStrip />` directly after `<QuietHero />`.
3. Change the tool-grid section's `pb-16` to `py-14` — the deleted hero used to supply the space above it.

The `<main>` should now read:

```tsx
      <main id="main-content" className="flex-1">
        <QuietHero />
        <FactStrip />

        <section className="container mx-auto px-4 py-14 space-y-10">
```

- [ ] **Step 5: Run the tests and the build**

Run: `pnpm exec vitest run`

Expected: all pass, 329 tests.

Run: `pnpm build`

Expected: success, 35 routes.

- [ ] **Step 6: Commit**

```bash
git add components/home/fact-strip.tsx app/page.tsx lib/__tests__/homepage-facts.test.ts
git commit -m "feat(home): FactStrip — four verifiable product facts

Cell 3 reuses the existing DATA_LAST_UPDATED rather than adding the
lastVerified field the handoff proposed, so the homepage claim and
/tools/compliance-checklist cannot drift apart."
```

---

### Task 4: Verification pass

Phase 2 is mostly visual, and the repo has no rendering tests. This task is the check that the two automated gates cannot perform.

**Files:** none modified unless a defect is found.

**Interfaces:**
- Consumes: the finished homepage from Tasks 1–3.
- Produces: nothing. Terminal task.

- [ ] **Step 1: Run both gates clean**

```bash
pnpm exec vitest run
pnpm build
```

Expected: 329 tests pass (325 at the branch point, +4 from this plan); build succeeds with 35 routes. Do not run `pnpm lint` as a gate — see Global Constraints. To check only what this plan touched:

```bash
pnpm exec eslint app/page.tsx components/home components/layout/footer.tsx
```

Expected: clean.

- [ ] **Step 2: Check the responsive break**

`pnpm dev`, then at each width confirm the fact strip:

| Width | Expected |
|---|---|
| 375px | 2×2. Cells 1 and 3 have no left rule; cells 3 and 4 have a top rule. Labels wrap without clipping. |
| 819px | Still 2×2. |
| 821px | Snaps to 1×4. No horizontal rules inside the strip; a vertical rule between each pair; none to the left of cell 1. |
| 1280px | 1×4, and the strip's rules line up with the left edge of the tool cards below and the headline above. |

A misalignment at 1280px means a container class was dropped — the whole point of keeping both components on `container mx-auto px-4` is that one left edge runs down the page.

- [ ] **Step 3: Check both themes**

Toggle light/dark in the header and confirm:

- No flash of the wrong theme on hard reload in either mode.
- The `₱` in cell 2 is ochre in both, and legible in both.
- Card surfaces below still read as separate from the page — dark mode separates by surface step, not by border.
- The primary CTA is an ochre fill with a white label in light, and a lifted-ochre fill with near-black label in dark. A bone or white button in dark means the `ochre` variant was not used.

- [ ] **Step 4: Verify the facts are actually true**

This is the phase's whole premise, so check it rather than assume it:

- Count the tool cards on the page — it should be 16.
- Click through to `/tools/compliance-checklist` and confirm it prints "As of 2026-02", the same year cell 3 shows.
- Open devtools → Network, reload, interact with a calculator, and confirm no XHR/fetch leaves the page.

- [ ] **Step 5: Grep the definition-of-done items**

```bash
grep -rin "gradient" app components lib --include=*.tsx --include=*.ts --include=*.css
grep -rn "shadow-" app components --include=*.tsx
```

Expected: only the allowlisted newsletter email-template gradient, and no `shadow-*` outside `shadow-none`. `design-tokens.test.ts` already asserts both; this is a human-readable confirmation.

- [ ] **Step 6: Push and open the PR**

```bash
git push -u origin feat/editorial-redesign-phase-2
gh pr create --base master --title "Editorial redesign phase 2: homepage" --body "$(cat <<'EOF'
Replaces the pre-redesign homepage hero with the handoff's `QuietHero` and
`FactStrip`. Phase 1 swapped the palette but deliberately left the hero's
copy, so the page still opened with generic SaaS framing inside the new
paper-and-ink system.

**What changed**
- `QuietHero` — eyebrow, serif headline with an ochre italic, deck, two CTAs, hairline rule, one-line byline.
- `FactStrip` — four facts a visitor can verify without leaving the site. Cell 3 reuses the existing `DATA_LAST_UPDATED` rather than adding a second date field, so the homepage and `/tools/compliance-checklist` cannot disagree.
- `--ink-2` — the mid-tone between `--foreground` and `--muted-foreground` that phase 1 skipped. AAA in both themes.
- Footer credit trimmed from three author mentions to one. Pulled forward from phase 3: without it, adding the hero byline would have put the homepage at four mentions against the redesign's limit of two.
- Four guard tests, so every number on the page is either derived from data or fails a test when it goes stale.

**Deliberately not in scope**
The tool grid below the strip keeps its shadcn cards and tinted icon tiles — that is phase 4, so the page is knowingly half-redesigned. Margin notes, `/about`, and the footer's typography restyle are phase 3.

**Review needs a human looking at the rendered page in both themes** — the repo has no rendering tests, so `pnpm build` and the 329 unit tests cannot catch a visual regression here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_018n7yuTWT7qowfMpgEpqmdj
EOF
)"
```

Merging is releasing — Railway watches `master` and deploys within about a minute. Do not merge without a human reviewing the rendered page in both themes.

---

## Notes for the implementer

**Things that look like mistakes but are not:**

- The tool grid below the fact strip keeps its shadcn cards and tinted icon tiles. That is phase 4. The page will look half-redesigned; ship it anyway.
- The hero uses `container mx-auto px-4` rather than the handoff's `48px 44px 38px` padding. Deliberate — see spec §3.
- The byline is the credentials form rather than the handoff's "raised the grants and rounds" draft. Client decision, spec §4. Do not "fix" it back.
- Several arbitrary Tailwind values (`text-[17px]`, `mt-[34px]`, `min-[820px]:`). The handoff's type scale and breakpoints do not sit on Tailwind's defaults, and matching the design beats matching the framework here.

**If a step's expected output does not match:** stop and report rather than adapting. Every count and line number in this plan was verified against the tree at commit `1fe4eee`.

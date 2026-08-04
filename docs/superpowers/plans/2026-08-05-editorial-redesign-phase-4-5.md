# Editorial Redesign Phases 4 & 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicated shadcn card grid on `/` and `/tools` with the editorial tool index, restyle the tool sidebar to match, and UTM-tag the outbound `kevin.iol.ph` link — closing the "Quiet Authority" redesign.

**Architecture:** Three new server components under `components/tools/` (`ToolCard`, `ToolChapter`, `ToolIndex`) render from the existing `TOOL_GROUPS` / `TOOLS` constants. Both index pages become thin callers of `<ToolIndex>`, differing only by a `featured` prop. Featured-card metadata is derived from the tools' own data in a new pure module `lib/tool-meta.ts` so it cannot go stale. No client JS is added — nothing here needs state or an observer.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, Tailwind CSS 4, Vitest. Package manager **pnpm**.

**Spec:** `docs/superpowers/specs/2026-08-05-editorial-redesign-phase-4-5-design.md`. Read §3 before starting — it records six deliberate departures from the design handoff. Do not "fix" them back.

## Global Constraints

- **Run every command from the repo root, which is the `app/` directory** — `C:/Users/ASUS TUF/Projects/startup-finance-tools/app`. The project root is *not* a git repo. The `@/` alias points here.
- **Never run `pnpm test`** — it is bare `vitest` and enters watch mode, which looks like a hang. Use `pnpm exec vitest run`.
- **`pnpm build` is the reliable gate.** It must generate all 35 routes.
- **`pnpm lint` already fails** on 5 pre-existing `react-hooks/set-state-in-effect` errors in `ecosystem-banner`, `compliance-checklist`, and `fundraising-guide`. It is not a clean gate. Do not try to fix them; scope eslint to your edited files if you want to check.
- **No new test runtime.** There is no jsdom and no Testing Library. Every test is a pure data assertion or a `node:fs` file-content sweep. Do not add a render runtime as a side effect of this work.
- **No `shadow-*` classes anywhere.** A guard test in `lib/__tests__/design-tokens.test.ts` fails the build on any.
- **No hex colour literals** in new components — use tokens. Same guard test enforces this.
- **Radius ceiling is 4px.** `rounded` resolves to `0.25rem`. Nothing larger.
- Tailwind colour utilities available and used below: `border-rule`, `border-ochre`, `text-ochre-deep`, `text-rule-strong`, `bg-card`, `text-muted-foreground`, `text-foreground`, `bg-accent`, `text-accent-foreground`. All are real aliases declared in `app/globals.css` lines 25–60. **A `:root` colour var with no `--color-*` alias is invisible to Tailwind** — if you need a token not listed here, add the alias first or the utility silently emits nothing.
- `eyebrow` is an existing `@utility` (`app/globals.css:262`) — 11px mono, 500, `0.18em`, uppercase, `--muted-foreground`. Use it; do not re-declare it.
- Tests import from `@/lib/...`. Vitest runs from the repo root; **`__dirname` is undefined** in these ESM test files — use `process.cwd()`.
- Baseline is **331 tests passing**. This plan adds 9, so expect **340** at the end.

---

### Task 1: Chapter subtitles and the tool-coverage guard

Adds the `subtitle` field the chapters need, and a test that closes a live latent bug: both index pages do `TOOLS.find(...)` then `if (!tool) return null`, so a tool added to `TOOLS` but never listed in a group renders nowhere, silently, with no build error.

**Files:**
- Modify: `lib/constants.ts:116-122` (the `TOOL_GROUPS` array)
- Test: `lib/__tests__/tool-index.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `TOOL_GROUPS[n].subtitle: string` on all five entries. Tasks 3 and 5 read it.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/tool-index.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { TOOLS, TOOL_GROUPS } from "@/lib/constants";

describe("tool group data", () => {
  it("gives every group a non-empty subtitle", () => {
    for (const group of TOOL_GROUPS) {
      expect(group.subtitle, `${group.label} has no subtitle`).toBeTruthy();
      expect(group.subtitle.trim().length).toBeGreaterThan(0);
    }
  });

  // Both index pages resolve `TOOL_GROUPS` ids against `TOOLS` and render
  // nothing when the lookup misses. That failure is silent — no build error,
  // no runtime error, the tool simply does not appear on either index. This
  // test is the only thing that catches it.
  it("places every tool in exactly one group", () => {
    const grouped = TOOL_GROUPS.flatMap((g) => g.tools as readonly string[]);

    const counts = new Map<string, number>();
    for (const id of grouped) counts.set(id, (counts.get(id) ?? 0) + 1);

    const duplicated = [...counts].filter(([, n]) => n > 1).map(([id]) => id);
    expect(duplicated, "tool ids listed in more than one group").toEqual([]);

    const ungrouped = TOOLS.filter((t) => !counts.has(t.id)).map((t) => t.id);
    expect(ungrouped, "tools in TOOLS that no group lists — these render nowhere").toEqual([]);

    const unknown = [...counts.keys()].filter((id) => !TOOLS.some((t) => t.id === id));
    expect(unknown, "ids listed in a group with no matching TOOLS entry").toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and confirm the subtitle test fails**

```
pnpm exec vitest run lib/__tests__/tool-index.test.ts
```

Expected: `gives every group a non-empty subtitle` FAILS (the field does not exist yet, and TypeScript will also flag `group.subtitle`). `places every tool in exactly one group` should PASS already — all 16 tools are grouped 2+4+4+5+1. If that one fails, stop and report; something is wrong beyond this plan.

- [ ] **Step 3: Add the subtitles**

In `lib/constants.ts`, replace the `TOOL_GROUPS` array with:

```ts
export const TOOL_GROUPS = [
  {
    label: "Start Here",
    subtitle: "Two ways to find out where you actually stand.",
    tools: ["self-assessment", "fundraising-guide"],
  },
  {
    label: "Valuation & Fundraising",
    subtitle: "What a round costs you, before you sign.",
    tools: ["valuation-calculator", "equity-simulator", "pre-post-money", "safe-calculator"],
  },
  {
    label: "Revenue & Growth",
    subtitle: "Whether the unit works before you scale it.",
    tools: ["break-even", "pricing-calculator", "market-sizing", "unit-economics"],
  },
  {
    label: "Cash & Operations",
    subtitle: "How long the money lasts, and what the government wants from you.",
    tools: ["startup-costs", "burn-rate", "cash-flow-forecast", "financial-model-builder", "compliance-checklist"],
  },
  {
    label: "MSME Toolkit",
    subtitle: "Five-year planning for cooperatives and small enterprises.",
    tools: ["msme-financial-plan"],
  },
] as const;
```

The copy is signed off — do not paraphrase it. The `as const` stays; adding a field is safe.

- [ ] **Step 4: Run the tests and the build**

```
pnpm exec vitest run lib/__tests__/tool-index.test.ts
pnpm build
```

Expected: both tests PASS. `pnpm build` succeeds — `TOOL_GROUPS` is consumed by `tool-sidebar.tsx`, `app/page.tsx`, and `app/tools/page.tsx`, so a bad edit surfaces as a type error here.

- [ ] **Step 5: Commit**

```bash
git add lib/constants.ts lib/__tests__/tool-index.test.ts
git commit -m "feat(tools): add chapter subtitles and a tool-coverage guard"
```

---

### Task 2: Derived featured-card metadata

The featured "Start Here" cards carry a mono line stating what each tool actually is. Every number is read from the data it describes — the same rule `FactStrip` follows, and the direct fix for the class of bug that left "15 tools" on `/tools` after the 16th shipped.

**Files:**
- Create: `lib/tool-meta.ts`
- Test: `lib/__tests__/tool-index.test.ts` (append)

**Interfaces:**
- Consumes: `TOOL_GROUPS` from Task 1.
- Produces: `FEATURED_TOOL_META: Record<string, string>`, keyed by tool id, values in natural case (e.g. `"25 questions · 6 categories"`). Task 4's `ToolIndex` reads it. Uppercasing is done in CSS, not here.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/tool-index.test.ts` (add `FEATURED_TOOL_META` to the imports at the top):

```ts
import { FEATURED_TOOL_META } from "@/lib/tool-meta";

describe("featured tool metadata", () => {
  // Verified against the live data on 2026-08-05. If a question or a
  // checklist item is added, this test fails and the card copy updates in
  // the same commit — which is the entire point of deriving it.
  it("derives its numbers from the tool data", () => {
    expect(FEATURED_TOOL_META["self-assessment"]).toBe("25 questions · 6 categories");
    expect(FEATURED_TOOL_META["fundraising-guide"]).toBe("42 steps · 5 stages");
  });

  it("covers every tool in the featured group", () => {
    for (const id of TOOL_GROUPS[0].tools) {
      expect(FEATURED_TOOL_META[id], `no featured meta for "${id}"`).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```
pnpm exec vitest run lib/__tests__/tool-index.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/tool-meta'`.

- [ ] **Step 3: Create `lib/tool-meta.ts`**

```ts
import { QUIZ_QUESTIONS } from "@/lib/calculations/self-assessment";
import { STAGE_ORDER, getStageChecklist } from "@/lib/calculations/fundraising-guide";

/**
 * Mono meta lines for the featured tool cards on the homepage.
 *
 * Every number is read from the data it describes rather than typed. The
 * hard-coded "15 interactive financial tools" that sat on /tools for months
 * after the 16th tool shipped is what this exists to prevent. Values are
 * natural case; the card uppercases them in CSS.
 *
 * STAGE_CHECKLISTS is module-private in fundraising-guide.ts. getStageChecklist
 * is already exported and reaches it — do not add a new export.
 */
export const FEATURED_TOOL_META: Record<string, string> = {
  "self-assessment": `${QUIZ_QUESTIONS.length} questions · ${
    new Set(QUIZ_QUESTIONS.map((q) => q.category)).size
  } categories`,

  "fundraising-guide": `${STAGE_ORDER.reduce(
    (total, stage) => total + getStageChecklist(stage).length,
    0
  )} steps · ${STAGE_ORDER.length} stages`,
};
```

Note the separator is a middot with spaces (` · `, U+00B7), matching the approved mockup.

- [ ] **Step 4: Run the tests**

```
pnpm exec vitest run lib/__tests__/tool-index.test.ts
```

Expected: all four tests PASS. If the two literal strings mismatch, **do not edit the test to match the output** — a mismatch means the underlying data changed since 2026-08-05, so update both the literals and tell the reviewer what changed.

- [ ] **Step 5: Commit**

```bash
git add lib/tool-meta.ts lib/__tests__/tool-index.test.ts
git commit -m "feat(tools): derive featured card metadata from tool data"
```

---

### Task 3: `ToolCard`

The shared card. Replaces two copies of inline shadcn `Card` markup — `app/page.tsx:31-58` and `app/tools/page.tsx:34-60` are byte-identical today.

**Files:**
- Create: `components/tools/tool-card.tsx`
- Test: `lib/__tests__/tool-index.test.ts` (append)

**Interfaces:**
- Consumes: `TOOLS` type from `lib/constants.ts`.
- Produces: `ToolCard` with props `{ tool: (typeof TOOLS)[number]; ordinal: string; variant?: "default" | "featured"; meta?: string }`. Task 4 renders it.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/tool-index.test.ts`. Add `readFileSync` / `join` imports at the top:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Vitest runs from the repo root, which IS the `app/` directory.
// Do not use __dirname — this file is ESM and it is undefined there.
const ROOT = process.cwd();

describe("tool card", () => {
  it("carries no shadow and no tinted icon tile", () => {
    const src = readFileSync(join(ROOT, "components/tools/tool-card.tsx"), "utf8");

    // The editorial system has no shadows; elevation is surface steps and
    // hairlines. design-tokens.test.ts sweeps this globally — asserting it
    // here documents that the card was written to the rule, not caught by it.
    expect(src).not.toMatch(/\bshadow-/);

    // The old card wrapped the Lucide icon in `p-2 rounded-md bg-primary/10`.
    // The redesign drops the tile entirely.
    expect(src).not.toMatch(/bg-primary\/10/);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```
pnpm exec vitest run lib/__tests__/tool-index.test.ts
```

Expected: FAIL — `ENOENT: no such file or directory ... tool-card.tsx`.

- [ ] **Step 3: Create `components/tools/tool-card.tsx`**

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TOOLS } from "@/lib/constants";

type Tool = (typeof TOOLS)[number];

interface ToolCardProps {
  tool: Tool;
  /** "01.2" in a chapter, "00.01" in the featured row. */
  ordinal: string;
  variant?: "default" | "featured";
  /** Featured only. Natural case; uppercased here in CSS. */
  meta?: string;
}

export function ToolCard({ tool, ordinal, variant = "default", meta }: ToolCardProps) {
  const featured = variant === "featured";

  return (
    <Link href={tool.href} className="group block h-full">
      <article
        className={cn(
          "relative flex h-full flex-col gap-2.5 rounded border border-rule bg-card",
          // Colour-only hover. Thickening the border to 1.5px (as the handoff
          // asked) reflows the card contents by half a pixel on every hover,
          // and the outline/ring workarounds fight the 4px radius or amount
          // to a shadow. See the spec, §5.1.
          "transition-colors group-hover:border-ochre",
          featured ? "px-[30px] py-7" : "px-5 py-[18px]"
        )}
      >
        <span className="absolute right-5 top-3.5 font-mono text-[11px] tracking-[0.08em] text-rule-strong tabular">
          {ordinal}
        </span>

        <h3
          className={cn(
            "font-serif font-semibold leading-tight text-foreground",
            // Right padding keeps a long name off the absolutely-positioned
            // ordinal. "Financial Model Builder" wraps into it without this.
            featured ? "pr-16 text-[28px]" : "pr-12 text-xl"
          )}
        >
          {tool.name}
        </h3>

        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {tool.description}
        </p>

        {featured && meta ? (
          <p className="mt-auto border-t border-rule pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular">
            {meta}
          </p>
        ) : null}
      </article>
    </Link>
  );
}
```

`tabular` is an existing `@utility` (`app/globals.css`, beside `eyebrow`) applying `font-variant-numeric: tabular-nums`.

- [ ] **Step 4: Run the tests and the build**

```
pnpm exec vitest run lib/__tests__/tool-index.test.ts
pnpm build
```

Expected: tests PASS. Build succeeds (the component is unused so far — this only proves it compiles).

- [ ] **Step 5: Commit**

```bash
git add components/tools/tool-card.tsx lib/__tests__/tool-index.test.ts
git commit -m "feat(tools): add editorial ToolCard component"
```

---

### Task 4: `ToolChapter` and `ToolIndex`

**Files:**
- Create: `components/tools/tool-chapter.tsx`
- Create: `components/tools/tool-index.tsx`

**Interfaces:**
- Consumes: `ToolCard` (Task 3), `FEATURED_TOOL_META` (Task 2), `TOOL_GROUPS[n].subtitle` (Task 1).
- Produces: `ToolIndex` with prop `{ featured?: boolean }`. Task 5 renders it on both pages.

Ordinal scheme, so the two components agree:

| Page | Group 0 | Groups 1–4 | Cards |
|---|---|---|---|
| `/` (`featured`) | featured row, cards `00.01` `00.02`, no chapter heading | chapters `01`–`04` | `01.1` … `01.4` |
| `/tools` | chapter `00` | chapters `01`–`04` | `00.1`, `01.1` … |

- [ ] **Step 1: Create `components/tools/tool-chapter.tsx`**

```tsx
import { ToolCard } from "./tool-card";
import type { TOOLS, TOOL_GROUPS } from "@/lib/constants";

interface ToolChapterProps {
  group: (typeof TOOL_GROUPS)[number];
  /** Pre-resolved so the chapter never has to miss a lookup. */
  tools: (typeof TOOLS)[number][];
  /** Two digits: "00" … "04". */
  ordinal: string;
}

export function ToolChapter({ group, tools, ordinal }: ToolChapterProps) {
  const headingId = `chapter-${ordinal}`;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="flex items-baseline gap-2.5">
        <span className="font-mono text-[11px] tracking-[0.08em] text-ochre-deep tabular">
          {ordinal} —
        </span>
        <span className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {group.label}
        </span>
      </h2>

      <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-muted-foreground">
        {group.subtitle}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-rule pt-5 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool, i) => (
          <ToolCard key={tool.id} tool={tool} ordinal={`${ordinal}.${i + 1}`} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `components/tools/tool-index.tsx`**

```tsx
import { TOOLS, TOOL_GROUPS } from "@/lib/constants";
import { FEATURED_TOOL_META } from "@/lib/tool-meta";
import { ToolCard } from "./tool-card";
import { ToolChapter } from "./tool-chapter";

type Tool = (typeof TOOLS)[number];

function resolve(group: (typeof TOOL_GROUPS)[number]): Tool[] {
  return group.tools
    .map((id) => TOOLS.find((t) => t.id === id))
    .filter((t): t is Tool => Boolean(t));
}

interface ToolIndexProps {
  /**
   * Homepage only. Lifts TOOL_GROUPS[0] ("Start Here") into a 2-up featured
   * row above the chapters. /tools omits it: the ToolSidebar beside that page
   * already does the orientation job, and a featured row there would be the
   * third element on screen saying "start here".
   */
  featured?: boolean;
}

export function ToolIndex({ featured = false }: ToolIndexProps) {
  // slice() on both branches, not `const [first, ...rest] = TOOL_GROUPS`:
  // TOOL_GROUPS is `as const`, so destructuring yields a readonly tuple whose
  // type does not unify with the full array in a ternary. slice() gives both
  // branches the same type and the .map below stays clean.
  const featuredGroup = TOOL_GROUPS[0];
  const chapters = featured ? TOOL_GROUPS.slice(1) : TOOL_GROUPS.slice(0);
  // With a featured row, chapter numbering starts at 01 because 00 was lifted out.
  const offset = featured ? 1 : 0;

  return (
    <div className="space-y-14">
      {featured && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {resolve(featuredGroup).map((tool, i) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              ordinal={`00.${String(i + 1).padStart(2, "0")}`}
              variant="featured"
              meta={FEATURED_TOOL_META[tool.id]}
            />
          ))}
        </div>
      )}

      {chapters.map((group, i) => (
        <ToolChapter
          key={group.label}
          group={group}
          tools={resolve(group)}
          ordinal={String(i + offset).padStart(2, "0")}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

```
pnpm build
```

Expected: succeeds. Still unused by any page — this only proves the types line up.

- [ ] **Step 4: Commit**

```bash
git add components/tools/tool-chapter.tsx components/tools/tool-index.tsx
git commit -m "feat(tools): add ToolChapter and ToolIndex"
```

---

### Task 5: Wire both index pages and kill the stale tool count

`/tools` says "15 interactive financial tools" in three places while `TOOLS` has 16. It went stale when the MSME tool shipped and it is in indexed metadata. Fixing the digit alone only resets the clock until tool 17, so it gets wired to `TOOLS.length`.

**Files:**
- Modify: `app/page.tsx` (replace the `<section>` grid, lines ~29-60, and prune imports)
- Modify: `app/tools/page.tsx` (replace wholesale)
- Test: `lib/__tests__/tool-index.test.ts` (append)

**Interfaces:**
- Consumes: `ToolIndex` (Task 4).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/tool-index.test.ts`:

```ts
describe("index page copy", () => {
  // The "15 interactive financial tools" bug: a literal that silently went
  // wrong when the 16th tool shipped, including in indexed metadata.
  it("never states a literal tool count", () => {
    for (const rel of ["app/page.tsx", "app/tools/page.tsx"]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      const literals =
        src.match(/\b\d{1,3}\s+(interactive\s+)?(financial\s+)?(tools|calculators)\b/gi) ?? [];
      expect(literals, `${rel} states a literal tool count — use TOOLS.length`).toEqual([]);
    }
  });

  it("renders the shared index rather than inline cards", () => {
    for (const rel of ["app/page.tsx", "app/tools/page.tsx"]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      expect(src, `${rel} should render <ToolIndex>`).toMatch(/<ToolIndex/);
      expect(src, `${rel} still has inline shadcn card markup`).not.toMatch(/<CardHeader/);
    }
  });
});
```

- [ ] **Step 2: Run it and confirm both fail**

```
pnpm exec vitest run lib/__tests__/tool-index.test.ts
```

Expected: `never states a literal tool count` FAILS with three matches from `app/tools/page.tsx`. `renders the shared index` FAILS on both files.

- [ ] **Step 3: Rewrite `app/tools/page.tsx`**

Replace the entire file:

```tsx
import type { Metadata } from "next";
import { TOOLS } from "@/lib/constants";
import { ToolIndex } from "@/components/tools/tool-index";

export const metadata: Metadata = {
  title: "All Tools",
  description: `Browse all ${TOOLS.length} interactive financial tools for Filipino startup founders. Valuations, equity, burn rate, pricing, and more.`,
  openGraph: {
    title: "All Tools | Startup Finance Toolkit",
    description: `Browse all ${TOOLS.length} interactive financial tools for Filipino startup founders.`,
  },
};

export default function ToolsIndexPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">All Tools</h1>
        <p className="mt-2 text-muted-foreground">
          {TOOLS.length} interactive financial tools for Filipino startup founders.
        </p>
      </div>
      <ToolIndex />
    </div>
  );
}
```

A template literal inside a static `metadata` export is evaluated at build time — this is fine and does not opt the route out of static generation.

- [ ] **Step 4: Edit `app/page.tsx`**

Replace the whole `<section className="container mx-auto px-4 py-14 space-y-10"> … </section>` block (the `TOOL_GROUPS.map` grid) with:

```tsx
        <section className="container mx-auto px-4 py-14">
          <ToolIndex featured />
        </section>
```

Then fix the imports. Add:

```tsx
import { ToolIndex } from "@/components/tools/tool-index";
```

and **delete** these four now-unused imports, or the build fails on unused vars:

```tsx
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TOOLS, TOOL_GROUPS } from "@/lib/constants";
import { iconMap } from "@/lib/icon-map";
```

`Header`, `Footer`, `QuietHero`, and `FactStrip` imports all stay.

- [ ] **Step 5: Run the tests and the build**

```
pnpm exec vitest run
pnpm build
```

Expected: the full suite passes (338 at this point) and the build generates all 35 routes. `homepage-facts.test.ts` sweeps `app/page.tsx` for author mentions — it should be unaffected, but if it fails, report rather than editing that test; it licenses shipped copy.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/tools/page.tsx lib/__tests__/tool-index.test.ts
git commit -m "feat(tools): render the editorial index on / and /tools"
```

---

### Task 6: `ToolSidebar` restyle

The structure is already right; this is typography and one active-state affordance. **Apply every change to both the desktop `<nav>` and `MobileToolNav`** — they currently share a look by coincidence, not by code, and will drift otherwise.

**Files:**
- Modify: `components/layout/tool-sidebar.tsx`
- Test: `lib/__tests__/tool-index.test.ts` (append)

**Interfaces:**
- Consumes: `TOOL_GROUPS[n].subtitle` is *not* used here — the sidebar shows labels and counts only.
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/tool-index.test.ts`:

```ts
describe("tool sidebar", () => {
  it("uses the shared eyebrow utility in both the desktop and mobile nav", () => {
    const src = readFileSync(join(ROOT, "components/layout/tool-sidebar.tsx"), "utf8");

    // Two group headers: one in the desktop <nav>, one in MobileToolNav.
    // They drifted apart before; this pins them together.
    const eyebrows = src.match(/\beyebrow\b/g) ?? [];
    expect(eyebrows.length, "both navs should use the eyebrow utility").toBe(2);

    // The old ad-hoc label style, replaced by `eyebrow`.
    expect(src).not.toMatch(/text-xs font-semibold text-muted-foreground uppercase/);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```
pnpm exec vitest run lib/__tests__/tool-index.test.ts
```

Expected: FAIL — `expected +0 to be 2`.

- [ ] **Step 3: Restyle the desktop group header**

In `components/layout/tool-sidebar.tsx`, inside the desktop `<nav>`, replace:

```tsx
            <div key={group.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-3">
                {group.label}
              </p>
```

with:

```tsx
            <div key={group.label} className="border-t border-rule pt-4 first:border-t-0 first:pt-0">
              <div className="mb-1.5 flex items-baseline justify-between px-3">
                <p className="eyebrow">{group.label}</p>
                <span className="font-mono text-[10px] text-rule-strong tabular">
                  {group.tools.length}
                </span>
              </div>
```

- [ ] **Step 4: Restyle the desktop active state**

In the same `<nav>`, replace the `className={cn(...)}` on the tool `<Link>`:

```tsx
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
```

with:

```tsx
                      className={cn(
                        // The left rule is always present, transparent when
                        // inactive, so switching it does not shift the row.
                        "flex items-center gap-3 rounded-md border-l-[1.5px] px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "border-ochre bg-accent font-medium text-accent-foreground"
                          : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
```

`--accent` is `#EFE9DD` — the paper-2 surface well, *not* ochre. Phase 1 mapped it to the tonal step. The fill alone is too quiet to read as "you are here"; the ochre rule is what carries it.

- [ ] **Step 5: Apply both changes to `MobileToolNav`**

In `MobileToolNav`, replace:

```tsx
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1">
                {group.label}
              </p>
```

with:

```tsx
              <div className="flex items-baseline justify-between px-4 pt-3 pb-1">
                <p className="eyebrow">{group.label}</p>
                <span className="font-mono text-[10px] text-rule-strong tabular">
                  {group.tools.length}
                </span>
              </div>
```

and replace that nav's `<Link>` className:

```tsx
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
```

with:

```tsx
                    className={cn(
                      "flex items-center gap-3 border-l-[1.5px] px-4 py-2.5 text-sm transition-colors",
                      isActive
                        ? "border-ochre bg-accent font-medium text-accent-foreground"
                        : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
```

- [ ] **Step 6: Run the tests and the build**

```
pnpm exec vitest run
pnpm build
```

Expected: full suite passes, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add components/layout/tool-sidebar.tsx lib/__tests__/tool-index.test.ts
git commit -m "feat(tools): restyle tool sidebar with eyebrow labels, counts, and an ochre active rule"
```

---

### Task 7: Phase 5 — UTM-tag the `kevin.iol.ph` link

The whole of phase 5. One attribute.

**Files:**
- Modify: `app/about/page.tsx:118`
- Test: `lib/__tests__/tool-index.test.ts` (append)

**Interfaces:** none.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/tool-index.test.ts`:

```ts
describe("outbound cross-links", () => {
  it("tags the kevin.iol.ph link so the sister site can attribute referrals", () => {
    const src = readFileSync(join(ROOT, "app/about/page.tsx"), "utf8");
    expect(src).toContain(
      "https://kevin.iol.ph/?utm_source=startupfinance.tools&utm_medium=referral&utm_campaign=about"
    );
    // The visible text stays clean — the query string is href-only.
    expect(src).toMatch(/>\s*kevin\.iol\.ph\s*</);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```
pnpm exec vitest run lib/__tests__/tool-index.test.ts
```

Expected: FAIL on the `toContain`.

- [ ] **Step 3: Add the tags**

In `app/about/page.tsx`, change:

```tsx
                href="https://kevin.iol.ph"
```

to:

```tsx
                href="https://kevin.iol.ph/?utm_source=startupfinance.tools&utm_medium=referral&utm_campaign=about"
```

Leave `target`, `rel`, `className`, and the visible `kevin.iol.ph` text exactly as they are. The bare `&` is safe in a JSX string attribute — `&utm_medium` is not a valid HTML entity, so it is not decoded.

- [ ] **Step 4: Run the tests and the build**

```
pnpm exec vitest run
pnpm build
```

Expected: full suite passes (340), build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/about/page.tsx lib/__tests__/tool-index.test.ts
git commit -m "feat(about): UTM-tag the kevin.iol.ph cross-link"
```

---

### Task 8: Two-theme and responsive verification

Nothing here is caught by the test suite. Do not skip it — phase 3 shipped two real visual defects that only a look-at-it pass found.

**Files:** none (fixes land in the file that needs them).

- [ ] **Step 1: Build and serve the production bundle**

```
pnpm build
pnpm start
```

**Do not use `next dev`.** A running dev server serves stale CSS for new token values; it looks like a code defect and is not one. `next start` will warn that it does not match the `output: standalone` config — harmless for a visual pass.

- [ ] **Step 2: Check `/` and `/tools` in both themes**

Toggle light/dark with the header control on each page. Look for:
- Featured cards: the meta line reads `25 QUESTIONS · 6 CATEGORIES` and `42 STEPS · 5 STAGES`, uppercase, above a hairline.
- Chapter ordinals are ochre and legible on paper (`--ochre-deep` light / `--ochre` dark).
- Card hover turns the border ochre with **no content movement**. Watch the ordinal in the corner — any jitter means the border width is changing.
- The sidebar's active tool shows the ochre left rule in both themes.
- No shadows anywhere.

- [ ] **Step 3: Check the breakpoints**

Check 1280 / 920 / 760 / 375. **Drive this with same-origin iframes** (`f.width = 375`), not `resize_window`: a snapped window silently ignores width changes and reports success while `window.innerWidth` stays pinned at 1920, so the check tests nothing and looks like it passed.

Specifically: the featured row must go 1-up under `md`, chapters 3-up → 2-up → 1-up, and long tool names must not collide with the ordinal at 375.

- [ ] **Step 4: Fix anything found, then re-run the gates**

```
pnpm exec vitest run
pnpm build
```

- [ ] **Step 5: Commit any fixes and open the PR**

```bash
git add -A
git commit -m "fix(tools): visual-pass corrections for the editorial tool index"
```

PR body should list: the six spec §3 departures, anything Step 2–3 turned up, and the confirmed test count. Base branch is `master`; Railway watches it and deploys on merge, so **merging is releasing**.

---

## Out of scope — do not fix in this PR

All three are real, recorded, and belong elsewhere:
- `/tools/burn-rate` "Adjusted Path" chart area stays a fixed colour when the adjusted runway drops below 3 months, while the `ResultCard` beside it correctly turns red.
- `lib/orgs.ts` `kind: "other"` renders a hollow `--rule-strong` dot that is nearly invisible on paper.
- The `MarginNote` ochre rule stretches its whole grid cell, dangling ~100px below short notes.

Also do not "fix" any of the six departures in spec §3, and do not restyle `ResultCard` — its solid ink slab in light mode is deliberate and documented at `result-card.tsx:28-36`.

# Editorial Redesign Phase 1 (Foundation) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the default shadcn/Vercel identity with the warm paper-and-ink editorial system — tokens, fonts, dark theme with a working toggle, logo, primitive tightening, and full removal of hardcoded colours — without changing any page layout.

**Architecture:** Two independently-verifiable steps. **1a** (Task 1) adds the theme mechanism with zero visual change. **1b** (Tasks 2–7) performs the entire visual swap with zero functional change. Task 8 locks the result behind automated guards. Splitting this way means a rendering bug is attributable to one half or the other.

**Tech Stack:** Next.js 16.1.6 (App Router), React 19.2.3, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts 3.7, Vitest 4, pnpm 10.28.2.

**Spec:** `docs/superpowers/specs/2026-07-29-editorial-redesign-phase-1-design.md`

## Global Constraints

- **Working directory is `app/`, which IS the git repo.** The project root above it is not a git repo. Run all `git`, `pnpm`, and `gh` commands from `app/`.
- **Package manager is pnpm, pinned to 10.28.2.** Never use npm or yarn.
- **`pnpm lint` is NOT a clean gate.** It fails with 5 pre-existing `react-hooks/set-state-in-effect` errors in `ecosystem-banner.tsx`, `compliance-checklist/page.tsx`, and `fundraising-guide/page.tsx`. Never treat a red lint as caused by your change. Scope lint to files you edited: `pnpm exec eslint <paths>`.
- **`pnpm build` is the hard gate.** It must succeed and emit 27 pages + 3 API routes.
- **`pnpm test` must never regress.** Baseline is ~317 passing tests. Nothing in this plan touches `lib/calculations/`, so any change in that count means something is wrong.
- **No layout changes.** Do not restructure any page's JSX, move elements, or change grid/flex composition. The single deliberate exception is deleting the decorative gradient `<div>` in `app/page.tsx` (Task 7).
- **No gradients anywhere** except `app/api/newsletter/subscribe/route.ts` (an email template, explicitly deferred). Note `linearGradient` is camelCase — always grep case-insensitively.
- **No shadows anywhere.** Elevation comes from surface steps and hairline borders.
- **Radius ceiling is 4px** on cards and frames, 2px on buttons and chips. `rounded-full` is retained on switch thumb, radio, and avatar — those are controls, not frames.
- **Two `@/` path roots exist.** `@/lib/*` is `app/lib/` at repo root; `@/app/lib/*` is `app/app/lib/`. Do not confuse them.
- **Exact palette values are non-negotiable** — copy them verbatim from this plan. They are contrast-verified.

### Palette reference (used by Tasks 2, 5, 6, 7)

| Token | Light | Dark |
|---|---|---|
| `--background` | `#F6F2EA` | `#16150F` |
| `--foreground` | `#1A1815` | `#EFE9DB` |
| `--card` | `#FFFFFF` | `#1E1C15` |
| `--card-foreground` | `#1A1815` | `#EFE9DB` |
| `--popover` | `#FFFFFF` | `#1E1C15` |
| `--popover-foreground` | `#1A1815` | `#EFE9DB` |
| `--primary` | `#1A1815` | `#D9A45F` |
| `--primary-foreground` | `#F6F2EA` | `#16150F` |
| `--secondary` | `#EFE9DD` | `#262319` |
| `--secondary-foreground` | `#1A1815` | `#EFE9DB` |
| `--muted` | `#EFE9DD` | `#262319` |
| `--muted-foreground` | `#6B6356` | `#948B77` |
| `--accent` | `#EFE9DD` | `#262319` |
| `--accent-foreground` | `#1A1815` | `#EFE9DB` |
| `--destructive` | `#94342C` | `#D98878` |
| `--border` | `#D9D1C0` | `#33301F` |
| `--input` | `#D9D1C0` | `#33301F` |
| `--ring` | `#B98548` | `#D9A45F` |
| `--ochre` | `#B98548` | `#D9A45F` |
| `--ochre-deep` | `#8E6230` | `#F0C88B` |
| `--rule-strong` | `#B6AB95` | `#4A4530` |
| `--link` | `#2C5C5C` | `#6FA9A2` |
| `--link-hover` | `#8E6230` | `#D9A45F` |
| `--good` | `#4A6B3F` | `#8FB77C` |
| `--warn` | `#B05A2C` | `#D9925F` |
| `--bad` | `#94342C` | `#D98878` |
| `--chart-1` | `#1A1815` | `#EFE9DB` |
| `--chart-2` | `#B98548` | `#D9A45F` |
| `--chart-3` | `#2C5C5C` | `#6FA9A2` |
| `--chart-4` | `#4A6B3F` | `#8FB77C` |
| `--chart-5` | `#94342C` | `#D98878` |
| `--chart-6` | `#4A5A6B` | `#8AA0B8` |
| `--chart-7` | `#6A5A7A` | `#A796B8` |
| `--chart-8` | `#B05A2C` | `#D9925F` |
| `--chart-9` | `#7C8B6F` | `#A8B899` |
| `--chart-10` | `#8E6230` | `#F0C88B` |
| `--sidebar` | `#EFE9DD` | `#1E1C15` |
| `--sidebar-foreground` | `#1A1815` | `#EFE9DB` |
| `--sidebar-primary` | `#1A1815` | `#D9A45F` |
| `--sidebar-primary-foreground` | `#F6F2EA` | `#16150F` |
| `--sidebar-accent` | `#F6F2EA` | `#262319` |
| `--sidebar-accent-foreground` | `#1A1815` | `#EFE9DB` |
| `--sidebar-border` | `#D9D1C0` | `#33301F` |
| `--sidebar-ring` | `#B98548` | `#D9A45F` |

**`--accent` is deliberately NOT ochre.** In shadcn it is the hover-*surface* token (dropdown rows, ghost-button hovers). Setting it to ochre turns every hover into a solid ochre block. Ochre lives in `--ochre` / `--ochre-deep`.

### File structure

| File | Responsibility | Task |
|---|---|---|
| `components/shared/theme-provider.tsx` | **New.** Thin client wrapper around `next-themes` | 1 |
| `components/shared/theme-toggle.tsx` | **New.** Icon-only sun/moon button | 1 |
| `app/layout.tsx` | Root shell: theme provider, font variables | 1, 2 |
| `components/layout/header.tsx` | Mounts the toggle | 1 |
| `app/globals.css` | Single source of truth for all design tokens and the base layer | 2 |
| `components/ui/*.tsx` | shadcn primitives: radius, shadow, button variants | 3 |
| `components/shared/logo.tsx`, `public/logo-*.svg`, `app/icon.svg` | Brand mark | 4 |
| `lib/constants.ts` | `CHART_COLORS` + new `STATUS_COLORS` | 5, 6 |
| 9 tool/component files | Consume tokens instead of literal hex | 6, 7 |
| `lib/__tests__/design-tokens.test.ts` | **New.** Automated colour-discipline guards | 5, 8 |

---

### Task 1: Theme mechanism (step 1a)

Adds a working light/dark toggle. **The site must look identical to today in dark mode when this task is done.** No colours change here.

**Files:**
- Create: `components/shared/theme-provider.tsx`
- Create: `components/shared/theme-toggle.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/layout/header.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `<ThemeProvider>` (default export absent — named export `ThemeProvider`, props `{ children: React.ReactNode }`) and `<ThemeToggle />` (named export, no props). The `.dark` class on `<html>` becomes runtime-controlled, which every later task depends on for verifying both themes.

- [ ] **Step 1: Confirm you are on the right branch**

The branch already exists and is checked out — it was created from `design/editorial-redesign-phase-1` so that the spec and this plan travel with it. **Do not re-branch from master**; that would discard the plan file you are reading.

```bash
git branch --show-current
```

Expected: `feat/editorial-redesign-phase-1`. If it is anything else, stop and report BLOCKED.

- [ ] **Step 2: Install `next-themes`**

```bash
pnpm add next-themes
```

- [ ] **Step 3: Record the dark-mode baseline**

Before changing anything, capture what "no visual change" means. Start the dev server and screenshot three routes in the current dark theme:

```bash
pnpm dev
```

Save screenshots of `http://localhost:3000/`, `http://localhost:3000/tools`, and `http://localhost:3000/tools/burn-rate` to a scratch directory. These are the comparison targets in Step 10. Stop the server when done.

- [ ] **Step 4: Create the theme provider**

Create `components/shared/theme-provider.tsx`:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="sft-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
```

`attribute="class"` drives the `.dark` class that `@custom-variant dark (&:is(.dark *))` in `globals.css` already expects. `disableTransitionOnChange` prevents every transition on the page firing at once when the theme flips.

- [ ] **Step 5: Create the toggle**

Create `components/shared/theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        mounted
          ? isDark
            ? "Switch to light theme"
            : "Switch to dark theme"
          : "Switch theme"
      }
    >
      {mounted && isDark ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

The `mounted` guard is required. `resolvedTheme` is `undefined` on the server, so rendering the icon from it directly produces a hydration mismatch — the exact bug this task exists to avoid. Until mounted, it renders the sun unconditionally, which matches on both sides.

- [ ] **Step 6: Wire the provider into the root layout**

In `app/layout.tsx`, add the import alongside the existing `TooltipProvider` import:

```tsx
import { ThemeProvider } from "@/components/shared/theme-provider";
```

Then replace this line:

```tsx
    <html lang="en" className="dark">
```

with:

```tsx
    <html lang="en" suppressHydrationWarning>
```

And replace this line:

```tsx
        <TooltipProvider>{children}</TooltipProvider>
```

with:

```tsx
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
```

`suppressHydrationWarning` on `<html>` is mandatory — `next-themes` mutates the class before React hydrates, and without it React logs a mismatch on every page load. It suppresses the warning for that one element only, not for its subtree.

- [ ] **Step 7: Mount the toggle in the header**

In `components/layout/header.tsx`, add the import:

```tsx
import { ThemeToggle } from "@/components/shared/theme-toggle";
```

Then replace the closing of the `<nav>` element. Find:

```tsx
            );
          })}
        </nav>
```

and replace with:

```tsx
            );
          })}
          <ThemeToggle />
        </nav>
```

- [ ] **Step 8: Verify the build**

```bash
pnpm build
```

Expected: succeeds, "Generating static pages (30/30)" or equivalent listing 27 pages plus the 3 API routes. Zero TypeScript errors.

- [ ] **Step 9: Verify tests still pass**

```bash
pnpm test
```

Expected: same pass count as before this task (~317). Zero failures.

- [ ] **Step 10: Manual verification**

```bash
pnpm dev
```

Check every item. Each is a known failure mode of hand-rolled theme toggles:

1. **No visual regression.** Compare `/`, `/tools`, `/tools/burn-rate` in dark against the Step 3 screenshots. They must be identical.
2. **No flash.** In DevTools → Network, set throttling to "Slow 3G", then hard-reload in dark mode. No white flash. Repeat in light mode — no dark flash.
3. **No hydration warning.** Console is clean on `/`, `/tools`, `/tools/burn-rate`, `/learn`, `/about`.
4. **Toggle works and persists.** Click it, confirm the theme flips, reload, confirm it stuck.
5. **Cross-tab sync.** Open a second tab, toggle in the first, confirm the second follows.
6. **OS preference respected.** In DevTools console run `localStorage.removeItem('sft-theme')`, then in DevTools → Rendering set "Emulate prefers-color-scheme: light" and reload — the site must be light. Set it to dark and reload — the site must be dark.

- [ ] **Step 11: Lint the files you touched**

```bash
pnpm exec eslint app/layout.tsx components/layout/header.tsx components/shared/theme-provider.tsx components/shared/theme-toggle.tsx
```

Expected: clean. If it reports the pre-existing `set-state-in-effect` rule against `theme-toggle.tsx`'s `useEffect(() => setMounted(true), [])`, that is the standard next-themes pattern and is acceptable — note it and move on.

- [ ] **Step 12: Commit**

```bash
git add package.json pnpm-lock.yaml app/layout.tsx components/layout/header.tsx components/shared/theme-provider.tsx components/shared/theme-toggle.tsx
git commit -m "feat(theme): add light/dark toggle via next-themes

Un-hardcodes the .dark class on <html> and drives it at runtime.
No colour or layout changes — dark mode renders identically to before.

Adds suppressHydrationWarning because next-themes mutates the class
before React hydrates. The mounted guard in ThemeToggle prevents the
icon itself from causing a mismatch."
```

---

### Task 2: Fonts, tokens, and the editorial base layer

The single largest visual change. After this task the site is paper-and-ink.

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: Task 1's runtime `.dark` class.
- Produces: CSS custom properties `--ochre`, `--ochre-deep`, `--rule-strong`, `--link`, `--link-hover`, `--good`, `--warn`, `--bad`, and `--chart-1` … `--chart-10` in both themes. Tailwind utilities `font-serif`, `font-sans`, `font-mono`, and a new `eyebrow` utility. Tasks 5, 6 and 7 reference these token names exactly.

- [ ] **Step 1: Swap the fonts in the root layout**

In `app/layout.tsx`, replace:

```tsx
import { Geist, Geist_Mono } from "next/font/google";
```

with:

```tsx
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
```

Replace the two font constants:

```tsx
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

with:

```tsx
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});
```

All three are variable fonts, so omitting `weight` gives the full `wght` range. Do **not** add a `weight` array — combining it with `axes` is a build error.

Then move the font variables onto `<html>`, **not** `<body>`. Replace:

```tsx
    <html lang="en" suppressHydrationWarning>
```

with:

```tsx
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sourceSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
```

and replace the body className:

```tsx
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
```

with:

```tsx
        className="antialiased"
```

**This placement is load-bearing, and the pre-existing Geist setup had it wrong.** Tailwind's `@theme inline` emits `--font-sans: var(--font-inter)` at `:root` — that is `<html>`. If `--font-inter` is only defined further down the tree (by a `.variable` class on `<body>`), the `var()` at `:root` is *invalid at computed-value time*, and it is that invalid value which inherits downward. It does **not** re-resolve at `<body>` where the variable finally exists. The result is a page that silently falls back to system fonts while every rule looks correct.

`next-themes` mutates `<html>` via `classList.add`/`remove`, so a static `className` there coexists with the theme class without conflict.

- [ ] **Step 2: Verify the fonts resolve**

```bash
pnpm build
```

Expected: succeeds. A failure here means a font name or axis is wrong — `Source_Serif_4` (with the underscore before `4`) is the correct export name.

- [ ] **Step 3: Map the fonts in `@theme inline`**

In `app/globals.css`, inside the `@theme inline { … }` block, replace:

```css
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
```

with:

```css
  --font-sans: var(--font-inter);
  --font-serif: var(--font-source-serif-4);
  --font-mono: var(--font-jetbrains-mono);
```

- [ ] **Step 4: Register chart tokens 6–10 in `@theme inline`**

Still inside `@theme inline`, immediately after the existing `--color-chart-1: var(--chart-1);` line, add:

```css
  --color-chart-6: var(--chart-6);
  --color-chart-7: var(--chart-7);
  --color-chart-8: var(--chart-8);
  --color-chart-9: var(--chart-9);
  --color-chart-10: var(--chart-10);
  --color-ochre: var(--ochre);
  --color-ochre-deep: var(--ochre-deep);
  --color-rule-strong: var(--rule-strong);
  --color-good: var(--good);
  --color-warn: var(--warn);
  --color-bad: var(--bad);
```

- [ ] **Step 5: Replace the `:root` block**

Replace the entire `:root { … }` block in `app/globals.css` with:

```css
:root {
  --radius: 0.25rem;

  --background: #F6F2EA;
  --foreground: #1A1815;
  --card: #FFFFFF;
  --card-foreground: #1A1815;
  --popover: #FFFFFF;
  --popover-foreground: #1A1815;
  --primary: #1A1815;
  --primary-foreground: #F6F2EA;
  --secondary: #EFE9DD;
  --secondary-foreground: #1A1815;
  --muted: #EFE9DD;
  --muted-foreground: #6B6356;
  --accent: #EFE9DD;
  --accent-foreground: #1A1815;
  --destructive: #94342C;
  --border: #D9D1C0;
  --input: #D9D1C0;
  --ring: #B98548;

  /* Brand tokens — shadcn has no slot for an accent *colour*, links, or status */
  --ochre: #B98548;
  --ochre-deep: #8E6230;
  --rule-strong: #B6AB95;
  --link: #2C5C5C;
  --link-hover: #8E6230;
  --good: #4A6B3F;
  --warn: #B05A2C;
  --bad: #94342C;

  --chart-1: #1A1815;
  --chart-2: #B98548;
  --chart-3: #2C5C5C;
  --chart-4: #4A6B3F;
  --chart-5: #94342C;
  --chart-6: #4A5A6B;
  --chart-7: #6A5A7A;
  --chart-8: #B05A2C;
  --chart-9: #7C8B6F;
  --chart-10: #8E6230;

  --sidebar: #EFE9DD;
  --sidebar-foreground: #1A1815;
  --sidebar-primary: #1A1815;
  --sidebar-primary-foreground: #F6F2EA;
  --sidebar-accent: #F6F2EA;
  --sidebar-accent-foreground: #1A1815;
  --sidebar-border: #D9D1C0;
  --sidebar-ring: #B98548;
}
```

- [ ] **Step 6: Replace the `.dark` block**

Replace the entire `.dark { … }` block with:

```css
.dark {
  --background: #16150F;
  --foreground: #EFE9DB;
  --card: #1E1C15;
  --card-foreground: #EFE9DB;
  --popover: #1E1C15;
  --popover-foreground: #EFE9DB;
  --primary: #D9A45F;
  --primary-foreground: #16150F;
  --secondary: #262319;
  --secondary-foreground: #EFE9DB;
  --muted: #262319;
  --muted-foreground: #948B77;
  --accent: #262319;
  --accent-foreground: #EFE9DB;
  --destructive: #D98878;
  --border: #33301F;
  --input: #33301F;
  --ring: #D9A45F;

  --ochre: #D9A45F;
  --ochre-deep: #F0C88B;
  --rule-strong: #4A4530;
  --link: #6FA9A2;
  --link-hover: #D9A45F;
  --good: #8FB77C;
  --warn: #D9925F;
  --bad: #D98878;

  --chart-1: #EFE9DB;
  --chart-2: #D9A45F;
  --chart-3: #6FA9A2;
  --chart-4: #8FB77C;
  --chart-5: #D98878;
  --chart-6: #8AA0B8;
  --chart-7: #A796B8;
  --chart-8: #D9925F;
  --chart-9: #A8B899;
  --chart-10: #F0C88B;

  --sidebar: #1E1C15;
  --sidebar-foreground: #EFE9DB;
  --sidebar-primary: #D9A45F;
  --sidebar-primary-foreground: #16150F;
  --sidebar-accent: #262319;
  --sidebar-accent-foreground: #EFE9DB;
  --sidebar-border: #33301F;
  --sidebar-ring: #D9A45F;
}
```

`--chart-1` is the only token that swaps role between themes — ink in light, bone in dark. That is intentional: series 1 is always "the most important line."

- [ ] **Step 7: Replace the base layer**

Replace the entire existing `@layer base { … }` block with:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
  }

  h1, h2, h3, h4 {
    font-family: var(--font-serif);
    font-weight: 600;
    letter-spacing: -0.015em;
    text-wrap: balance;
  }

  /* Links are scoped to prose contexts on purpose. Every tool card is
     anchor-wrapped — <Link href={tool.href}><Card>…</Card></Link> — so a
     blanket `a { color }` rule would turn card titles and descriptions teal. */
  a {
    color: inherit;
    text-decoration: none;
  }

  :where(p, li, dd, blockquote) a {
    color: var(--link);
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
  }

  :where(p, li, dd, blockquote) a:hover {
    color: var(--link-hover);
  }

  /* Calculator outputs must not shift width as values update. */
  table td, table th {
    font-variant-numeric: tabular-nums;
  }
}

@utility eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

@utility tabular {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 8: Verify the build**

```bash
pnpm build
```

Expected: succeeds. If `@utility` errors, confirm Tailwind v4 is active — it is a v4-only directive.

- [ ] **Step 9: Verify tests**

```bash
pnpm test
```

Expected: unchanged pass count.

- [ ] **Step 10: Manual verification**

```bash
pnpm dev
```

- `/` in light mode is warm cream (`#F6F2EA`), not white. Headings render in a serif — confirm with `getComputedStyle(document.querySelector("h1")).fontFamily`, which must name Source Serif, not a system fallback.
- Toggle to dark: background is warm near-black (`#16150F`), text is bone (`#EFE9DB`), not pure white.
- On `/learn/pricing-your-product`, inline prose links are teal and underlined; hovering turns them ochre.
- On `/tools`, the tool card titles are **not** teal — they inherit foreground. If they are teal, the link scoping in Step 7 was applied incorrectly.

- [ ] **Step 11: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat(design): editorial paper-and-ink tokens, fonts, and base layer

Swaps Geist for Source Serif 4 / Inter / JetBrains Mono, replaces both
token blocks with the editorial palette, and adds a base layer giving
serif headings, prose link colours, and tabular numerals.

--accent stays a neutral surface rather than ochre: in shadcn it paints
hover states, so ochre there would turn every hover into a solid block.
Link colours are scoped to prose because tool cards are anchor-wrapped."
```

---

### Task 3: shadcn primitives — radius, shadows, ochre button

**Files:**
- Modify: `components/ui/card.tsx:10`
- Modify: `components/ui/button.tsx:8,16`
- Modify: `components/ui/checkbox.tsx`, `dialog.tsx`, `input.tsx`, `select.tsx`, `sheet.tsx`, `slider.tsx`, `switch.tsx`, `tabs.tsx`, `textarea.tsx`

**Interfaces:**
- Consumes: `--radius`, `--ochre`, `--ochre-deep` from Task 2.
- Produces: `<Button variant="ochre">` for use by Phase 2's hero. No other API changes.

- [ ] **Step 1: Fix the card radius and shadow**

`Card` is the most visible surface on the site, and with `--radius: 0.25rem` shadcn's `rounded-xl` computes to **8px** — double the 4px ceiling. In `components/ui/card.tsx` line 10, replace:

```
"bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
```

with:

```
"bg-card text-card-foreground flex flex-col gap-6 rounded-lg border py-6",
```

`rounded-lg` resolves to `var(--radius)` = 4px exactly.

- [ ] **Step 2: Strip shadows from the remaining primitives**

Remove every `shadow-*` class token from these files. Delete the class name and one adjacent space; change nothing else. The exact tokens present:

| File | Remove |
|---|---|
| `components/ui/button.tsx` | `shadow-xs` |
| `components/ui/checkbox.tsx` | `shadow-xs` |
| `components/ui/dialog.tsx` | `shadow-lg` |
| `components/ui/input.tsx` | `shadow-xs` |
| `components/ui/select.tsx` | `shadow-xs`, `shadow-md` |
| `components/ui/sheet.tsx` | `shadow-lg` |
| `components/ui/slider.tsx` | `shadow-sm` |
| `components/ui/switch.tsx` | `shadow-xs` |
| `components/ui/tabs.tsx` | `shadow-sm` |
| `components/ui/textarea.tsx` | `shadow-xs` |

Leave `shadow-none` in `tabs.tsx` alone — it already asserts no shadow.

- [ ] **Step 3: Verify no shadows remain in primitives**

```bash
grep -rn "shadow-" components/ui/
```

Expected: exactly one line — the `shadow-none` in `tabs.tsx`.

- [ ] **Step 4: Add the ochre button variant**

The design's primary CTA is ochre-filled while `--primary` is ink. These are two different buttons, not a contradiction. In `components/ui/button.tsx`, inside the `variants.variant` object, add after the `link` entry:

```tsx
        ochre:
          "bg-[var(--ochre-deep)] text-white hover:bg-[var(--ochre-deep)]/90 dark:bg-[var(--ochre)] dark:text-[#16150F] dark:hover:bg-[var(--ochre)]/90",
```

In dark the label inverts to the background colour rather than white — a white label on lifted ochre glares.

- [ ] **Step 5: Verify the build and types**

```bash
pnpm build
```

Expected: succeeds. The `ochre` variant is now part of `VariantProps<typeof buttonVariants>`, so TypeScript accepts `<Button variant="ochre">`.

- [ ] **Step 6: Manual verification**

```bash
pnpm dev
```

Check in **both** themes — losing drop shadows means overlays now rely entirely on surface and border:

- `/tools/valuation-calculator`: cards have hairline borders, 4px corners, no shadow.
- Any page with a `Select`: open it. The dropdown panel must be clearly separated from the page behind it. If it disappears into the background in dark mode, note it — the fix is a `--rule-strong` border, not a shadow.
- Open the newsletter dialog from the footer. Same check.

- [ ] **Step 7: Lint the touched files**

```bash
pnpm exec eslint components/ui/
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add components/ui/
git commit -m "feat(ui): tighten primitives to the editorial system

Card drops to rounded-lg (4px) — rounded-xl computed to 8px under the
new --radius and broke the 4px ceiling. Removes all drop shadows;
elevation now comes from surface steps and hairlines.

Adds an ochre button variant for the Phase 2 hero CTA, with the label
inverting to the background colour in dark rather than white."
```

---

### Task 4: Logo — direction A (editorial monogram)

Italic serif `SF` in a solid ink tile. In dark the tile inverts to ochre with a `#16150F` letterform — a solid bone tile would be the brightest object on the page.

**Files:**
- Modify: `components/shared/logo.tsx`
- Modify: `public/logo-icon.svg`
- Modify: `public/logo-full.svg`
- Modify: `app/icon.svg`

**Interfaces:**
- Consumes: `--ochre` from Task 2.
- Produces: `<Logo variant="icon" | "full" className?>` — same public API as today. No consumer changes needed.

- [ ] **Step 1: Replace the logo component**

Replace the entire contents of `components/shared/logo.tsx`:

```tsx
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "icon" | "full";
  className?: string;
}

export function Logo({ variant = "icon", className }: LogoProps) {
  const mark = (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-[1px] font-serif font-bold italic",
        "bg-foreground text-background",
        "dark:bg-[var(--ochre)] dark:text-[#16150F]",
        variant === "icon" ? "h-[26px] w-[26px] text-base" : "h-8 w-8 text-lg",
        variant === "icon" ? className : undefined
      )}
    >
      SF
    </span>
  );

  if (variant === "icon") return mark;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {mark}
      <div className="flex flex-col leading-tight">
        <span className="font-serif text-[17px] font-semibold">
          Startup Finance
        </span>
        <span className="eyebrow text-[10.5px] tracking-[0.08em]">Toolkit</span>
      </div>
    </div>
  );
}
```

The mark is now pure type — no SVG, no gradient defs. `bg-foreground text-background` gives ink-on-paper in light automatically; the `dark:` pair overrides to ochre-on-near-black.

- [ ] **Step 2: Replace `public/logo-icon.svg`**

These standalone assets are used by social/OG consumers that cannot read CSS variables, so they carry literal light-theme values:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="1" fill="#1A1815"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Source Serif 4, Source Serif Pro, Georgia, serif"
        font-style="italic" font-weight="700" font-size="34" fill="#F6F2EA">SF</text>
</svg>
```

- [ ] **Step 3: Replace `public/logo-full.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 64" width="260" height="64">
  <rect width="64" height="64" rx="1" fill="#1A1815"/>
  <text x="32" y="35" text-anchor="middle" dominant-baseline="middle"
        font-family="Source Serif 4, Source Serif Pro, Georgia, serif"
        font-style="italic" font-weight="700" font-size="34" fill="#F6F2EA">SF</text>
  <text x="80" y="28"
        font-family="Source Serif 4, Source Serif Pro, Georgia, serif"
        font-weight="600" font-size="22" fill="#1A1815">Startup Finance</text>
  <text x="80" y="46"
        font-family="JetBrains Mono, ui-monospace, monospace"
        font-weight="500" font-size="11" letter-spacing="1.5" fill="#6B6356">TOOLKIT</text>
</svg>
```

- [ ] **Step 4: Replace `app/icon.svg`**

The favicon renders at 16–32px, so it drops the wordmark entirely and uses a dark tile that reads on both browser-chrome themes:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="6" fill="#1A1815"/>
  <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
        font-family="Source Serif 4, Georgia, serif"
        font-style="italic" font-weight="700" font-size="36" fill="#D9A45F">SF</text>
</svg>
```

- [ ] **Step 5: Verify no gradients remain in logo assets**

```bash
grep -rin "gradient" components/shared/logo.tsx public/logo-icon.svg public/logo-full.svg app/icon.svg
```

Expected: no output.

- [ ] **Step 6: Verify no hardcoded hex remains in the component**

```bash
grep -oE "#[0-9a-fA-F]{6}" components/shared/logo.tsx
```

Expected: only `#16150F` (the dark-mode letterform, which has no token because it is `--background` in dark only and the class must be theme-scoped).

- [ ] **Step 7: Verify the build**

```bash
pnpm build
```

Expected: succeeds.

- [ ] **Step 8: Manual verification**

```bash
pnpm dev
```

- Header shows a 26px ink tile with an italic serif `SF`, followed by the wordmark.
- Toggle to dark: the tile becomes ochre with a near-black `SF`. It must not be a bright bone tile.
- Browser tab shows the new favicon (hard-reload; favicons cache aggressively).

- [ ] **Step 9: Commit**

```bash
git add components/shared/logo.tsx public/logo-icon.svg public/logo-full.svg app/icon.svg
git commit -m "feat(brand): replace gradient bar-chart mark with editorial monogram

Direction A from the handoff: italic serif SF in a solid ink tile. Pure
type, no SVG defs — deletes the sft-bar and sft-line blue-violet
gradients. In dark the tile inverts to ochre with a #16150F letterform;
a bone tile would be the brightest object on the page."
```

---

### Task 5: Chart tokens and `CHART_COLORS`

**Files:**
- Modify: `lib/constants.ts:187-198`
- Create: `lib/__tests__/design-tokens.test.ts`

**Interfaces:**
- Consumes: `--chart-1` … `--chart-10` from Task 2.
- Produces: `CHART_COLORS: string[]` — exactly 10 entries, each the literal string `"var(--chart-N)"`. Consumed unchanged by `break-even`, `equity-simulator`, `pre-post-money`, `safe-calculator`, `startup-costs`, `valuation-calculator`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/design-tokens.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CHART_COLORS } from "@/lib/constants";

describe("CHART_COLORS", () => {
  it("has at least 10 entries", () => {
    // pre-post-money, valuation-calculator and safe-calculator index this
    // array directly (CHART_COLORS[index], no modulo), so a shorter array
    // produces undefined fills on wide charts.
    expect(CHART_COLORS.length).toBeGreaterThanOrEqual(10);
  });

  it("contains only CSS custom property references", () => {
    for (const color of CHART_COLORS) {
      expect(color).toMatch(/^var\(--chart-\d+\)$/);
    }
  });

  it("references each chart token exactly once, in order", () => {
    expect(CHART_COLORS).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
      "var(--chart-6)",
      "var(--chart-7)",
      "var(--chart-8)",
      "var(--chart-9)",
      "var(--chart-10)",
    ]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test -- design-tokens
```

Expected: FAIL. `CHART_COLORS` currently holds `"#3b82f6"` etc., so the `toMatch` and `toEqual` assertions fail.

- [ ] **Step 3: Replace `CHART_COLORS`**

In `lib/constants.ts`, replace the whole `CHART_COLORS` array (lines 187–198) with:

```ts
// CSS custom properties rather than literals, so charts follow the theme
// toggle with zero JS. Recharts passes these straight to SVG fill/stroke,
// where var() resolves normally — the same mechanism shadcn's chart uses.
//
// Must stay at 10 entries: pre-post-money, valuation-calculator and
// safe-calculator index this directly without a modulo.
export const CHART_COLORS = [
  "var(--chart-1)", // ink / bone — the primary series
  "var(--chart-2)", // ochre
  "var(--chart-3)", // teal
  "var(--chart-4)", // olive
  "var(--chart-5)", // brick
  "var(--chart-6)", // slate
  "var(--chart-7)", // plum
  "var(--chart-8)", // rust
  "var(--chart-9)", // sage
  "var(--chart-10)", // ochre-deep
];
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
pnpm test -- design-tokens
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Run the full suite**

```bash
pnpm test
```

Expected: baseline count **+3**. No failures.

- [ ] **Step 6: Verify the build**

```bash
pnpm build
```

Expected: succeeds.

- [ ] **Step 7: Manual verification of every chart consumer**

```bash
pnpm dev
```

Visit each in **both** themes and confirm the chart renders with visible colours (a `var()` that fails to resolve renders black or transparent):

- `/tools/break-even` — uses indices 0, 4, 1 including a `ReferenceLine` label fill
- `/tools/equity-simulator` — stacked bars, modulo indexing
- `/tools/pre-post-money` — pie `Cell` fills
- `/tools/safe-calculator` — pie `Cell` fills
- `/tools/startup-costs` — indices 0, 1
- `/tools/valuation-calculator` — pie `Cell` fills, 5 slices

Also hover a data point on each to confirm the **tooltip swatch** picks up the colour, and check the **legend** swatches. Those are the two places Recharts might not pass the value straight through.

- [ ] **Step 8: Commit**

```bash
git add lib/constants.ts lib/__tests__/design-tokens.test.ts
git commit -m "feat(charts): drive CHART_COLORS from CSS custom properties

Ten editorial series tokens replacing the Tailwind hex palette. Charts
now follow the theme toggle with no JS.

Adds a test asserting the array stays at 10 entries and holds only
var() references — three pie charts index it directly without a modulo,
so a shorter array would silently produce undefined fills."
```

---

### Task 6: Semantic status colours + the two chart-heavy files

The largest colour files, and the only two with Recharts gradients.

**Files:**
- Modify: `lib/constants.ts` (add `STATUS_COLORS` near `RUNWAY_ZONES:200`)
- Modify: `app/tools/cash-flow-forecast/components/cash-flow-charts.tsx` (18 hex occurrences, 3 gradient refs)
- Modify: `app/tools/burn-rate/page.tsx` (10 hex occurrences, 6 gradient refs)

**Interfaces:**
- Consumes: `--good`, `--warn`, `--bad`, `--chart-1` … `--chart-10` from Task 2.
- Produces: `STATUS_COLORS: { good: string; warn: string; bad: string; neutral: string }` — each value a `var(--token)` string. Task 7 imports this from `@/lib/constants`.

- [ ] **Step 1: Add `STATUS_COLORS`**

`RUNWAY_ZONES` already lives in `lib/constants.ts` as a numeric threshold constant with no colours attached. Add the semantic trio beside it, immediately after the `RUNWAY_ZONES` block:

```ts
// Semantic status colours for charts and inline indicators.
//
// These intentionally share values with chart slots 4/8/5 but are named
// separately: a chart *series slot* and a *status* are different concepts
// even when they render identically. Use STATUS_COLORS when the colour
// means "healthy" or "critical"; use CHART_COLORS when it just means
// "the second line".
export const STATUS_COLORS = {
  good: "var(--good)",
  warn: "var(--warn)",
  bad: "var(--bad)",
  neutral: "var(--muted-foreground)",
} as const;
```

- [ ] **Step 2: Establish the mapping rule**

Apply this table in both files. Decide per usage by what the colour *means*, not by its value:

| Literal | Meaning in context | Replace with |
|---|---|---|
| `#3b82f6` | Primary data series (cash balance, runway line) | `CHART_COLORS[0]` |
| `#1d4ed8` | Darker variant of the primary series | `CHART_COLORS[5]` |
| `#22c55e` | "Healthy" / positive status | `STATUS_COLORS.good` |
| `#22c55e` | Just another series, no status meaning | `CHART_COLORS[3]` |
| `#ef4444` | Critical / negative status | `STATUS_COLORS.bad` |
| `#f59e0b` | Caution status | `STATUS_COLORS.warn` |
| `#f97316` | Fourth series, no status meaning | `CHART_COLORS[7]` |
| `#8b5cf6` | Fourth series | `CHART_COLORS[6]` |
| `#e5e7eb` | Divider / grid line | `"var(--border)"` |

- [ ] **Step 3: Convert `cash-flow-charts.tsx`**

Add the imports (extend the existing `@/lib/constants` import rather than adding a second one):

```tsx
import { CHART_COLORS, STATUS_COLORS } from "@/lib/constants";
```

Replace all 18 hex literals per the Step 2 table.

Then **remove the gradients.** Find each `<linearGradient>` block inside `<defs>` and every `fill="url(#…)"` that references it. Replace the referencing `fill` with a flat colour plus opacity. For example, a series whose area was filled by a blue gradient becomes:

```tsx
fill={CHART_COLORS[0]}
fillOpacity={0.12}
```

Delete the now-unused `<linearGradient>` definitions and the `<defs>` wrapper if it becomes empty. This is a deliberate visual change: the design forbids gradients including in charts.

- [ ] **Step 4: Convert `burn-rate/page.tsx`**

Same procedure. Its 6 gradient references are the `<stop stopColor="#3b82f6">` / `#22c55e` triplets at roughly lines 237–244, defining two area fills. Replace both areas with flat fills at `fillOpacity={0.12}` and delete the gradient defs.

- [ ] **Step 5: Verify no hex or gradients remain in these two files**

```bash
grep -oE "#[0-9a-fA-F]{6}" app/tools/burn-rate/page.tsx app/tools/cash-flow-forecast/components/cash-flow-charts.tsx
grep -in "gradient" app/tools/burn-rate/page.tsx app/tools/cash-flow-forecast/components/cash-flow-charts.tsx
```

Expected: no output from either.

- [ ] **Step 6: Verify build and tests**

```bash
pnpm build && pnpm test
```

Expected: build succeeds; test count unchanged from Task 5.

- [ ] **Step 7: Manual verification**

```bash
pnpm dev
```

- `/tools/burn-rate` in both themes: both area charts render with flat translucent fills. No blue or green survives. The runway zone indicators still read as healthy/caution/critical.
- `/tools/cash-flow-forecast` in both themes: the composed chart renders all series distinctly. Check the tooltip and legend.

- [ ] **Step 8: Lint the touched files**

```bash
pnpm exec eslint lib/constants.ts app/tools/burn-rate/page.tsx app/tools/cash-flow-forecast/components/cash-flow-charts.tsx
```

Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add lib/constants.ts app/tools/burn-rate/page.tsx app/tools/cash-flow-forecast/components/cash-flow-charts.tsx
git commit -m "refactor(colour): tokenise burn-rate and cash-flow charts

Adds STATUS_COLORS beside the existing RUNWAY_ZONES thresholds and maps
28 hex literals by role rather than by value — the same #22c55e means
'runway healthy' in one file and 'positive variance' in another.

Also flattens the Recharts area gradients in both files; the design
forbids gradients including in charts."
```

---

### Task 7: Remaining hardcoded colours and the hero gradient

**Files:**
- Modify: `app/tools/msme-financial-plan/page.tsx` (15)
- Modify: `app/tools/financial-model-builder/components/financial-model-results.tsx` (10)
- Modify: `app/tools/unit-economics/page.tsx` (8)
- Modify: `app/tools/market-sizing/page.tsx` (6)
- Modify: `app/tools/self-assessment/page.tsx` (2)
- Modify: `app/tools/safe-calculator/page.tsx` (1)
- Modify: `app/tools/pre-post-money/page.tsx` (1)
- Modify: `app/page.tsx`
- Modify: `app/tools/page.tsx`, `app/learn/page.tsx`, and the 3 tool pages carrying `hover:shadow`

**Interfaces:**
- Consumes: `CHART_COLORS` and `STATUS_COLORS` from Tasks 5 and 6.
- Produces: nothing new. This task only removes literals.

- [ ] **Step 1: Convert the seven remaining colour files**

Apply the **exact same mapping table from Task 6 Step 2** to each file. Reproduced here so you do not need to read Task 6:

| Literal | Meaning in context | Replace with |
|---|---|---|
| `#3b82f6` | Primary data series | `CHART_COLORS[0]` |
| `#1d4ed8` | Darker variant of the primary series | `CHART_COLORS[5]` |
| `#22c55e` | "Healthy" / positive status | `STATUS_COLORS.good` |
| `#22c55e` | Just another series, no status meaning | `CHART_COLORS[3]` |
| `#ef4444` | Critical / negative status | `STATUS_COLORS.bad` |
| `#f59e0b` | Caution status | `STATUS_COLORS.warn` |
| `#f97316` | Fourth series, no status meaning | `CHART_COLORS[7]` |
| `#8b5cf6` | Fourth series | `CHART_COLORS[6]` |
| `#e5e7eb` | Divider / grid line | `"var(--border)"` |

Add or extend the `@/lib/constants` import in each file as needed.

- [ ] **Step 2: Remove the hero gradient block**

This is the one deliberate exception to "no layout changes". In `app/page.tsx`, delete the entire decorative overlay `<div>` — the one whose `style` object contains `backgroundImage`, `maskImage`, and `WebkitMaskImage` (roughly lines 29–38), including its `{/* Subtle grid background with radial fade */}` comment.

Then, on the enclosing `<section>`, replace:

```tsx
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-transparent">
```

with:

```tsx
        <section className="relative overflow-hidden border-b">
```

**Do not touch the hero's content** — the `<h1>`, the two `<p>` elements, and the CTA row stay exactly as they are. Phase 2 replaces them.

- [ ] **Step 3: Remove the remaining hover-glow shadows**

The design has no shadows. Remove the `hover:shadow-[0_0_15px_-3px] hover:shadow-primary/15` class pair — leaving `hover:border-primary/50 transition-all` intact — from every occurrence in:

```
app/page.tsx
app/tools/page.tsx
app/learn/page.tsx
app/tools/market-sizing/page.tsx
app/tools/msme-financial-plan/page.tsx
app/tools/unit-economics/page.tsx
app/tools/financial-model-builder/components/financial-model-tables.tsx
```

- [ ] **Step 4: Verify the colour surface is clean**

```bash
grep -rlE "#[0-9a-fA-F]{6}" --include=*.tsx app components
```

Expected: exactly one path — `components/shared/export-pdf-button.tsx` (explicitly deferred).

- [ ] **Step 5: Verify gradients and shadows are gone**

```bash
grep -rin "gradient" --include=*.tsx --include=*.css --include=*.svg app components public
grep -rn "shadow-" --include=*.tsx app components
```

Expected: the first returns nothing. The second returns only the `shadow-none` in `components/ui/tabs.tsx`.

Note `app/api/newsletter/subscribe/route.ts` is a `.ts` file and so is excluded by these globs — its email-template gradient is deferred by design.

- [ ] **Step 6: Verify build and tests**

```bash
pnpm build && pnpm test
```

Expected: build succeeds; test count unchanged.

- [ ] **Step 7: Manual verification**

```bash
pnpm dev
```

- `/` has no gradient wash behind the hero, and a hairline rule below it. The headline, subheading and buttons are unchanged in position and wording.
- `/tools/msme-financial-plan`, `/tools/financial-model-builder`, `/tools/unit-economics`, `/tools/market-sizing`, `/tools/self-assessment` — every chart renders in both themes with no Tailwind blue, green, amber or violet anywhere.
- Hovering a tool card changes its border colour only. No glow.

- [ ] **Step 8: Commit**

```bash
git add app components
git commit -m "refactor(colour): remove remaining hardcoded colours and gradients

Tokenises the last 43 hex literals across seven tool files, deletes the
homepage hero gradient overlay, and strips the hover-glow shadows.

The site now has zero hardcoded colours outside export-pdf-button.tsx
and zero gradients outside the newsletter email template, both of which
are deferred by the spec."
```

---

### Task 8: Colour-discipline guards and the full sweep

Locks the result so later phases cannot silently reintroduce Tailwind blue.

**Files:**
- Modify: `lib/__tests__/design-tokens.test.ts`

**Interfaces:**
- Consumes: the clean state produced by Tasks 2–7.
- Produces: regression guards. No runtime code.

- [ ] **Step 1: Write the failing guard tests**

Append to `lib/__tests__/design-tokens.test.ts`. Move the two `import` lines up to join the existing imports at the top of the file — they are hoisted either way, but keeping them together is clearer.

```ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Vitest runs from the repo root, which IS the `app/` directory.
// Do not use __dirname — this file is ESM and it is undefined there.
const ROOT = process.cwd();

// Deferred by the Phase 1 spec — see docs/superpowers/specs/
// 2026-07-29-editorial-redesign-phase-1-design.md §7.
const HEX_ALLOWLIST = [
  "components/shared/export-pdf-button.tsx",
  // The dark-mode logo letterform: it is --background in dark only, so it
  // must be written as a theme-scoped class rather than a token reference.
  "components/shared/logo.tsx",
];

const GRADIENT_ALLOWLIST = ["app/api/newsletter/subscribe/route.ts"];

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".superpowers") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, exts));
    } else if (exts.some((e) => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

function sourceFiles(exts: string[]): string[] {
  // lib/ is included: CHART_COLORS and STATUS_COLORS live there, and it is
  // exactly where a future phase would be tempted to reintroduce a literal.
  return [
    ...walk(join(ROOT, "app"), exts),
    ...walk(join(ROOT, "components"), exts),
    ...walk(join(ROOT, "lib"), exts),
  ];
}

describe("colour discipline", () => {
  it("has no hardcoded hex colours outside the allowlist", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles([".tsx", ".ts"])) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (HEX_ALLOWLIST.includes(rel)) continue;
      const matches = readFileSync(file, "utf8").match(/#[0-9a-fA-F]{6}\b/g);
      if (matches) offenders.push(`${rel}: ${matches.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("has no gradients outside the allowlist", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles([".tsx", ".ts", ".css", ".svg"])) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (GRADIENT_ALLOWLIST.includes(rel)) continue;
      if (/gradient/i.test(readFileSync(file, "utf8"))) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("has no drop shadows in components", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles([".tsx"])) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      // shadow-none asserts the absence of a shadow — that is allowed.
      const matches = readFileSync(file, "utf8").match(/shadow-(?!none)[a-z0-9[\]/_-]+/g);
      if (matches) offenders.push(`${rel}: ${matches.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the guards**

```bash
pnpm test -- design-tokens
```

Expected: PASS, 6 tests. If any fail, the failure message names the exact file and literal — go fix it in place, then re-run. Do not add to an allowlist to make a test pass.

- [ ] **Step 3: Run the full suite**

```bash
pnpm test
```

Expected: baseline **+6**. No failures.

- [ ] **Step 4: Verify the build one final time**

```bash
pnpm build
```

Expected: succeeds, 27 pages + 3 API routes.

- [ ] **Step 5: The full route sweep**

This is the real cost of Phase 1 and it cannot be automated — the site has been dark-only since launch, so **light mode has never been looked at**. Expect real findings.

```bash
pnpm dev
```

Visit every route in **both** themes. Priority order — the 13 Recharts tools first:

```
/tools/break-even          /tools/burn-rate           /tools/cash-flow-forecast
/tools/equity-simulator    /tools/financial-model-builder
/tools/market-sizing       /tools/msme-financial-plan /tools/pre-post-money
/tools/safe-calculator     /tools/self-assessment     /tools/startup-costs
/tools/unit-economics      /tools/valuation-calculator
```

Then the remaining routes:

```
/  /tools  /learn  /about  /contact
/tools/compliance-checklist  /tools/fundraising-guide  /tools/pricing-calculator
/learn/pricing-your-product  /learn/reading-financial-statements
/learn/startup-valuation     /learn/managing-cash-flow
/learn/understanding-safes   /learn/break-even-analysis
```

On each, check: text is readable against its background; no element has vanished into its surface; charts render with visible series; borders are present where cards used to rely on shadows.

Record every defect as a list. Fix them in this task and re-verify — do not defer them to Phase 2.

- [ ] **Step 6: Contrast verification**

The spec claims AAA body and AA accents. Verify with DevTools' contrast checker or any WCAG tool, in both themes:

| Pair | Required |
|---|---|
| `--foreground` on `--background` | AAA (≥ 7:1) |
| `--muted-foreground` on `--background` | AA (≥ 4.5:1) |
| `--ochre-deep` on `--background` (light) | AA |
| `--ochre` on `--background` (dark) | AA |
| `--link` on `--background` | AA |

Any failure is a token bug — report the pair and the measured ratio rather than adjusting the value yourself, since these were chosen against the handoff.

- [ ] **Step 7: Lighthouse check**

The spec requires mobile performance at or above baseline, and this phase went from 2 font files to 4.

```bash
pnpm build && pnpm start
```

Run Lighthouse mobile on `/` and `/tools/burn-rate`. Compare against master. If performance dropped, report the delta and the largest contributor — do not start optimising without checking in.

- [ ] **Step 8: Commit**

```bash
git add lib/__tests__/design-tokens.test.ts
git commit -m "test(design): guard against hardcoded colours, gradients and shadows

Six assertions that fail the build if a later phase reintroduces a hex
literal, a gradient, or a drop shadow outside the two allowlisted files.

The redesign's definition of done is a set of greps; this makes them
executable so they cannot rot."
```

- [ ] **Step 9: Open the pull request**

```bash
git push -u origin feat/editorial-redesign-phase-1
gh pr create --base master --title "Editorial redesign phase 1: foundation" --body "$(cat <<'EOF'
Implements Phase 1 of the "Quiet Authority" editorial redesign.

Spec: `docs/superpowers/specs/2026-07-29-editorial-redesign-phase-1-design.md`

## What changed

- **Theme mechanism** — light/dark toggle via `next-themes`. The site was dark-only; it now honours `prefers-color-scheme` on first visit and persists a choice thereafter.
- **Identity** — Source Serif 4 / Inter / JetBrains Mono replace Geist. Both token blocks rewritten to the paper-and-ink palette. New base layer gives serif headings, prose link colours, and tabular numerals.
- **Primitives** — 4px radius ceiling, all drop shadows removed, new `ochre` button variant for Phase 2.
- **Logo** — editorial `SF` monogram replacing the blue-violet bar chart.
- **Colour** — `CHART_COLORS` now reads CSS custom properties; 76 hardcoded hex literals removed across 10 files; all gradients removed.

## Deliberate deviations from the handoff

- `--accent` is **not** mapped to ochre. In shadcn it is the hover-*surface* token, so ochre there would turn every hover state into a solid block. Ochre lives in `--ochre` / `--ochre-deep`.
- Link colours are scoped to prose contexts rather than a blanket `a` rule, because every tool card is anchor-wrapped and would otherwise render teal.
- `Card` moved from `rounded-xl` to `rounded-lg` — under the new `--radius` the former computed to 8px, breaking the 4px ceiling.

## Not in this PR

`export-pdf-button.tsx`'s private `PRINT_CSS` (30 hexes) and the newsletter email gradient, both deferred by the spec. No layout changes — the homepage hero keeps its content until Phase 2.

## Verification

- `pnpm build` — 27 pages + 3 API routes
- `pnpm test` — baseline +9
- All 27 routes swept by hand in both themes
- Contrast verified: body AAA, accents AA

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_018n7yuTWT7qowfMpgEpqmdj
EOF
)"
```

---

## Self-review

**Spec coverage.** Every section maps to a task: §3 theme mechanism → Task 1. §4.1 fonts → Task 2 Steps 1–2. §4.2 tokens and all three corrections → Task 2 Steps 3–6 and Task 3 Step 1. §4.3 base layer → Task 2 Step 7. §4.4 primitives → Task 3. §4.5 logo → Task 4. §4.6 chart tokens → Tasks 2 and 5. §4.7 gradients → Tasks 4, 6, 7. §4.8 hexes → Tasks 6, 7. §5 verification → distributed, consolidated in Task 8.

**Type consistency.** `CHART_COLORS` is `string[]` throughout. `STATUS_COLORS` keys (`good`, `warn`, `bad`, `neutral`) are used identically in Tasks 6 and 7. `ThemeProvider` and `ThemeToggle` are named exports in both their defining task and their consuming step. The mapping table is reproduced verbatim in Task 7 rather than cross-referenced, since tasks may be executed out of order by separate agents.

**Known plan-level risk.** Tasks 6 and 7 require judgment — deciding whether a given `#22c55e` means "healthy" or "series 4" cannot be mechanised. The mapping table gives the rule; the reviewer should spot-check that status colours were not applied to plain series and vice versa.

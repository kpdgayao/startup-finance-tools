# Logo & Icon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder "SF" text icon with a proper "Growth Chart" logo mark and integrate it across the site.

**Architecture:** Create SVG logo assets (icon mark, full horizontal logo, favicon) and a React `<Logo>` component with variant prop. Replace the Lucide `BarChart3` icon in the header with the new logo component.

**Tech Stack:** SVG, React/TypeScript, Tailwind CSS, Next.js (app/icon.svg convention for favicon)

---

### Task 1: Create the icon mark SVG

**Files:**
- Create: `public/logo-icon.svg`

**Step 1: Create the standalone icon mark SVG**

Create `public/logo-icon.svg` with three ascending rounded-top bars and a diagonal growth line, using a blue-to-purple gradient:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="bar-grad" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <linearGradient id="line-grad" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <!-- Bar 1 (shortest, left) -->
  <rect x="6" y="36" width="14" height="22" rx="3" fill="url(#bar-grad)" opacity="0.7"/>
  <!-- Bar 2 (medium, center) -->
  <rect x="25" y="24" width="14" height="34" rx="3" fill="url(#bar-grad)" opacity="0.85"/>
  <!-- Bar 3 (tallest, right) -->
  <rect x="44" y="12" width="14" height="46" rx="3" fill="url(#bar-grad)"/>
  <!-- Growth line -->
  <path d="M8 52 Q24 38 32 32 Q40 26 56 10" stroke="url(#line-grad)" stroke-width="3" stroke-linecap="round" fill="none"/>
  <!-- Dot at end of growth line -->
  <circle cx="56" cy="10" r="3.5" fill="#8b5cf6"/>
</svg>
```

**Step 2: Verify the file renders**

Open `public/logo-icon.svg` in a browser to visually confirm: three ascending bars with gradient, diagonal growth line, and end dot.

**Step 3: Commit**

```bash
git add public/logo-icon.svg
git commit -m "feat: add growth chart icon mark SVG"
```

---

### Task 2: Create the favicon/app icon SVG

**Files:**
- Modify: `app/icon.svg` (replace existing "SF" text icon)

**Step 1: Replace app/icon.svg with the icon mark on a dark background**

This is the favicon/browser tab icon. Simplified version (no growth line) for legibility at small sizes:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <defs>
    <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
  <!-- Bar 1 (shortest) -->
  <rect x="5" y="18" width="6" height="10" rx="1.5" fill="url(#g)" opacity="0.7"/>
  <!-- Bar 2 (medium) -->
  <rect x="13" y="12" width="6" height="16" rx="1.5" fill="url(#g)" opacity="0.85"/>
  <!-- Bar 3 (tallest) -->
  <rect x="21" y="6" width="6" height="22" rx="1.5" fill="url(#g)"/>
</svg>
```

**Step 2: Verify favicon**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm dev`

Open the site in a browser and check the browser tab — should show three ascending gradient bars on a dark background.

**Step 3: Commit**

```bash
git add app/icon.svg
git commit -m "feat: replace SF favicon with growth chart icon"
```

---

### Task 3: Create the full horizontal logo SVG

**Files:**
- Create: `public/logo-full.svg`

**Step 1: Create the horizontal logo with icon mark + wordmark**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 48" fill="none">
  <defs>
    <linearGradient id="bar-grad" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <linearGradient id="line-grad" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <!-- Icon mark (scaled to 48x48) -->
  <g transform="translate(0,0) scale(0.75)">
    <rect x="6" y="36" width="14" height="22" rx="3" fill="url(#bar-grad)" opacity="0.7"/>
    <rect x="25" y="24" width="14" height="34" rx="3" fill="url(#bar-grad)" opacity="0.85"/>
    <rect x="44" y="12" width="14" height="46" rx="3" fill="url(#bar-grad)"/>
    <path d="M8 52 Q24 38 32 32 Q40 26 56 10" stroke="url(#line-grad)" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="56" cy="10" r="3.5" fill="#8b5cf6"/>
  </g>
  <!-- Wordmark -->
  <text x="56" y="22" font-family="system-ui,-apple-system,sans-serif" font-weight="600" font-size="16" fill="currentColor">Startup Finance</text>
  <text x="56" y="38" font-family="system-ui,-apple-system,sans-serif" font-weight="300" font-size="16" fill="currentColor" opacity="0.6">Toolkit</text>
</svg>
```

**Step 2: Verify renders correctly**

Open `public/logo-full.svg` in a browser. Should show the icon mark on the left with "Startup Finance" (semibold) and "Toolkit" (light, muted) stacked on the right.

**Step 3: Commit**

```bash
git add public/logo-full.svg
git commit -m "feat: add horizontal logo SVG with wordmark"
```

---

### Task 4: Create the Logo React component

**Files:**
- Create: `components/shared/logo.tsx`

**Step 1: Create the Logo component**

This component renders the icon mark inline as JSX SVG so it inherits Tailwind classes. It has two variants: `icon` (mark only) and `full` (mark + text wordmark).

```tsx
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "icon" | "full";
  className?: string;
}

export function Logo({ variant = "icon", className }: LogoProps) {
  const mark = (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", variant === "icon" ? "h-6 w-6" : "h-8 w-8", className && variant === "icon" ? className : undefined)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sft-bar" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="sft-line" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="6" y="36" width="14" height="22" rx="3" fill="url(#sft-bar)" opacity="0.7" />
      <rect x="25" y="24" width="14" height="34" rx="3" fill="url(#sft-bar)" opacity="0.85" />
      <rect x="44" y="12" width="14" height="46" rx="3" fill="url(#sft-bar)" />
      <path d="M8 52 Q24 38 32 32 Q40 26 56 10" stroke="url(#sft-line)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="56" cy="10" r="3.5" fill="#8b5cf6" />
    </svg>
  );

  if (variant === "icon") return mark;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {mark}
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">Startup Finance</span>
        <span className="text-xs font-light text-muted-foreground">Toolkit</span>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to logo.tsx

**Step 3: Commit**

```bash
git add components/shared/logo.tsx
git commit -m "feat: add Logo component with icon and full variants"
```

---

### Task 5: Replace BarChart3 in header with Logo component

**Files:**
- Modify: `components/layout/header.tsx`

**Step 1: Update the header**

Replace the Lucide `BarChart3` import and usage with the new `Logo` component.

Change the import section — remove:
```typescript
import { BarChart3 } from "lucide-react";
```

Add:
```typescript
import { Logo } from "@/components/shared/logo";
```

Replace the logo link content (line 20-23). Change:
```tsx
<Link href="/" className="flex items-center gap-2 font-semibold">
  <BarChart3 className="h-5 w-5 text-primary" />
  <span>Startup Finance Toolkit</span>
</Link>
```

To:
```tsx
<Link href="/" className="flex items-center gap-2 font-semibold">
  <Logo variant="icon" />
  <span>Startup Finance Toolkit</span>
</Link>
```

**Step 2: Verify TypeScript compiles**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Visual verification**

Run dev server and check the header — should show the gradient growth chart icon instead of the old BarChart3 icon, next to "Startup Finance Toolkit" text.

**Step 4: Commit**

```bash
git add components/layout/header.tsx
git commit -m "feat: replace BarChart3 with Logo component in header"
```

---

### Task 6: Visual verification of all logo placements

**Step 1: Start dev server**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm dev`

**Step 2: Verify all placements**

Check these pages:
1. **Browser tab** — favicon shows three ascending gradient bars on dark background
2. **Header** (any page) — growth chart icon mark next to "Startup Finance Toolkit"
3. **Static assets** — `/logo-icon.svg` loads correctly at `http://localhost:3000/logo-icon.svg`
4. **Static assets** — `/logo-full.svg` loads correctly at `http://localhost:3000/logo-full.svg`

**Step 3: Check responsiveness**

Resize browser to mobile width — icon should remain sharp and visible at header size.

# Logo & Icon Design — "Growth Chart" Mark

**Date:** 2026-02-23
**Status:** Approved

## Concept

Modern minimal logo combining three ascending bars (chart) with a diagonal growth line that subtly curves like an "S". Blue-to-purple gradient (#3b82f6 → #8b5cf6) carries forward from existing icon.svg branding.

## Color Spec

| Token | Value | Usage |
|---|---|---|
| Gradient start | `#3b82f6` (blue-500) | Left side of bars / growth line |
| Gradient end | `#8b5cf6` (violet-500) | Right side of bars / growth line |
| Background (icon) | `#0a0a0a` | Dark rounded-rect for favicon/PWA |
| Wordmark | `currentColor` | Adapts to dark/light theme |

## Logo Variants

### 1. Icon Mark (standalone symbol)
- Three ascending rounded-top bars with gradient fill
- Diagonal growth line (gradient stroke) cutting across bars
- Used at: 32x32 (favicon), 192x192 (PWA), 512x512 (PWA large)

### 2. Horizontal Logo (icon + wordmark)
- Icon mark left, wordmark right
- "Startup Finance" — Geist Sans, 600 weight (semibold)
- "Toolkit" — Geist Sans, 300 weight (light), muted color
- Used at: homepage hero, footer, about page

### 3. Favicon (simplified)
- Bars only (no growth line) for legibility at 16px
- Dark rounded-rect background with rx=6

## Files to Create

| File | Purpose |
|---|---|
| `app/icon.svg` | Replace current "SF" text icon (Next.js auto-favicon) |
| `public/logo-icon.svg` | Standalone mark for reuse |
| `public/logo-full.svg` | Horizontal logo with wordmark |
| `components/shared/logo.tsx` | React component: `variant="icon" \| "full"`, `className` prop |

## Files to Modify

| File | Change |
|---|---|
| `components/layout/header.tsx` | Replace `<BarChart3>` with `<Logo variant="icon" />` |

## Design Principles

- Geometric and clean — no decorative elements
- Gradient is the only color — everything else is neutral
- Scales from 16px (favicon) to any size (SVG)
- Growth line omitted below 32px for legibility
- Wordmark uses project's existing Geist font — no new font dependencies

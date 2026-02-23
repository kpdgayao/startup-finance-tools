# About Page + Learn Modules Update Design

**Date:** 2026-02-23
**Status:** Approved

## Goal

Update the About page to include the 3 new tools, and add 2 new Learn modules for SAFEs and break-even analysis.

## Changes

### About Page (app/about/page.tsx)
- Add 3 tool descriptions to "What's Included" section
- Add 2 learn module descriptions to "Learn Startup Finance" section

### New Learn Modules
1. `/learn/understanding-safes` — SAFEs vs. convertible notes, caps, discounts, stacking, PH context. Links to safe-calculator.
2. `/learn/break-even-analysis` — Break-even formula, contribution margin, 3 levers, SaaS context, PH context. Links to break-even.

### Constants (lib/constants.ts)
Add 2 entries to LEARN_MODULES. Sitemap auto-includes.

### Learn Sidebar (components/layout/learn-sidebar.tsx)
Add FileText and Scale icons to iconMap.

## Files to Create
- `app/learn/understanding-safes/page.tsx`
- `app/learn/understanding-safes/layout.tsx`
- `app/learn/break-even-analysis/page.tsx`
- `app/learn/break-even-analysis/layout.tsx`

## Files to Modify
- `app/about/page.tsx`
- `lib/constants.ts`
- `components/layout/learn-sidebar.tsx` (icon imports)

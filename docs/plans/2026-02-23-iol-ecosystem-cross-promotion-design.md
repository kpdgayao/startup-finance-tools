# IOL Ecosystem Cross-Promotion Design

**Date:** 2026-02-23
**Status:** Approved

## Goal

Cross-promote TalinoHR (https://talinohr.com/) and MoneyGlow (https://moneyglow.app/) within Startup Finance Tools under a unified "Built by IOL" ecosystem brand.

## Platforms

| Platform | URL | Audience | Value |
|---|---|---|---|
| Startup Finance Tools | startupfinance.tools | Filipino founders | Financial planning & fundraising |
| TalinoHR | talinohr.com | Philippine SMEs | AI-native HRIS, payroll, compliance |
| MoneyGlow | moneyglow.app | Young Filipino creators | Budgeting & income tracking |

## Design

### 1. Footer Ecosystem Strip

**Location:** Footer, between NewsletterSection and attribution/copyright.

**Layout:** 3-column grid (stacked on mobile). Each platform as a card showing icon, name, and one-line description. Current platform has a "You are here" indicator; others link externally (target="_blank", rel="noopener").

**Component:** `components/shared/ecosystem-strip.tsx`

### 2. Contextual Banners (4 Tool Pages)

**Location:** Between AiInsightsPanel and RelatedTools on specific tool pages.

**Component:** `components/shared/ecosystem-banner.tsx` — reusable, dismissible (sessionStorage), with left accent border.

**Placements:**

| Tool Page | Promotes | Message |
|---|---|---|
| burn-rate | TalinoHR | "Payroll is usually the biggest burn driver. TalinoHR automates PH payroll, SSS, PhilHealth & Pag-IBIG compliance." |
| financial-model-builder | TalinoHR | "Building headcount into your model? TalinoHR handles automated payroll and compliance for Philippine teams." |
| compliance-checklist | TalinoHR | "Done with SEC/BIR registration? TalinoHR keeps your SSS, PhilHealth & Pag-IBIG contributions compliant automatically." |
| fundraising-guide | TalinoHR | "Scaling your team post-funding? TalinoHR is an AI-native HRIS built for Philippine startups." |

MoneyGlow appears only in the footer strip (weaker audience overlap with founders).

### 3. Data Layer

**File:** `lib/ecosystem.ts`

Centralized platform data: name, url, description, icon, and per-tool contextual messages. Single source of truth for all ecosystem references.

## Files to Create

- `components/shared/ecosystem-strip.tsx`
- `components/shared/ecosystem-banner.tsx`
- `lib/ecosystem.ts`

## Files to Modify

- `components/layout/footer.tsx` — add EcosystemStrip
- `app/tools/burn-rate/page.tsx` — add EcosystemBanner
- `app/tools/financial-model-builder/page.tsx` — add EcosystemBanner
- `app/tools/compliance-checklist/page.tsx` — add EcosystemBanner
- `app/tools/fundraising-guide/page.tsx` — add EcosystemBanner

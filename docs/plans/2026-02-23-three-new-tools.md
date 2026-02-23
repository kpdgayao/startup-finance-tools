# Three New Tools Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add SAFE/Convertible Note Calculator, Break-Even Analysis, and Startup Cost Estimator to the platform with full integration (sidebar, relationships, AI insights, SEO).

**Architecture:** Each tool follows the existing pattern: pure calculation functions in `lib/calculations/`, a `"use client"` page component with Recharts visualization and AI insights, a layout with SEO metadata. Platform integration touches constants, tool relationships, and AI prompts. The Startup Cost Estimator reuses compliance checklist data for registration costs.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts, Lucide icons, Zod (validation)

---

### Task 1: Create SAFE calculator calculation functions

**Files:**
- Create: `lib/calculations/safe-calculator.ts`

**Step 1: Create the calculation file**

```typescript
export interface SafeInputs {
  investmentAmount: number;
  valuationCap: number;
  discountRate: number; // e.g. 20 for 20%
}

export interface NoteInputs extends SafeInputs {
  interestRate: number; // annual, e.g. 5 for 5%
  termMonths: number;
}

export interface PricedRoundInputs {
  preMoneyValuation: number;
  roundSize: number;
}

export interface ConversionResult {
  label: string;
  effectivePricePerShare: number;
  sharesIssued: number;
  ownershipPercent: number;
  investmentValue: number;
}

export interface SafeConversionResult {
  capPrice: number;
  discountPrice: number;
  effectivePrice: number;
  conversionMethod: "cap" | "discount";
  principalConverted: number;
  sharesIssued: number;
  ownershipPercent: number;
  scenarios: ConversionResult[];
  pieData: { name: string; value: number }[];
}

export function calculateSafeConversion(
  safe: SafeInputs,
  round: PricedRoundInputs
): SafeConversionResult | null {
  if (
    round.preMoneyValuation <= 0 ||
    round.roundSize <= 0 ||
    safe.investmentAmount <= 0
  )
    return null;

  const postMoney = round.preMoneyValuation + round.roundSize;
  const pricePerShare = postMoney / 10_000_000; // assume 10M shares outstanding

  // Cap price: investment buys shares as if company valued at cap
  const capPrice =
    safe.valuationCap > 0 ? safe.valuationCap / 10_000_000 : Infinity;

  // Discount price: round price × (1 - discount)
  const discountPrice = pricePerShare * (1 - safe.discountRate / 100);

  // Effective price is the lower of cap or discount (better deal for investor)
  const effectivePrice = Math.min(
    capPrice === Infinity ? discountPrice : capPrice,
    discountPrice
  );
  const conversionMethod =
    capPrice <= discountPrice && capPrice !== Infinity ? "cap" : "discount";

  const principalConverted = safe.investmentAmount;
  const safeShares = principalConverted / effectivePrice;
  const roundShares = round.roundSize / pricePerShare;
  const totalShares = 10_000_000 + safeShares + roundShares;
  const ownershipPercent = (safeShares / totalShares) * 100;

  // Build 3 scenarios
  const scenarios = buildConversionScenarios(
    safe,
    round,
    pricePerShare,
    capPrice,
    discountPrice
  );

  const founderPercent =
    100 -
    ownershipPercent -
    (roundShares / totalShares) * 100;

  const pieData = [
    { name: "Founders", value: founderPercent },
    { name: "SAFE Holder", value: ownershipPercent },
    { name: "New Investors", value: (roundShares / totalShares) * 100 },
  ];

  return {
    capPrice,
    discountPrice,
    effectivePrice,
    conversionMethod,
    principalConverted,
    sharesIssued: safeShares,
    ownershipPercent,
    scenarios,
    pieData,
  };
}

export function calculateNoteConversion(
  note: NoteInputs,
  round: PricedRoundInputs
): SafeConversionResult | null {
  // Accrue interest on principal
  const accruedInterest =
    note.investmentAmount *
    (note.interestRate / 100) *
    (note.termMonths / 12);
  const totalPrincipal = note.investmentAmount + accruedInterest;

  // Treat as SAFE with inflated principal
  return calculateSafeConversion(
    { ...note, investmentAmount: totalPrincipal },
    round
  );
}

function buildConversionScenarios(
  safe: SafeInputs,
  round: PricedRoundInputs,
  pricePerShare: number,
  capPrice: number,
  discountPrice: number
): ConversionResult[] {
  const postMoney = round.preMoneyValuation + round.roundSize;
  const scenarios: ConversionResult[] = [];

  // Scenario 1: With cap
  if (safe.valuationCap > 0) {
    const shares = safe.investmentAmount / capPrice;
    const roundShares = round.roundSize / pricePerShare;
    const total = 10_000_000 + shares + roundShares;
    scenarios.push({
      label: "With Cap",
      effectivePricePerShare: capPrice,
      sharesIssued: shares,
      ownershipPercent: (shares / total) * 100,
      investmentValue: safe.investmentAmount,
    });
  }

  // Scenario 2: With discount
  if (safe.discountRate > 0) {
    const shares = safe.investmentAmount / discountPrice;
    const roundShares = round.roundSize / pricePerShare;
    const total = 10_000_000 + shares + roundShares;
    scenarios.push({
      label: "With Discount",
      effectivePricePerShare: discountPrice,
      sharesIssued: shares,
      ownershipPercent: (shares / total) * 100,
      investmentValue: safe.investmentAmount,
    });
  }

  // Scenario 3: No SAFE (just the priced round)
  {
    const roundShares = round.roundSize / pricePerShare;
    const total = 10_000_000 + roundShares;
    scenarios.push({
      label: "No SAFE",
      effectivePricePerShare: pricePerShare,
      sharesIssued: 0,
      ownershipPercent: 0,
      investmentValue: 0,
    });
  }

  return scenarios;
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add lib/calculations/safe-calculator.ts
git commit -m "feat: add SAFE/convertible note calculation functions"
```

---

### Task 2: Create break-even calculation functions

**Files:**
- Create: `lib/calculations/break-even.ts`

**Step 1: Create the calculation file**

```typescript
export interface BreakEvenInputs {
  fixedCostsMonthly: number;
  variableCostPerUnit: number;
  sellingPricePerUnit: number;
  currentMonthlyVolume?: number;
  targetProfitMargin?: number; // e.g. 20 for 20%
}

export interface BreakEvenResult {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  contributionMarginPerUnit: number;
  contributionMarginRatio: number;
  marginOfSafety: number | null; // null if no current volume
  marginOfSafetyPercent: number | null;
  targetProfitUnits: number | null;
  targetProfitRevenue: number | null;
}

export interface BreakEvenChartPoint {
  units: number;
  revenue: number;
  totalCost: number;
  profit: number;
}

export function calculateBreakEven(
  inputs: BreakEvenInputs
): BreakEvenResult | null {
  const { fixedCostsMonthly, variableCostPerUnit, sellingPricePerUnit } =
    inputs;

  if (sellingPricePerUnit <= 0) return null;

  const contributionMarginPerUnit = sellingPricePerUnit - variableCostPerUnit;
  if (contributionMarginPerUnit <= 0) return null; // can never break even

  const contributionMarginRatio =
    contributionMarginPerUnit / sellingPricePerUnit;

  const breakEvenUnits = Math.ceil(
    fixedCostsMonthly / contributionMarginPerUnit
  );
  const breakEvenRevenue = breakEvenUnits * sellingPricePerUnit;

  // Margin of safety
  let marginOfSafety: number | null = null;
  let marginOfSafetyPercent: number | null = null;
  if (
    inputs.currentMonthlyVolume !== undefined &&
    inputs.currentMonthlyVolume > 0
  ) {
    marginOfSafety = inputs.currentMonthlyVolume - breakEvenUnits;
    marginOfSafetyPercent =
      (marginOfSafety / inputs.currentMonthlyVolume) * 100;
  }

  // Target profit
  let targetProfitUnits: number | null = null;
  let targetProfitRevenue: number | null = null;
  if (
    inputs.targetProfitMargin !== undefined &&
    inputs.targetProfitMargin > 0
  ) {
    // target profit $ = target margin % × revenue
    // revenue = units × price
    // profit = units × CM - FC
    // target: profit = margin% × revenue → units × CM - FC = margin% × units × price
    // units × (CM - margin% × price) = FC
    const adjustedCM =
      contributionMarginPerUnit -
      (inputs.targetProfitMargin / 100) * sellingPricePerUnit;
    if (adjustedCM > 0) {
      targetProfitUnits = Math.ceil(fixedCostsMonthly / adjustedCM);
      targetProfitRevenue = targetProfitUnits * sellingPricePerUnit;
    }
  }

  return {
    breakEvenUnits,
    breakEvenRevenue,
    contributionMarginPerUnit,
    contributionMarginRatio,
    marginOfSafety,
    marginOfSafetyPercent,
    targetProfitUnits,
    targetProfitRevenue,
  };
}

export function generateBreakEvenChartData(
  inputs: BreakEvenInputs,
  maxUnits: number
): BreakEvenChartPoint[] {
  const points: BreakEvenChartPoint[] = [];
  const steps = 20;
  const step = Math.max(1, Math.ceil(maxUnits / steps));

  for (let units = 0; units <= maxUnits; units += step) {
    const revenue = units * inputs.sellingPricePerUnit;
    const totalCost =
      inputs.fixedCostsMonthly + units * inputs.variableCostPerUnit;
    points.push({
      units,
      revenue,
      totalCost,
      profit: revenue - totalCost,
    });
  }

  return points;
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add lib/calculations/break-even.ts
git commit -m "feat: add break-even analysis calculation functions"
```

---

### Task 3: Create startup costs calculation functions

**Files:**
- Create: `lib/calculations/startup-costs.ts`

**Step 1: Create the calculation file**

This reuses compliance checklist data for registration costs.

```typescript
import {
  type BusinessType,
  getFilteredChecklist,
} from "./compliance-checklist";

export interface CostLineItem {
  id: string;
  name: string;
  amount: number;
  isRecurring: boolean;
}

export interface CostCategory {
  id: string;
  label: string;
  items: CostLineItem[];
  isReadOnly?: boolean; // true for registration category
}

export interface StartupCostInputs {
  businessType: BusinessType;
  categories: CostCategory[];
  bufferMonths: number; // 3-6
  contingencyPercent: number; // default 20
}

export interface StartupCostResult {
  totalOneTime: number;
  totalMonthlyRecurring: number;
  registrationCostMin: number;
  registrationCostMax: number;
  recommendedCapital: number;
  bufferAmount: number;
  contingencyAmount: number;
  byCategory: { category: string; oneTime: number; recurring: number }[];
}

export interface PhBenchmark {
  category: string;
  min: number;
  max: number;
}

export const PH_STARTUP_BENCHMARKS: Record<BusinessType, PhBenchmark[]> = {
  "sole-proprietorship": [
    { category: "Registration & Legal", min: 1000, max: 10000 },
    { category: "Office & Equipment", min: 10000, max: 100000 },
    { category: "Technology", min: 5000, max: 30000 },
    { category: "Marketing", min: 10000, max: 50000 },
    { category: "Team", min: 0, max: 50000 },
    { category: "Working Capital", min: 30000, max: 200000 },
  ],
  partnership: [
    { category: "Registration & Legal", min: 5000, max: 25000 },
    { category: "Office & Equipment", min: 20000, max: 200000 },
    { category: "Technology", min: 5000, max: 50000 },
    { category: "Marketing", min: 15000, max: 100000 },
    { category: "Team", min: 30000, max: 150000 },
    { category: "Working Capital", min: 50000, max: 500000 },
  ],
  corporation: [
    { category: "Registration & Legal", min: 10000, max: 80000 },
    { category: "Office & Equipment", min: 30000, max: 500000 },
    { category: "Technology", min: 10000, max: 100000 },
    { category: "Marketing", min: 20000, max: 200000 },
    { category: "Team", min: 50000, max: 300000 },
    { category: "Working Capital", min: 100000, max: 1000000 },
  ],
};

export function calculateRegistrationCosts(businessType: BusinessType): {
  costMin: number;
  costMax: number;
  items: { name: string; costMin: number; costMax: number }[];
} {
  const checklist = getFilteredChecklist(businessType);
  const registrationItems = checklist.filter(
    (item) =>
      item.phase === "registration" || item.phase === "post-registration"
  );

  const items = registrationItems.map((item) => ({
    name: item.title,
    costMin: item.costMin,
    costMax: item.costMax,
  }));

  return {
    costMin: items.reduce((sum, i) => sum + i.costMin, 0),
    costMax: items.reduce((sum, i) => sum + i.costMax, 0),
    items,
  };
}

export function calculateTotalStartupCosts(
  inputs: StartupCostInputs
): StartupCostResult {
  const { categories, bufferMonths, contingencyPercent } = inputs;

  let totalOneTime = 0;
  let totalMonthlyRecurring = 0;
  const byCategory: StartupCostResult["byCategory"] = [];

  const reg = calculateRegistrationCosts(inputs.businessType);

  for (const cat of categories) {
    let catOneTime = 0;
    let catRecurring = 0;

    if (cat.id === "registration") {
      // Use average of min/max from compliance data
      catOneTime = Math.round((reg.costMin + reg.costMax) / 2);
    } else {
      for (const item of cat.items) {
        if (item.isRecurring) {
          catRecurring += item.amount;
        } else {
          catOneTime += item.amount;
        }
      }
    }

    totalOneTime += catOneTime;
    totalMonthlyRecurring += catRecurring;
    byCategory.push({
      category: cat.label,
      oneTime: catOneTime,
      recurring: catRecurring,
    });
  }

  const bufferAmount = totalMonthlyRecurring * bufferMonths;
  const subtotal = totalOneTime + bufferAmount;
  const contingencyAmount = Math.round(subtotal * (contingencyPercent / 100));
  const recommendedCapital = subtotal + contingencyAmount;

  return {
    totalOneTime,
    totalMonthlyRecurring,
    registrationCostMin: reg.costMin,
    registrationCostMax: reg.costMax,
    recommendedCapital,
    bufferAmount,
    contingencyAmount,
    byCategory,
  };
}

export function getDefaultCategories(): CostCategory[] {
  return [
    {
      id: "registration",
      label: "Registration & Legal",
      items: [],
      isReadOnly: true,
    },
    {
      id: "office",
      label: "Office & Equipment",
      items: [
        { id: "rent", name: "Office/Co-working rent", amount: 15000, isRecurring: true },
        { id: "equipment", name: "Computers & equipment", amount: 50000, isRecurring: false },
        { id: "internet", name: "Internet & utilities", amount: 3000, isRecurring: true },
      ],
    },
    {
      id: "technology",
      label: "Technology",
      items: [
        { id: "domain", name: "Domain & hosting", amount: 5000, isRecurring: false },
        { id: "software", name: "Software subscriptions", amount: 5000, isRecurring: true },
      ],
    },
    {
      id: "marketing",
      label: "Marketing",
      items: [
        { id: "branding", name: "Branding & logo", amount: 15000, isRecurring: false },
        { id: "website", name: "Website development", amount: 30000, isRecurring: false },
        { id: "campaigns", name: "Initial ad campaigns", amount: 10000, isRecurring: true },
      ],
    },
    {
      id: "team",
      label: "Team",
      items: [
        { id: "founder-salary", name: "Founder salary", amount: 30000, isRecurring: true },
      ],
    },
  ];
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add lib/calculations/startup-costs.ts
git commit -m "feat: add startup cost estimator calculations with compliance data reuse"
```

---

### Task 4: Update platform integration files (constants, prompts, relationships)

**Files:**
- Modify: `lib/constants.ts` — add 3 tools to TOOLS, update TOOL_GROUPS
- Modify: `lib/ai/prompts.ts` — add 3 tool IDs and AI prompt configs
- Modify: `lib/tool-relationships.ts` — add 3 new entries + 4 back-links

**Step 1: Update lib/constants.ts**

Add 3 new tools to the TOOLS array (after the existing `pre-post-money` entry, before `burn-rate` for safe-calculator; etc.):

```typescript
// Add after pre-post-money in TOOLS array:
{
  id: "safe-calculator",
  name: "SAFE Calculator",
  description: "Model how SAFEs and convertible notes convert to equity at a priced round",
  href: "/tools/safe-calculator",
  icon: "FileText",
},

// Add before pricing-calculator in TOOLS array:
{
  id: "break-even",
  name: "Break-Even Analysis",
  description: "Calculate your break-even point with interactive what-if scenarios",
  href: "/tools/break-even",
  icon: "Scale",
},

// Add before burn-rate in TOOLS array:
{
  id: "startup-costs",
  name: "Startup Cost Estimator",
  description: "Estimate total startup capital with PH-specific registration costs",
  href: "/tools/startup-costs",
  icon: "Landmark",
},
```

Update TOOL_GROUPS:

```typescript
export const TOOL_GROUPS = [
  {
    label: "Start Here",
    tools: ["self-assessment", "fundraising-guide"],
  },
  {
    label: "Valuation & Fundraising",
    tools: ["valuation-calculator", "equity-simulator", "pre-post-money", "safe-calculator"],
  },
  {
    label: "Revenue & Growth",
    tools: ["break-even", "pricing-calculator", "market-sizing", "unit-economics"],
  },
  {
    label: "Cash & Operations",
    tools: ["startup-costs", "burn-rate", "cash-flow-forecast", "financial-model-builder", "compliance-checklist"],
  },
] as const;
```

**Step 2: Update lib/ai/prompts.ts**

Add to ToolId union:

```typescript
export type ToolId =
  | "valuation-calculator"
  | "equity-simulator"
  | "pre-post-money"
  | "safe-calculator"
  | "burn-rate"
  | "pricing-calculator"
  | "cash-flow-forecast"
  | "market-sizing"
  | "unit-economics"
  | "financial-model-builder"
  | "compliance-checklist"
  | "self-assessment"
  | "fundraising-guide"
  | "break-even"
  | "startup-costs";
```

Add 3 prompt entries to PROMPTS record:

```typescript
"safe-calculator": `${SHARED_INSTRUCTIONS}

CONTEXT: The user modeled how a SAFE or convertible note converts to equity at a priced round, comparing cap vs. discount scenarios.

Kevin's curriculum notes:
- A SAFE (Simple Agreement for Future Equity) is not debt — it's a promise of future equity. No interest, no maturity date (post-money YC SAFE).
- Valuation cap sets the maximum price at which the SAFE converts. Lower cap = more equity for the investor.
- Discount rate (typically 15-25%) rewards early investors by letting them buy shares cheaper than the priced round price.
- The investor gets the BETTER deal: whichever method (cap or discount) gives them a lower price per share.
- Convertible notes add interest (5-8% typical) and a maturity date. Accrued interest converts to equity alongside the principal.
- Stacking multiple SAFEs is dangerous — founders often don't realize the cumulative dilution until the priced round.
- Post-money SAFEs (YC standard since 2018) are cleaner: the cap IS the post-money valuation, so you know exactly how much you're giving up.
- Philippine context: SAFEs are increasingly common with international VCs. Local angels may still prefer convertible notes or direct equity.

Explain which conversion method gave the investor a better deal, the effective valuation, dilution impact, and what founders should watch for with multiple SAFEs.`,

"break-even": `${SHARED_INSTRUCTIONS}

CONTEXT: The user calculated their break-even point including contribution margin, break-even units/revenue, and optionally margin of safety.

Kevin's curriculum notes:
- Break-even = Fixed Costs / Contribution Margin per Unit. This is the minimum volume to cover all costs.
- Contribution margin = Selling Price - Variable Cost. This is what each unit contributes toward covering fixed costs.
- Contribution margin ratio = CM / Price. Higher ratio means each peso of revenue covers more fixed costs.
- Margin of safety = Current Volume - Break-even Volume. Positive = profitable; negative = still losing money.
- Three levers to improve break-even: (1) raise prices, (2) reduce variable costs, (3) reduce fixed costs. Raising price has the biggest impact because it improves CM and revenue simultaneously.
- For subscription/SaaS businesses: fixed costs are high (engineering, servers) and variable costs are low, so break-even is mostly about reaching enough subscribers.
- Philippine context: labor costs are lower but rent in Metro Manila is significant. Many startups can reduce fixed costs dramatically by going remote-first.
- Kevin's rule: know your break-even BEFORE launching. If break-even requires more customers than your SAM, the business model doesn't work.

Explain what the break-even point means for their business, which lever has the biggest impact, and whether their target volume is realistic.`,

"startup-costs": `${SHARED_INSTRUCTIONS}

CONTEXT: The user estimated their total startup costs across categories: registration & legal (from PH compliance data), office & equipment, technology, marketing, team, and working capital buffer.

Kevin's curriculum notes:
- Most Filipino founders underestimate startup costs by 30-50%. The 20% contingency buffer is a minimum, not a luxury.
- Registration costs vary dramatically by business type: sole proprietorship (₱1K-₱10K), partnership (₱5K-₱25K), corporation (₱10K-₱80K including SEC, barangay, mayor's permit, BIR, SSS/PhilHealth/Pag-IBIG).
- The biggest surprise cost is usually the Mayor's Permit — fees scale with capitalization and location. Makati and BGC are 2-5x more expensive than provincial LGUs.
- Working capital buffer: Kevin recommends 3-6 months of recurring costs. 3 months is bare minimum; 6 months if you're pre-revenue.
- Common overspend areas: fancy office space (go co-working or remote), over-engineered MVP (build lean), premium software tools (free tiers exist).
- Common underspend areas: legal/accounting (pay for a good CPA early), marketing (you need customers), compliance (BIR penalties compound at 25% surcharge + 20% annual interest).
- This total is your "Day 1 capital requirement" — use it to determine how much to raise or save before launching.

Analyze their cost breakdown, flag any categories that seem too high or too low, and recommend whether they should bootstrap or seek external funding.`,
```

**Step 3: Update lib/tool-relationships.ts**

Add 3 new entries and update 4 existing back-links:

```typescript
// New entries:
"safe-calculator": [
  { toolId: "equity-simulator", reason: "Model full dilution across multiple rounds" },
  { toolId: "valuation-calculator", reason: "Determine what valuation cap to negotiate" },
  { toolId: "pre-post-money", reason: "Quick-check the round math" },
],
"break-even": [
  { toolId: "pricing-calculator", reason: "Test different price points to lower break-even" },
  { toolId: "unit-economics", reason: "See how break-even relates to LTV:CAC" },
  { toolId: "cash-flow-forecast", reason: "Project when you'll actually reach break-even" },
],
"startup-costs": [
  { toolId: "compliance-checklist", reason: "Track your registration progress step by step" },
  { toolId: "burn-rate", reason: "Use this estimate as your starting burn rate" },
  { toolId: "financial-model-builder", reason: "Build these costs into a 3-year model" },
],

// Update existing — replace one of the 3 related tools with the new back-link:
// equity-simulator: replace pre-post-money with safe-calculator
"equity-simulator": [
  { toolId: "valuation-calculator", reason: "Determine the pre-money valuation for each round" },
  { toolId: "safe-calculator", reason: "Model how a SAFE converts in this round" },
  { toolId: "fundraising-guide", reason: "See what stage you should be fundraising at" },
],
// pricing-calculator: replace cash-flow-forecast with break-even
"pricing-calculator": [
  { toolId: "unit-economics", reason: "See how your pricing affects LTV:CAC ratio" },
  { toolId: "break-even", reason: "See how many units you need to sell at this price" },
  { toolId: "market-sizing", reason: "Estimate total revenue at this price point" },
],
// burn-rate: replace fundraising-guide with startup-costs
"burn-rate": [
  { toolId: "cash-flow-forecast", reason: "Expand into a full 12-month cash projection" },
  { toolId: "financial-model-builder", reason: "Build a complete 3-year financial model" },
  { toolId: "startup-costs", reason: "Estimate your initial costs before tracking burn" },
],
// compliance-checklist: replace fundraising-guide with startup-costs
"compliance-checklist": [
  { toolId: "startup-costs", reason: "See total startup costs including registration fees" },
  { toolId: "financial-model-builder", reason: "Build the financial statements regulators require" },
  { toolId: "burn-rate", reason: "Budget for compliance costs in your burn rate" },
],
```

**Step 4: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 5: Commit**

```bash
git add lib/constants.ts lib/ai/prompts.ts lib/tool-relationships.ts
git commit -m "feat: integrate 3 new tools into platform (constants, prompts, relationships)"
```

---

### Task 5: Create SAFE calculator page and layout

**Files:**
- Create: `app/tools/safe-calculator/layout.tsx`
- Create: `app/tools/safe-calculator/page.tsx`

**Step 1: Create layout.tsx**

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SAFE & Convertible Note Calculator",
  description:
    "Model how SAFEs and convertible notes convert to equity. Compare valuation cap vs. discount scenarios with visual cap table breakdown.",
  openGraph: {
    title: "SAFE & Convertible Note Calculator | Startup Finance Toolkit",
    description:
      "Calculate SAFE and convertible note conversion to equity with cap vs. discount comparison.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
```

**Step 2: Create page.tsx**

```typescript
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { EcosystemBanner } from "@/components/shared/ecosystem-banner";
import { formatPHP, formatPercent } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import {
  calculateSafeConversion,
  calculateNoteConversion,
} from "@/lib/calculations/safe-calculator";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";

type InstrumentType = "safe" | "convertible-note";

export default function SafeCalculatorPage() {
  const [instrumentType, setInstrumentType] =
    useState<InstrumentType>("safe");
  const [investmentAmount, setInvestmentAmount] = useState(1000000);
  const [valuationCap, setValuationCap] = useState(20000000);
  const [discountRate, setDiscountRate] = useState(20);
  const [interestRate, setInterestRate] = useState(5);
  const [termMonths, setTermMonths] = useState(18);
  const [preMoneyValuation, setPreMoneyValuation] = useState(40000000);
  const [roundSize, setRoundSize] = useState(10000000);

  const ai = useAiExplain("safe-calculator");

  const result =
    instrumentType === "safe"
      ? calculateSafeConversion(
          { investmentAmount, valuationCap, discountRate },
          { preMoneyValuation, roundSize }
        )
      : calculateNoteConversion(
          {
            investmentAmount,
            valuationCap,
            discountRate,
            interestRate,
            termMonths,
          },
          { preMoneyValuation, roundSize }
        );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          SAFE & Convertible Note Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Model how SAFEs and convertible notes convert to equity at a priced
          round.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Instrument Details
            <InfoTooltip content="A SAFE (Simple Agreement for Future Equity) converts to equity at a future priced round. The investor gets the better deal between the valuation cap and discount rate." />
          </CardTitle>
          <CardDescription>
            Choose your instrument type and enter the terms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Instrument Type</Label>
            <Select
              value={instrumentType}
              onValueChange={(v) =>
                setInstrumentType(v as InstrumentType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="safe">
                  SAFE (Post-Money, YC Standard)
                </SelectItem>
                <SelectItem value="convertible-note">
                  Convertible Note
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CurrencyInput
              label="Investment Amount"
              value={investmentAmount}
              onChange={setInvestmentAmount}
            />
            <CurrencyInput
              label="Valuation Cap"
              value={valuationCap}
              onChange={setValuationCap}
            />
            <PercentageInput
              label="Discount Rate"
              value={discountRate}
              onChange={setDiscountRate}
            />
          </div>

          {instrumentType === "convertible-note" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PercentageInput
                label="Annual Interest Rate"
                value={interestRate}
                onChange={setInterestRate}
              />
              <div className="space-y-2">
                <Label>Term (months)</Label>
                <CurrencyInput
                  label="Term (months)"
                  value={termMonths}
                  onChange={setTermMonths}
                  hideLabel
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Priced Round (Conversion Trigger)
            <InfoTooltip content="Enter the terms of the future priced round that triggers SAFE/note conversion." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Pre-Money Valuation"
              value={preMoneyValuation}
              onChange={setPreMoneyValuation}
            />
            <CurrencyInput
              label="Round Size"
              value={roundSize}
              onChange={setRoundSize}
            />
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="Conversion Method"
              value={result.conversionMethod === "cap" ? "Cap" : "Discount"}
            />
            <ResultCard
              label="Effective Price/Share"
              value={formatPHP(result.effectivePrice)}
            />
            <ResultCard
              label="Shares Issued"
              value={Math.round(result.sharesIssued).toLocaleString()}
            />
            <ResultCard
              label="SAFE Holder Ownership"
              value={formatPercent(result.ownershipPercent)}
              variant="success"
            />
          </div>

          {result.scenarios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Scenario Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-medium">
                          Scenario
                        </th>
                        <th className="text-right py-2 px-4 font-medium">
                          Price/Share
                        </th>
                        <th className="text-right py-2 px-4 font-medium">
                          Shares
                        </th>
                        <th className="text-right py-2 pl-4 font-medium">
                          Ownership
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.scenarios.map((s) => (
                        <tr
                          key={s.label}
                          className="border-b border-border/50"
                        >
                          <td className="py-2 pr-4">{s.label}</td>
                          <td className="text-right py-2 px-4">
                            {formatPHP(s.effectivePricePerShare)}
                          </td>
                          <td className="text-right py-2 px-4">
                            {Math.round(s.sharesIssued).toLocaleString()}
                          </td>
                          <td className="text-right py-2 pl-4">
                            {formatPercent(s.ownershipPercent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Post-Conversion Cap Table
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={result.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={(props) => {
                      const {
                        value,
                        cx,
                        cy,
                        midAngle,
                        outerRadius: or,
                      } = props as {
                        value: number;
                        cx: number;
                        cy: number;
                        midAngle: number;
                        outerRadius: number;
                      };
                      const RADIAN = Math.PI / 180;
                      const radius = or + 20;
                      const x =
                        cx + radius * Math.cos(-midAngle * RADIAN);
                      const y =
                        cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#e5e7eb"
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                          fontSize={13}
                          fontWeight={600}
                        >
                          {`${value.toFixed(1)}%`}
                        </text>
                      );
                    }}
                  >
                    {result.pieData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                    formatter={(value) =>
                      `${Number(value).toFixed(2)}%`
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {result && (
        <AiInsightsPanel
          explanation={ai.explanation}
          isLoading={ai.isLoading}
          error={ai.error}
          onExplain={() =>
            ai.explain({
              instrumentType,
              investmentAmount,
              valuationCap,
              discountRate,
              ...(instrumentType === "convertible-note"
                ? { interestRate, termMonths }
                : {}),
              preMoneyValuation,
              roundSize,
              conversionMethod: result.conversionMethod,
              effectivePrice: result.effectivePrice,
              ownershipPercent: result.ownershipPercent,
              capPrice: result.capPrice,
              discountPrice: result.discountPrice,
            })
          }
          onDismiss={ai.reset}
        />
      )}

      <EcosystemBanner toolId="safe-calculator" />

      <RelatedTools currentToolId="safe-calculator" />
    </div>
  );
}
```

**Step 3: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add app/tools/safe-calculator/
git commit -m "feat: add SAFE & Convertible Note Calculator page"
```

---

### Task 6: Create break-even page and layout

**Files:**
- Create: `app/tools/break-even/layout.tsx`
- Create: `app/tools/break-even/page.tsx`

**Step 1: Create layout.tsx**

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Break-Even Analysis Calculator",
  description:
    "Calculate your break-even point in units and revenue. Interactive what-if scenarios with contribution margin analysis.",
  openGraph: {
    title: "Break-Even Analysis Calculator | Startup Finance Toolkit",
    description:
      "Find your break-even point with visual profit/loss chart and what-if sliders.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
```

**Step 2: Create page.tsx**

```typescript
"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { EcosystemBanner } from "@/components/shared/ecosystem-banner";
import { formatPHP } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import {
  calculateBreakEven,
  generateBreakEvenChartData,
} from "@/lib/calculations/break-even";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";

export default function BreakEvenPage() {
  const [fixedCosts, setFixedCosts] = useState(150000);
  const [variableCost, setVariableCost] = useState(200);
  const [sellingPrice, setSellingPrice] = useState(500);
  const [currentVolume, setCurrentVolume] = useState(600);
  const [targetMargin, setTargetMargin] = useState(20);

  // What-if adjustments
  const [priceAdj, setPriceAdj] = useState(0);
  const [variableAdj, setVariableAdj] = useState(0);
  const [fixedAdj, setFixedAdj] = useState(0);

  const adjustedInputs = useMemo(
    () => ({
      fixedCostsMonthly: fixedCosts * (1 + fixedAdj / 100),
      variableCostPerUnit: variableCost * (1 + variableAdj / 100),
      sellingPricePerUnit: sellingPrice * (1 + priceAdj / 100),
      currentMonthlyVolume: currentVolume,
      targetProfitMargin: targetMargin,
    }),
    [fixedCosts, variableCost, sellingPrice, currentVolume, targetMargin, priceAdj, variableAdj, fixedAdj]
  );

  const ai = useAiExplain("break-even");

  const result = calculateBreakEven(adjustedInputs);

  const chartData = useMemo(() => {
    if (!result) return [];
    const maxUnits = Math.max(result.breakEvenUnits * 2, currentVolume * 1.5);
    return generateBreakEvenChartData(adjustedInputs, Math.ceil(maxUnits));
  }, [adjustedInputs, result, currentVolume]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Break-Even Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Calculate your break-even point and model what-if scenarios to find the
          fastest path to profitability.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Cost & Revenue Inputs
            <InfoTooltip content="Break-even = Fixed Costs / (Selling Price - Variable Cost per Unit). This is the minimum volume to cover all costs." />
          </CardTitle>
          <CardDescription>
            Enter your monthly fixed costs and per-unit economics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CurrencyInput
              label="Monthly Fixed Costs"
              value={fixedCosts}
              onChange={setFixedCosts}
            />
            <CurrencyInput
              label="Variable Cost per Unit"
              value={variableCost}
              onChange={setVariableCost}
            />
            <CurrencyInput
              label="Selling Price per Unit"
              value={sellingPrice}
              onChange={setSellingPrice}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Current Monthly Volume (optional)"
              value={currentVolume}
              onChange={setCurrentVolume}
            />
            <PercentageInput
              label="Target Profit Margin (optional)"
              value={targetMargin}
              onChange={setTargetMargin}
            />
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="Break-Even Units"
              value={result.breakEvenUnits.toLocaleString()}
              variant="success"
            />
            <ResultCard
              label="Break-Even Revenue"
              value={formatPHP(result.breakEvenRevenue)}
            />
            <ResultCard
              label="Contribution Margin"
              value={formatPHP(result.contributionMarginPerUnit)}
            />
            <ResultCard
              label="CM Ratio"
              value={`${(result.contributionMarginRatio * 100).toFixed(1)}%`}
            />
          </div>

          {result.marginOfSafety !== null && (
            <div className="grid grid-cols-2 gap-4">
              <ResultCard
                label="Margin of Safety (units)"
                value={result.marginOfSafety.toLocaleString()}
                variant={result.marginOfSafety > 0 ? "success" : "destructive"}
              />
              <ResultCard
                label="Margin of Safety %"
                value={`${result.marginOfSafetyPercent!.toFixed(1)}%`}
                variant={result.marginOfSafetyPercent! > 0 ? "success" : "destructive"}
              />
            </div>
          )}

          {result.targetProfitUnits !== null && (
            <div className="grid grid-cols-2 gap-4">
              <ResultCard
                label={`Units for ${targetMargin}% Profit`}
                value={result.targetProfitUnits.toLocaleString()}
              />
              <ResultCard
                label={`Revenue for ${targetMargin}% Profit`}
                value={formatPHP(result.targetProfitRevenue!)}
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Revenue vs. Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="units"
                    label={{ value: "Units Sold", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => formatPHP(Number(value))}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                    formatter={(value) => formatPHP(Number(value))}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_COLORS[0]}
                    name="Revenue"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalCost"
                    stroke={CHART_COLORS[4]}
                    name="Total Cost"
                    strokeWidth={2}
                    dot={false}
                  />
                  <ReferenceLine
                    x={result.breakEvenUnits}
                    stroke={CHART_COLORS[1]}
                    strokeDasharray="5 5"
                    label={{ value: "Break-Even", fill: CHART_COLORS[1], fontSize: 12 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What-If Scenarios</CardTitle>
              <CardDescription>
                Adjust sliders to see how changes affect your break-even point.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <Label>Price adjustment</Label>
                  <span className="text-muted-foreground">
                    {priceAdj > 0 ? "+" : ""}{priceAdj}%
                  </span>
                </div>
                <Slider
                  value={[priceAdj]}
                  onValueChange={([v]) => setPriceAdj(v)}
                  min={-50}
                  max={50}
                  step={5}
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <Label>Variable cost adjustment</Label>
                  <span className="text-muted-foreground">
                    {variableAdj > 0 ? "+" : ""}{variableAdj}%
                  </span>
                </div>
                <Slider
                  value={[variableAdj]}
                  onValueChange={([v]) => setVariableAdj(v)}
                  min={-50}
                  max={50}
                  step={5}
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <Label>Fixed cost adjustment</Label>
                  <span className="text-muted-foreground">
                    {fixedAdj > 0 ? "+" : ""}{fixedAdj}%
                  </span>
                </div>
                <Slider
                  value={[fixedAdj]}
                  onValueChange={([v]) => setFixedAdj(v)}
                  min={-50}
                  max={50}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!result && sellingPrice > 0 && variableCost >= sellingPrice && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              Your variable cost per unit ({formatPHP(variableCost)}) is equal to
              or greater than your selling price ({formatPHP(sellingPrice)}). You
              cannot break even — every unit sold loses money. Increase your price
              or reduce variable costs.
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <AiInsightsPanel
          explanation={ai.explanation}
          isLoading={ai.isLoading}
          error={ai.error}
          onExplain={() =>
            ai.explain({
              fixedCostsMonthly: adjustedInputs.fixedCostsMonthly,
              variableCostPerUnit: adjustedInputs.variableCostPerUnit,
              sellingPricePerUnit: adjustedInputs.sellingPricePerUnit,
              breakEvenUnits: result.breakEvenUnits,
              breakEvenRevenue: result.breakEvenRevenue,
              contributionMarginPerUnit: result.contributionMarginPerUnit,
              contributionMarginRatio: result.contributionMarginRatio,
              marginOfSafety: result.marginOfSafety,
              marginOfSafetyPercent: result.marginOfSafetyPercent,
              currentVolume,
            })
          }
          onDismiss={ai.reset}
        />
      )}

      <EcosystemBanner toolId="break-even" />

      <RelatedTools currentToolId="break-even" />
    </div>
  );
}
```

**Step 3: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add app/tools/break-even/
git commit -m "feat: add Break-Even Analysis Calculator page"
```

---

### Task 7: Create startup cost estimator page and layout

**Files:**
- Create: `app/tools/startup-costs/layout.tsx`
- Create: `app/tools/startup-costs/page.tsx`

**Step 1: Create layout.tsx**

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Startup Cost Estimator",
  description:
    "Estimate your total startup capital with PH-specific registration costs. Covers legal, office, tech, marketing, and team expenses.",
  openGraph: {
    title: "Startup Cost Estimator | Startup Finance Toolkit",
    description:
      "Calculate total startup costs for Philippine businesses with built-in registration fee estimates.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
```

**Step 2: Create page.tsx**

```typescript
"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { EcosystemBanner } from "@/components/shared/ecosystem-banner";
import { formatPHP } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import {
  type BusinessType,
} from "@/lib/calculations/compliance-checklist";
import {
  type CostCategory,
  type CostLineItem,
  calculateRegistrationCosts,
  calculateTotalStartupCosts,
  getDefaultCategories,
  PH_STARTUP_BENCHMARKS,
} from "@/lib/calculations/startup-costs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import { Plus, Trash2, ExternalLink, Store, Users, Building2 } from "lucide-react";
import Link from "next/link";

const BUSINESS_TYPES: {
  value: BusinessType;
  label: string;
  icon: typeof Store;
}[] = [
  { value: "sole-proprietorship", label: "Sole Proprietorship", icon: Store },
  { value: "partnership", label: "Partnership", icon: Users },
  { value: "corporation", label: "Corporation", icon: Building2 },
];

export default function StartupCostsPage() {
  const [businessType, setBusinessType] =
    useState<BusinessType>("corporation");
  const [categories, setCategories] = useState<CostCategory[]>(
    getDefaultCategories
  );
  const [bufferMonths, setBufferMonths] = useState(3);

  const ai = useAiExplain("startup-costs");

  const regCosts = useMemo(
    () => calculateRegistrationCosts(businessType),
    [businessType]
  );

  const result = useMemo(
    () =>
      calculateTotalStartupCosts({
        businessType,
        categories,
        bufferMonths,
        contingencyPercent: 20,
      }),
    [businessType, categories, bufferMonths]
  );

  const updateItem = useCallback(
    (catId: string, itemId: string, field: keyof CostLineItem, value: unknown) => {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === catId
            ? {
                ...cat,
                items: cat.items.map((item) =>
                  item.id === itemId ? { ...item, [field]: value } : item
                ),
              }
            : cat
        )
      );
    },
    []
  );

  const addItem = useCallback((catId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? {
              ...cat,
              items: [
                ...cat.items,
                {
                  id: `${catId}-${Date.now()}`,
                  name: "",
                  amount: 0,
                  isRecurring: false,
                },
              ],
            }
          : cat
      )
    );
  }, []);

  const removeItem = useCallback((catId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) }
          : cat
      )
    );
  }, []);

  const chartData = result.byCategory.map((c) => ({
    category: c.category.replace(" & ", "\n& "),
    "One-Time": c.oneTime,
    Recurring: c.recurring * bufferMonths,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Startup Cost Estimator</h1>
        <p className="text-muted-foreground mt-1">
          Estimate your total startup capital with PH-specific registration
          costs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Business Type
            <InfoTooltip content="Your business type determines registration requirements and costs. These are pulled directly from the PH Compliance Checklist." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {BUSINESS_TYPES.map((bt) => {
              const Icon = bt.icon;
              const isSelected = businessType === bt.value;
              return (
                <button
                  key={bt.value}
                  onClick={() => setBusinessType(bt.value)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/50"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 mb-2 ${
                      isSelected
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                  <p className="text-sm font-medium">{bt.label}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Registration & Legal — read-only from compliance checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration & Legal</CardTitle>
          <CardDescription>
            Costs pulled from{" "}
            <Link
              href="/tools/compliance-checklist"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              PH Compliance Checklist <ExternalLink className="h-3 w-3" />
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {regCosts.items.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between py-1.5 text-sm border-b border-border/30 last:border-0"
              >
                <span className="text-muted-foreground">{item.name}</span>
                <span>
                  {item.costMin === item.costMax
                    ? formatPHP(item.costMin)
                    : `${formatPHP(item.costMin)} – ${formatPHP(item.costMax)}`}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex justify-between text-sm font-medium">
            <span>Estimated Registration Total</span>
            <span>
              {formatPHP(regCosts.costMin)} – {formatPHP(regCosts.costMax)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Editable categories */}
      {categories
        .filter((cat) => cat.id !== "registration")
        .map((cat) => (
          <Card key={cat.id}>
            <CardHeader>
              <CardTitle className="text-base">{cat.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3"
                >
                  <Input
                    value={item.name}
                    onChange={(e) =>
                      updateItem(cat.id, item.id, "name", e.target.value)
                    }
                    placeholder="Item name"
                    className="flex-1"
                  />
                  <CurrencyInput
                    label=""
                    value={item.amount}
                    onChange={(v) =>
                      updateItem(cat.id, item.id, "amount", v)
                    }
                    hideLabel
                  />
                  <button
                    onClick={() =>
                      updateItem(
                        cat.id,
                        item.id,
                        "isRecurring",
                        !item.isRecurring
                      )
                    }
                    className="shrink-0"
                  >
                    <Badge
                      variant={item.isRecurring ? "default" : "secondary"}
                    >
                      {item.isRecurring ? "Monthly" : "One-time"}
                    </Badge>
                  </button>
                  <button
                    onClick={() => removeItem(cat.id, item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addItem(cat.id)}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add item
              </Button>
            </CardContent>
          </Card>
        ))}

      {/* Buffer months slider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Working Capital Buffer
            <InfoTooltip content="How many months of recurring costs to include as working capital. 3 months is bare minimum; 6 months recommended if pre-revenue." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <Label>Buffer months</Label>
            <span className="font-medium">{bufferMonths} months</span>
          </div>
          <Slider
            value={[bufferMonths]}
            onValueChange={([v]) => setBufferMonths(v)}
            min={3}
            max={6}
            step={1}
          />
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultCard
          label="Total One-Time Costs"
          value={formatPHP(result.totalOneTime)}
        />
        <ResultCard
          label="Monthly Recurring"
          value={formatPHP(result.totalMonthlyRecurring)}
        />
        <ResultCard
          label={`Buffer (${bufferMonths} months)`}
          value={formatPHP(result.bufferAmount)}
        />
        <ResultCard
          label="Recommended Capital"
          value={formatPHP(result.recommendedCapital)}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ResultCard
          label="20% Contingency"
          value={formatPHP(result.contingencyAmount)}
        />
        <ResultCard
          label="Registration Range"
          value={`${formatPHP(result.registrationCostMin)} – ${formatPHP(result.registrationCostMax)}`}
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => formatPHP(Number(value))}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={120}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                }}
                formatter={(value) => formatPHP(Number(value))}
              />
              <Legend />
              <Bar
                dataKey="One-Time"
                fill={CHART_COLORS[0]}
                stackId="costs"
              />
              <Bar
                dataKey="Recurring"
                fill={CHART_COLORS[1]}
                stackId="costs"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
            businessType,
            totalOneTime: result.totalOneTime,
            totalMonthlyRecurring: result.totalMonthlyRecurring,
            recommendedCapital: result.recommendedCapital,
            contingencyAmount: result.contingencyAmount,
            bufferMonths,
            registrationCostMin: result.registrationCostMin,
            registrationCostMax: result.registrationCostMax,
            byCategory: result.byCategory,
          })
        }
        onDismiss={ai.reset}
      />

      <EcosystemBanner toolId="startup-costs" />

      <RelatedTools currentToolId="startup-costs" />
    </div>
  );
}
```

**Step 3: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add app/tools/startup-costs/
git commit -m "feat: add Startup Cost Estimator page with compliance data integration"
```

---

### Task 8: Full build verification

**Step 1: TypeScript check**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 2: Next.js production build**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm next build 2>&1 | tail -25`
Expected: All routes compile, including new `/tools/safe-calculator`, `/tools/break-even`, `/tools/startup-costs`

**Step 3: Visual verification**

Run dev server: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm dev`

Check:
1. Sidebar shows 15 tools in correct groups (4 groups)
2. `/tools/safe-calculator` — SAFE form, pie chart, scenario table, AI insights, related tools
3. `/tools/break-even` — inputs, result cards, line chart, what-if sliders, AI insights
4. `/tools/startup-costs` — business type picker, registration costs from checklist, editable categories, bar chart, recommended capital
5. Related tools on existing pages updated (equity-simulator links to safe-calculator, pricing-calculator links to break-even, burn-rate links to startup-costs, compliance-checklist links to startup-costs)

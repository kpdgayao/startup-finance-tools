# Self-Assessment Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the finance self-assessment quiz from 18 to 25 questions, add a 6th "Revenue & Pricing" category, and ensure all 15 tools are covered in recommendations.

**Architecture:** Pure data addition in `lib/calculations/self-assessment.ts` (new type value, questions, tool mappings) plus minor UI text updates in the page component. No new files needed.

**Tech Stack:** TypeScript, Next.js (existing page component), Recharts radar chart (auto-adapts to 6 data points)

**Design doc:** `docs/plans/2026-02-24-self-assessment-expansion-design.md`

---

### Task 1: Add `revenue-pricing` to QuizCategory type and labels

**Files:**
- Modify: `lib/calculations/self-assessment.ts:1-6` (QuizCategory type)
- Modify: `lib/calculations/self-assessment.ts:35-41` (CATEGORY_LABELS)

**Step 1: Add the new category to the union type**

In `lib/calculations/self-assessment.ts`, change:

```typescript
export type QuizCategory =
  | "financial-statements"
  | "valuation"
  | "cash-management"
  | "fundraising"
  | "compliance";
```

To:

```typescript
export type QuizCategory =
  | "financial-statements"
  | "valuation"
  | "cash-management"
  | "fundraising"
  | "compliance"
  | "revenue-pricing";
```

**Step 2: Add the label**

In `CATEGORY_LABELS`, add:

```typescript
"revenue-pricing": "Revenue & Pricing",
```

**Step 3: Add `revenue-pricing` to the categories array in `calculateQuizResult`**

In the `categories` array inside `calculateQuizResult` (~line 237), add `"revenue-pricing"` to the end of the array.

**Step 4: Verify the app compiles**

Run: `cd /c/Users/ASUS\ TUF/Projects/startup-finance-tools/app && pnpm build 2>&1 | tail -5`
Expected: Build succeeds (no questions reference the category yet, but the type and labels are ready)

**Step 5: Commit**

```bash
git add lib/calculations/self-assessment.ts
git commit -m "feat(self-assessment): add revenue-pricing category type and label"
```

---

### Task 2: Add 7 new quiz questions

**Files:**
- Modify: `lib/calculations/self-assessment.ts:65-234` (QUIZ_QUESTIONS array)

**Step 1: Add 4 Revenue & Pricing questions to the end of QUIZ_QUESTIONS**

Append before the closing `];`:

```typescript
// Revenue & Pricing (4 questions)
{
  id: "rp-1",
  category: "revenue-pricing",
  question: "Your startup has ₱200K/month in fixed costs and a 40% contribution margin. What is your monthly break-even revenue?",
  options: ["₱200K", "₱500K", "₱800K", "₱2M"],
  correctIndex: 1,
  explanation: "Break-even Revenue = Fixed Costs / Contribution Margin = ₱200K / 0.40 = ₱500K. Below this revenue, you lose money each month; above it, you're profitable.",
},
{
  id: "rp-2",
  category: "revenue-pricing",
  question: "Which pricing strategy sets price based on perceived customer value rather than cost?",
  options: ["Cost-plus pricing", "Value-based pricing", "Penetration pricing", "Freemium"],
  correctIndex: 1,
  explanation: "Value-based pricing captures willingness to pay. Cost-plus adds a markup to costs. Penetration underprices to gain share. Freemium gives a free tier — it's a distribution model, not a pricing method.",
},
{
  id: "rp-3",
  category: "revenue-pricing",
  question: "Your product serves Filipino SMEs. There are 1M SMEs in the Philippines, 200K use software like yours, and you can realistically reach 5K in year one. What is your SOM?",
  options: ["1M SMEs (TAM)", "200K SMEs (SAM)", "5K SMEs (SOM)", "None of these"],
  correctIndex: 2,
  explanation: "SOM (Serviceable Obtainable Market) is the realistic share you can capture short-term. TAM = total market (1M), SAM = addressable segment (200K), SOM = what you can actually win (5K).",
},
{
  id: "rp-4",
  category: "revenue-pricing",
  question: "A product sells for ₱1,000 with ₱600 in variable costs. What is the contribution margin?",
  options: ["60%", "40%", "₱400", "Both 40% and ₱400"],
  correctIndex: 3,
  explanation: "Contribution margin = (Price - Variable Cost) / Price = ₱400 / ₱1,000 = 40%. It can be expressed as a percentage (40%) or absolute value (₱400 per unit). Both are correct.",
},
```

**Step 2: Add 2 SAFE questions to the fundraising section**

Insert after the existing `fr-4` question (after the LTV:CAC question, before the compliance section):

```typescript
{
  id: "fr-5",
  category: "fundraising",
  question: "What happens to a SAFE (Simple Agreement for Future Equity) when a startup raises a priced round?",
  options: [
    "It expires worthless",
    "It converts to equity at a discount or valuation cap",
    "It gets repaid as debt with interest",
    "Nothing — SAFEs are permanent instruments",
  ],
  correctIndex: 1,
  explanation: "A SAFE converts to equity when a qualifying priced round occurs. The investor gets shares at either a discounted price or a price based on the valuation cap — whichever gives them more shares.",
},
{
  id: "fr-6",
  category: "fundraising",
  question: "A SAFE has a ₱20M valuation cap and a 20% discount. The Series A prices at ₱30M pre-money. Which conversion term gives the SAFE investor a better deal?",
  options: [
    "The valuation cap (₱20M)",
    "The discount (20% off ₱30M = ₱24M)",
    "They're exactly the same",
    "Neither applies at this valuation",
  ],
  correctIndex: 0,
  explanation: "The cap converts at ₱20M effective valuation, the discount at ₱30M × 80% = ₱24M. Lower effective valuation = more shares per peso invested. The SAFE holder gets whichever is better for them.",
},
```

**Step 3: Add 1 startup costs question to the cash-management section**

Insert after the existing `cm-3` question:

```typescript
{
  id: "cm-4",
  category: "cash-management",
  question: "Which of these is typically the LARGEST initial cost when registering a corporation in the Philippines?",
  options: [
    "Barangay clearance",
    "SEC registration fee",
    "BIR registration (Form 0605)",
    "Mayor's/business permit",
  ],
  correctIndex: 3,
  explanation: "Mayor's/business permit fees vary by city but are typically the largest registration cost, often ₱5K-₱30K+ depending on location and capitalization. SEC fees, BIR's ₱500 registration, and barangay clearance are all relatively small by comparison.",
},
```

**Step 4: Verify the app compiles**

Run: `cd /c/Users/ASUS\ TUF/Projects/startup-finance-tools/app && pnpm build 2>&1 | tail -5`
Expected: Build succeeds. Quiz now has 25 questions.

**Step 5: Commit**

```bash
git add lib/calculations/self-assessment.ts
git commit -m "feat(self-assessment): add 7 new questions (revenue-pricing, SAFEs, startup costs)"
```

---

### Task 3: Update CATEGORY_TOOL_MAP with missing tools

**Files:**
- Modify: `lib/calculations/self-assessment.ts:43-63` (CATEGORY_TOOL_MAP)

**Step 1: Add the `revenue-pricing` entry and expand existing entries**

Add to `CATEGORY_TOOL_MAP`:

```typescript
"revenue-pricing": [
  { id: "pricing-calculator", name: "Pricing Calculator", reason: "Explore 6 pricing strategies and find the right model for your product" },
  { id: "market-sizing", name: "Market Sizing", reason: "Calculate your TAM, SAM, and SOM with top-down and bottom-up methods" },
  { id: "break-even", name: "Break-Even Analysis", reason: "Find your break-even point and model what-if scenarios" },
],
```

Add `startup-costs` to the `cash-management` array:

```typescript
{ id: "startup-costs", name: "Startup Cost Estimator", reason: "Estimate PH-specific registration and launch costs" },
```

Add `safe-calculator` and `fundraising-guide` to the `fundraising` array:

```typescript
{ id: "safe-calculator", name: "SAFE Calculator", reason: "Model SAFE and convertible note conversions" },
{ id: "fundraising-guide", name: "Fundraising Guide", reason: "Follow the full fundraising lifecycle from R&D to scaling" },
```

**Step 2: Verify the app compiles**

Run: `cd /c/Users/ASUS\ TUF/Projects/startup-finance-tools/app && pnpm build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add lib/calculations/self-assessment.ts
git commit -m "feat(self-assessment): add missing tools to CATEGORY_TOOL_MAP"
```

---

### Task 4: Update the page component for 6 categories

**Files:**
- Modify: `app/tools/self-assessment/page.tsx:109` (category count text)
- Modify: `app/tools/self-assessment/page.tsx:116-121` (intro grid)
- Modify: `app/tools/self-assessment/page.tsx:347-356` (getCategoryLabel)

**Step 1: Update "5 categories" to "6 categories"**

Change line 109:

```typescript
{totalQuestions} questions across 6 categories
```

**Step 2: Add the 6th category card to the intro grid**

Add to the array at line 116-121:

```typescript
{ label: "Revenue & Pricing", desc: "Pricing, break-even, market sizing" },
```

**Step 3: Update `getCategoryLabel` at the bottom of the file**

Add to the labels Record:

```typescript
"revenue-pricing": "Revenue & Pricing",
```

**Step 4: Update the intro grid to use `grid-cols-3` for even layout with 6 items**

Change `grid-cols-1 sm:grid-cols-2` to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` so 6 cards lay out as 3x2 on large screens.

**Step 5: Verify the app compiles and renders**

Run: `cd /c/Users/ASUS\ TUF/Projects/startup-finance-tools/app && pnpm build 2>&1 | tail -5`
Expected: Build succeeds.

Run: `cd /c/Users/ASUS\ TUF/Projects/startup-finance-tools/app && pnpm dev`
Then manually verify:
- Intro shows "25 questions across 6 categories" with 6 category cards
- Quiz flows through all 25 questions
- Results radar chart has 6 spokes
- Weak areas recommend the correct tools

**Step 6: Commit**

```bash
git add app/tools/self-assessment/page.tsx
git commit -m "feat(self-assessment): update UI for 6 categories and 25 questions"
```

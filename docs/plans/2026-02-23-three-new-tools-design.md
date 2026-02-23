# Three New Tools Design: SAFE Calculator, Break-Even, Startup Costs

**Date:** 2026-02-23
**Status:** Approved

## Goal

Add 3 high-demand financial tools for Filipino startup founders: SAFE/Convertible Note Calculator, Break-Even Analysis, and Startup Cost Estimator. Integrate them naturally into the existing sidebar groups and tool relationship graph.

## Tools Overview

| Tool | Route | Sidebar Group | Icon |
|---|---|---|---|
| SAFE/Convertible Note Calculator | `/tools/safe-calculator` | Valuation & Fundraising (after pre-post-money) | `FileText` |
| Break-Even Analysis | `/tools/break-even` | Revenue & Growth (before pricing-calculator) | `Scale` |
| Startup Cost Estimator | `/tools/startup-costs` | Cash & Operations (before burn-rate) | `Landmark` |

---

## 1. SAFE/Convertible Note Calculator

**Purpose:** Model how SAFEs and convertible notes convert to equity at a priced round.

### Inputs
- Instrument type toggle: SAFE (post-money YC style) vs. Convertible Note
- Investment amount (currency input)
- Valuation cap (currency input)
- Discount rate (percentage input, default 20%)
- Convertible note only: interest rate + term in months
- Priced round trigger: pre-money valuation + round size

### Outputs
- Effective price per share (cap vs. discount comparison — lower wins)
- Shares issued to SAFE/note holder
- Ownership percentage post-conversion
- Side-by-side scenario comparison: "With cap" vs. "With discount" vs. "No SAFE"
- Pie chart: post-conversion cap table (founders, SAFE holders, new investors)

### Calculation File
`lib/calculations/safe-calculator.ts` — pure functions:
- `calculateSafeConversion()` — cap price, discount price, effective price, shares, ownership
- `calculateNoteConversion()` — adds accrued interest to principal before conversion
- `buildConversionScenarios()` — returns array of 3 scenarios for comparison

### AI Insights
Explain whether the cap or discount gave a better deal, effective valuation, and risks of stacking multiple SAFEs.

### Related Tools
- equity-simulator: "Model full dilution across rounds"
- valuation-calculator: "Determine what valuation cap to negotiate"
- pre-post-money: "Quick-check the round math"

---

## 2. Break-Even Analysis Calculator

**Purpose:** Calculate when a startup stops losing money, with interactive what-if scenarios.

### Inputs
- Fixed costs per month (currency input)
- Variable cost per unit (currency input)
- Selling price per unit (currency input)
- Optional: current monthly volume, target profit margin

### Outputs
- Break-even units and break-even revenue
- Contribution margin per unit and ratio
- Margin of safety (if current volume provided)
- Line chart: revenue line vs. total cost line, intersection = break-even, shaded profit/loss zones
- What-if sliders: adjust price, variable cost, and fixed costs — break-even updates in real time

### Calculation File
`lib/calculations/break-even.ts` — pure functions:
- `calculateBreakEven()` — units, revenue, contribution margin, margin of safety
- `generateBreakEvenChartData()` — data points for the line chart across a range of units

### AI Insights
Explain what the break-even point means, which lever (price, volume, cost reduction) has the biggest impact, and how this compares to typical startup timelines.

### Related Tools
- pricing-calculator: "Test different price points"
- unit-economics: "See how break-even relates to LTV:CAC"
- cash-flow-forecast: "Project when you'll actually reach break-even"

---

## 3. Startup Cost Estimator

**Purpose:** Estimate total startup capital needed, with PH-specific registration costs pulled from the compliance checklist.

### Key Integration: Compliance Checklist Data Reuse

The "Registration & Legal" category imports directly from `lib/calculations/compliance-checklist.ts`:
- User selects business type (sole prop / partnership / corporation) — same picker as compliance checklist
- Calls `getFilteredChecklist(businessType)` and sums `costMin`/`costMax` for registration + post-registration phase items
- Line items are read-only with a link: "See details in PH Compliance Checklist"
- No duplicated cost data — single source of truth

### Inputs
**Category-based cost entry:**
1. **Registration & Legal** — auto-populated from compliance checklist (read-only, business-type filtered)
2. **Office & Equipment** — rent, furniture, computers, internet (user adds line items)
3. **Technology** — domain, hosting, software subscriptions
4. **Marketing** — branding, website, initial campaigns
5. **Team** — first hires monthly salary, founder salary
6. **Working Capital** — buffer months slider (3-6 months)

Each user-entered item has a one-time vs. recurring toggle.

### Outputs
- Total one-time costs
- Total monthly recurring costs
- Recommended starting capital = one-time + (recurring x buffer months) + 20% contingency
- Horizontal bar chart by category (color-coded one-time vs. recurring)
- Summary card: "Your estimate vs. typical PH startup" (benchmark ranges by business type)

### Calculation File
`lib/calculations/startup-costs.ts` — pure functions:
- `calculateRegistrationCosts(businessType)` — wraps compliance checklist data
- `calculateTotalStartupCosts()` — sums all categories, applies buffer and contingency
- `PH_STARTUP_BENCHMARKS` — typical cost ranges by business type for comparison

### AI Insights
Analyze which categories are the biggest cost drivers, whether the contingency buffer is adequate, and suggest areas where Filipino founders commonly overspend or underspend.

### Related Tools
- compliance-checklist: "Track your registration progress"
- burn-rate: "Use this estimate as your starting burn rate"
- financial-model-builder: "Build these costs into a 3-year model"

---

## Platform Integration

### Sidebar Groups (updated)
```
Start Here: self-assessment, fundraising-guide
Valuation & Fundraising: valuation-calculator, equity-simulator, pre-post-money, safe-calculator
Revenue & Growth: break-even, pricing-calculator, market-sizing, unit-economics
Cash & Operations: startup-costs, burn-rate, cash-flow-forecast, financial-model-builder, compliance-checklist
```

### ToolId Union (updated in lib/ai/prompts.ts)
Add: `"safe-calculator" | "break-even" | "startup-costs"`

### Tool Relationships (new entries + updates to existing tools)

**New tools' relationships:**
- safe-calculator -> equity-simulator, valuation-calculator, pre-post-money
- break-even -> pricing-calculator, unit-economics, cash-flow-forecast
- startup-costs -> compliance-checklist, burn-rate, financial-model-builder

**Updated existing tools (add back-links):**
- equity-simulator: add safe-calculator ("Model how a SAFE converts in this round")
- pricing-calculator: add break-even ("See how many units you need to sell")
- burn-rate: add startup-costs ("Estimate your initial costs before tracking burn")
- compliance-checklist: add startup-costs ("See total startup costs including registration")

### Ecosystem Banners
No new ecosystem banners needed for these 3 tools.

### SEO
Each tool gets a `layout.tsx` with metadata (title, description, openGraph). Sitemap auto-includes new routes.

## Files to Create
- `lib/calculations/safe-calculator.ts`
- `lib/calculations/break-even.ts`
- `lib/calculations/startup-costs.ts`
- `app/tools/safe-calculator/page.tsx`
- `app/tools/safe-calculator/layout.tsx`
- `app/tools/break-even/page.tsx`
- `app/tools/break-even/layout.tsx`
- `app/tools/startup-costs/page.tsx`
- `app/tools/startup-costs/layout.tsx`

## Files to Modify
- `lib/constants.ts` — add 3 tools to TOOLS array and update TOOL_GROUPS
- `lib/ai/prompts.ts` — add 3 tool IDs to ToolId union and add AI prompt configs
- `lib/tool-relationships.ts` — add 3 new entries + update 4 existing back-links

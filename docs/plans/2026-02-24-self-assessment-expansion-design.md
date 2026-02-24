# Self-Assessment Expansion Design

## Goal

Expand the finance self-assessment quiz from 18 to 25 questions, adding a 6th category ("Revenue & Pricing") and covering all 15 tools in recommendations.

## Current State

- 18 questions across 5 categories
- `CATEGORY_TOOL_MAP` references 8 of 15 tools
- Missing: pricing-calculator, market-sizing, safe-calculator, break-even, startup-costs, fundraising-guide

## Changes

### New Category: Revenue & Pricing (4 questions)

**RP-1: Break-even concept**
- Q: "Your startup has PHP200K/month in fixed costs and a 40% contribution margin. What is your monthly break-even revenue?"
- Options: A) PHP200K B) PHP500K C) PHP800K D) PHP2M
- Correct: B (200K / 0.40 = 500K)
- Tool: break-even

**RP-2: Pricing strategy**
- Q: "Which pricing strategy sets price based on perceived customer value rather than cost?"
- Options: A) Cost-plus B) Value-based C) Penetration D) Freemium
- Correct: B
- Tool: pricing-calculator

**RP-3: TAM/SAM/SOM**
- Q: "Your product serves Filipino SMEs. There are 1M SMEs, 200K use software like yours, and you can realistically reach 5K in year one. What is your SOM?"
- Options: A) 1M B) 200K C) 5K D) None of these
- Correct: C
- Tool: market-sizing

**RP-4: Contribution margin**
- Q: "A product sells for PHP1,000 with PHP600 in variable costs. What is the contribution margin?"
- Options: A) 60% B) 40% C) PHP400 D) Both B and C
- Correct: D
- Tool: break-even, unit-economics

### Fundraising: 2 new SAFE questions

**FR-5: SAFE basics**
- Q: "What happens to a SAFE when a startup raises a priced round?"
- Options: A) Expires worthless B) Converts to equity at discount/cap C) Repaid as debt D) Nothing
- Correct: B
- Tool: safe-calculator

**FR-6: Valuation cap vs discount**
- Q: "A SAFE has a PHP20M valuation cap and 20% discount. Series A prices at PHP30M pre-money. Which term gives the investor a better deal?"
- Options: A) Valuation cap B) Discount C) Same D) Neither
- Correct: A (Cap: 20M vs Discount: 30M x 80% = 24M)
- Tool: safe-calculator

### Cash Management: 1 new startup costs question

**CM-4: Startup costs**
- Q: "Which is typically the LARGEST initial cost when registering a corporation in the Philippines?"
- Options: A) Barangay clearance B) SEC registration fee C) BIR registration D) Mayor's permit
- Correct: D
- Tool: startup-costs

### Updated CATEGORY_TOOL_MAP

| Category | Tools |
|----------|-------|
| financial-statements | financial-model-builder, cash-flow-forecast |
| valuation | valuation-calculator, pre-post-money |
| cash-management | burn-rate, cash-flow-forecast, **startup-costs** |
| fundraising | equity-simulator, unit-economics, **safe-calculator**, **fundraising-guide** |
| compliance | compliance-checklist |
| **revenue-pricing** | **pricing-calculator**, **market-sizing**, **break-even** |

### UI Changes

- Add `revenue-pricing` to `QuizCategory` type
- Add entry to `CATEGORY_LABELS`
- Add "Revenue & Pricing" card to intro grid
- Add `getCategoryLabel` entry in page component
- Radar chart picks up 6th spoke automatically

## Final Question Distribution

| Category | Questions |
|----------|-----------|
| Financial Statements | 4 |
| Valuation | 4 |
| Cash Management | 4 |
| Fundraising | 6 |
| Compliance | 3 |
| Revenue & Pricing | 4 |
| **Total** | **25** |

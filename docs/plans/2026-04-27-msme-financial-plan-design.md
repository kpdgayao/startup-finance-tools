# MSME 5-Year Financial Plan — Design

**Date:** 2026-04-27
**Status:** Approved
**Trigger:** DTI Region 2 SSF-LAMP Module 4 talk on 2026-04-28 — *"Improving Access to Finance: Developing a Realistic 5-Year Financial Plan."* Audience is SSF cooperators (cooperatives running shared service facilities — manufacturing/livelihood). The existing `financial-model-builder` is built for tech startups (monthly revenue, monthly growth %, DSO/DPO, EBITDA framing) and hard-coded to 3 years, which is the wrong fit for this audience.

## Goal

Ship a new tool at `/tools/msme-financial-plan` optimized for Filipino MSMEs and cooperatives that produces a credible 5-year integrated financial plan (P&L, Balance Sheet, Cash Flow, Statement of Changes in Equity) under three scenarios — Conservative, Base, Optimistic — with annual inputs, itemized OpEx, and a simple bank loan model. The tool must be usable for live demo on the talk and as a takeaway artifact (PDF) for participants.

## Non-Goals (deferred)

- What-if sliders
- Multi-product / multi-line revenue
- Sensitivity matrix
- Cooperative patronage refunds
- Filipino localization
- Cell-level Excel-like editing

---

## Tool Identity

| Field | Value |
|---|---|
| Route | `/tools/msme-financial-plan` |
| Title | MSME 5-Year Financial Plan |
| Subtitle | Build a realistic 5-year financial plan with conservative, base, and optimistic scenarios. Designed for MSMEs and cooperatives. |
| Sidebar group | New group: **DTI MSME Toolkit** (placed after "Cash & Operations") |
| Icon | `LineChart` (Lucide) |
| Reuse partners | `financial-model-builder`, `break-even`, `cash-flow-forecast`, `startup-costs`, `compliance-checklist` |

The new sidebar group seeds future MSME-specific tools (Module 5+ if invited again).

---

## Calculation Engine

**File:** `lib/calculations/msme-financial-plan.ts`

Pure functions. No React. Returns three full projections per call (one per scenario) so the UI never recomputes for scenario switches.

### Public types

```ts
type EntityType = "sole-prop" | "cooperative" | "corporation";
type RevenueModel = "lump-sum" | "units-x-price";
type ScenarioKey = "conservative" | "base" | "optimistic";

interface ScenarioMultipliers {
  revenueGrowthMultiplier: number; // applied to growth %, e.g. 0.7
  cogsAddend: number;              // added to COGS %, e.g. +5 means +5pp
  opexGrowthAddend: number;        // added to opex growth %, e.g. +5pp
}

interface MsmeFinancialPlanInputs {
  // Entity & horizon
  entityType: EntityType;
  startingEquity: number;
  horizonYears: number; // 3, 5, or 7

  // Revenue
  revenueModel: RevenueModel;
  startingAnnualRevenue: number; // lump-sum
  annualGrowthRate: number;      // % per year, base scenario
  startingUnits: number;         // units mode
  unitPrice: number;
  unitGrowthRate: number;
  priceGrowthRate: number;

  // Costs
  cogsPercent: number;
  opex: {
    rent: number;
    utilities: number;
    salaries: number;
    marketing: number;
    transportation: number;
    supplies: number;
    insurance: number;
    other: number;
  }; // annual amounts
  opexAnnualGrowth: number; // % per year

  // Working capital
  startingCash: number;
  daysToCollect: number;   // AR
  daysToPay: number;       // AP
  inventoryDays: number;

  // CapEx (per year array, length = horizonYears)
  capExSchedule: number[];
  usefulLifeYears: number;

  // Loan
  loanEnabled: boolean;
  loanPrincipal: number;
  loanInterestRate: number; // % annual
  loanTermYears: number;
  loanGracePeriodYears: number;

  // Tax & distributions
  taxRate: number;
  distributionPercent: number; // % of net income paid as drawings/dividends

  // Scenarios
  scenarios: Record<ScenarioKey, ScenarioMultipliers>;
}

interface AnnualRow {
  year: number;
  // P&L
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  opex: { rent: number; utilities: number; salaries: number; marketing: number; transportation: number; supplies: number; insurance: number; other: number; total: number };
  ebitda: number;
  depreciation: number;
  ebit: number;
  interestExpense: number;
  preTaxIncome: number;
  tax: number;
  netIncome: number;
  netMarginPercent: number;
  // Balance Sheet (year-end)
  cash: number;
  accountsReceivable: number;
  inventory: number;
  cumulativeCapEx: number;
  accumulatedDepreciation: number;
  netPPE: number;
  totalAssets: number;
  accountsPayable: number;
  loanBalance: number;
  totalLiabilities: number;
  capital: number;          // beginning + contributions - distributions
  retainedEarnings: number; // cumulative net income
  totalEquity: number;
  // Cash Flow
  operatingCF: number;
  investingCF: number;
  financingCF: number; // + loan proceeds, - principal payments, - distributions
  netCashFlow: number;
}

interface SCERow {
  year: number;
  beginningCapital: number;
  contributions: number;
  netIncome: number;
  distributions: number;
  endingCapital: number;
}

interface BalanceSheetSeed { /* same fields as AnnualRow's BS section, year 0 */ }

interface ScenarioOutput {
  annual: AnnualRow[];
  seed: BalanceSheetSeed;
  sce: SCERow[];
  summary: {
    horizonRevenue: number;
    avgGrossMargin: number;
    finalYearEbit: number;
    finalYearNetIncome: number;
    finalYearCash: number;
    cumulativeNetIncome: number;
    breakEvenYear: number | null;
  };
}

interface MsmeFinancialPlanResult {
  scenarios: Record<ScenarioKey, ScenarioOutput>;
}

function buildMsmeFinancialPlan(inputs: MsmeFinancialPlanInputs): MsmeFinancialPlanResult;
function exportMsmePlanCSV(result: MsmeFinancialPlanResult, inputs: MsmeFinancialPlanInputs): string;
```

### Calculation rules

- **Revenue, lump-sum mode:** `revenue[y] = startingAnnualRevenue × (1 + adjustedGrowthRate)^(y-1)`. Adjusted growth = `annualGrowthRate × scenario.revenueGrowthMultiplier`.
- **Revenue, units mode:** `revenue[y] = startingUnits × (1 + unitGrowthRate × scenario.revenueGrowthMultiplier)^(y-1) × unitPrice × (1 + priceGrowthRate)^(y-1)`. Price growth is not scenario-adjusted.
- **COGS:** `cogs[y] = revenue[y] × (cogsPercent + scenario.cogsAddend) / 100`.
- **OpEx:** each line grows at `opexAnnualGrowth + scenario.opexGrowthAddend` per year; total = sum.
- **Depreciation:** straight-line on cumulative CapEx with single useful life. Each capex addition starts depreciating in the year it's placed in service. (Simplification: treat all capex as start-of-year; full year depreciation in placement year.)
- **Interest expense:** `interestExpense[y] = openingLoanBalance × loanInterestRate / 100` if loan enabled.
- **Loan principal payment:** zero during grace period; afterward, `loanPrincipal / (loanTermYears - loanGracePeriodYears)` per year, straight-line. (Simpler than amortization tables; appropriate for layman audience.) Interest accrues during grace period (interest-only servicing) — this is the realistic case for most PH MSME loans.
- **Tax:** `tax = max(0, preTaxIncome) × taxRate / 100`. No NOL carryforward.
- **Distributions:** `distributions[y] = max(0, netIncome[y]) × distributionPercent / 100`.
- **Working capital:**
  - `accountsReceivable = revenue × (daysToCollect / 365)`
  - `accountsPayable = (cogs + totalOpEx) × (daysToPay / 365)`
  - `inventory = cogs × (inventoryDays / 365)`
- **Cash flow (indirect method):**
  - Operating CF = NetIncome + Depreciation − ΔAR + ΔAP − ΔInventory
  - Investing CF = −capex[y]
  - Financing CF = (Y0 only: +loan proceeds) − loan principal payment − distributions + Y0 startingEquity contribution
- **Equity:** capital tracks contributions and distributions; retained earnings tracks cumulative net income; total equity = capital + retained earnings. SCE rolls these forward yearly.
- **Balance assertion:** `Math.abs(totalAssets − (totalLiabilities + totalEquity)) < 1` for every year, every scenario. Throw a clearly-named error in dev if it fails so we catch model bugs early.

### Default scenario multipliers

| Scenario | revenueGrowthMultiplier | cogsAddend | opexGrowthAddend |
|---|---|---|---|
| Conservative | 0.7 | +5 | +3 |
| Base | 1.0 | 0 | 0 |
| Optimistic | 1.3 | −3 | −2 |

Tooltip on each scenario explains why the defaults are what they are. User can override in an "Advanced" disclosure.

---

## Page Layout

**File:** `app/tools/msme-financial-plan/page.tsx`
**Layout file:** `app/tools/msme-financial-plan/layout.tsx` (SEO metadata)

### Sections (top to bottom)

1. **Header** — title, subtitle, `LearnLink`, action buttons (Reset, Export CSV, Export PDF). Reuse `ExportPDFButton` with `enableEmailCapture`.

2. **Assumption cards** (single-column on mobile, two-column on `md+`):
   - **Entity & Horizon** — `Select` for entity type (Sole Proprietorship / Cooperative / Corporation), horizon picker (3/5/7 — radio group), `CurrencyInput` for starting equity contribution.
   - **Revenue** — toggle (`Tabs`) for Lump-sum vs Units × Price; conditional inputs.
   - **Costs** — `PercentageInput` for COGS %, then a header "Operating Expenses (annual)" with 8 `CurrencyInput`s in a 2-column grid (Rent, Utilities, Salaries, Marketing, Transportation, Supplies, Insurance, Other), then `PercentageInput` for "Annual OpEx Growth."
   - **Working Capital** — starting cash, days to collect, days to pay, inventory days.
   - **CapEx** — per-year inputs (5 currency inputs labeled "Year 1 Investment" through "Year 5 Investment"), useful life input.
   - **Financing** — toggle to enable loan, then conditional fields (principal, interest rate, term, grace period).
   - **Distributions** — tax rate, distribution %.

3. **Scenario strip** — horizontal row of 3 mini-cards (Conservative | Base | Optimistic). Each card shows its 3 KPIs (Final-year revenue, Final-year net income, Final-year cash) and is clickable to set the active scenario. Active card has primary border + glow.

4. **KPI Result Cards** (4) — 5y revenue, avg gross margin, Final-year EBIT, Final-year cash. Pulled from active scenario. Color-coded via `ResultCard` variants.

5. **Statement tabs** (`Tabs` with 4 triggers): P&L | Balance Sheet | Cash Flow | Changes in Equity.
   - Each tab: table (using same patterns as `financial-model-builder`) + chart (reuse `ComposedChart`/`BarChart` patterns).
   - **P&L table rows**: Revenue, COGS, Gross Profit, Gross Margin %, then OpEx subtotal (with expandable line items behind a "Show details" toggle to keep the table scannable), EBITDA, Depreciation, EBIT, Interest Expense, Pre-tax Income, Tax, Net Income, Net Margin %.
   - **BS table rows**: Cash, AR, Inventory, Net PP&E, Total Assets // AP, Loan Balance, Total Liabilities // Capital, Retained Earnings, Total Equity. Year 0 from seed + horizonYears columns.
   - **CF table rows**: Operating CF, Investing CF, Financing CF, Net Cash Flow, Ending Cash.
   - **SCE table rows**: Beginning Capital, Contributions, Net Income, Distributions, Ending Capital.

6. **AI Insights panel** — new tool ID `msme-financial-plan` with MSME-flavored persona prompt.

7. **Ecosystem Banner**.

8. **Related Tools** — break-even, cash-flow-forecast, financial-model-builder, startup-costs.

### Labels & copy adjustments

- "OpEx" → "Operating Expenses"
- "EBITDA" tooltip explains in plain Filipino-English: "Earnings before interest, tax, and depreciation — basically your operating profit before non-cash items"
- "DSO" → "Days to Collect (from customers)"
- "DPO" → "Days to Pay (suppliers)"
- "Capital" labeling switches by entity type:
  - sole-prop → "Owner's Capital"
  - cooperative → "Members' Share Capital"
  - corporation → "Paid-up Capital"
- Distributions row label switches:
  - sole-prop → "Drawings"
  - cooperative → "Patronage Distributions"
  - corporation → "Dividends"

---

## PDF Export

The takeaway artifact for cooperators. Sections in order:

1. **Cover page** — entity type, horizon, generated date
2. **Assumptions** — full input dump as a summary grid
3. **Scenario Comparison** — 4 small tables (one per statement) showing only the **summary line** for each scenario side-by-side (e.g., for P&L: Revenue, Net Income per year per scenario). This is the executive view.
4. **Conservative Scenario** — full P&L, BS, CF, SCE
5. **Base Scenario** — full P&L, BS, CF, SCE
6. **Optimistic Scenario** — full P&L, BS, CF, SCE
7. **Footer** — "Prepared with Startup Finance Toolkit · startupfinance.tools"

Reuses existing `summaryCard`, `section`, `table` helpers from `export-pdf-button`.

---

## CSV Export

Single CSV with sections separated by blank rows. Mirrors the PDF order: Assumptions → Scenario Summary → Conservative → Base → Optimistic. Each scenario block has all four statements.

---

## AI Insights

New entry in the AI explanation system (`useAiExplain("msme-financial-plan")`).

**Persona:** "You are advising a Filipino MSME owner or cooperative leader. Use plain language, avoid jargon, reference the K! Peanuts case study style if helpful. Always tie advice to next steps the user can take in this toolkit."

**Inputs sent to model:** active scenario summary KPIs + user's entity type + horizon + whether loan is enabled + final-year cash + break-even year.

**Output expectations:** 3-5 short paragraphs covering (1) what the plan shows, (2) the biggest risk under conservative scenario, (3) one operational lever to pull, (4) one related tool to use next.

---

## Constants & Wiring

**`lib/constants.ts`** — add new `TOOL_GROUPS` entry:
```ts
{
  label: "DTI MSME Toolkit",
  description: "For Filipino MSMEs and cooperatives",
  tools: [{ id: "msme-financial-plan", name: "MSME 5-Year Financial Plan", icon: LineChart, href: "/tools/msme-financial-plan" }]
}
```
Placed after "Cash & Operations".

**`lib/tool-relationships.ts`** — add entry for `msme-financial-plan` linking to `break-even`, `cash-flow-forecast`, `financial-model-builder`. Also add reverse link from those tools back to `msme-financial-plan` where it makes sense.

**`app/sitemap.ts`** — automatically picks up new tool if it's pulled from a registry; otherwise add explicit entry.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Won't finish by demo time | Ship in this dependency-ordered sequence, each independently usable: (1) calc engine, (2) page with one scenario only, (3) scenario strip + active toggle, (4) all 4 statement tabs, (5) PDF export, (6) AI insights, (7) constants & related-tools wiring. If we fall short, cut from the bottom of this list. |
| BS doesn't balance under some inputs | Runtime assertion + visible warning banner if `Math.abs(A − (L+E)) > 1` in any year. Build will fail dev if so. |
| Itemized OpEx makes UI feel dense | Keep all 8 OpEx fields visible by default — they're the educational artifact for the talk. Use a 2-column grid so they're scannable. Revisit collapsing post-talk if UX testing flags it. |
| Scenario multipliers feel arbitrary | Defaults shown with tooltip explaining the rationale. "Advanced" disclosure lets user override. |
| Dual-entity equity logic complicates calcs | Calc is identical across entity types; only labels differ. Verified by deriving equity changes purely from contributions − distributions + retained earnings, which works for any entity. |
| Loan amortization may surprise users | Use straight-line principal over `(term − grace)` years rather than full mortgage amortization. Documented in tooltip. |

---

## Build Sequence

The implementation plan (next step) will break this into:

1. Calc engine + tests (manual: assertion-driven)
2. Page scaffold + assumption cards
3. Scenario strip + KPI cards
4. P&L tab
5. BS tab
6. CF tab
7. SCE tab
8. PDF export (3 scenarios)
9. CSV export
10. AI insights wiring
11. Sidebar group + tool relationships + sitemap
12. Manual QA: balance check across scenarios, reset, exports, dev server walkthrough

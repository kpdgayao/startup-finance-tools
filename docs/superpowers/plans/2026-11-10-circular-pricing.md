# Circular Pricing Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/tools/pricing-calculator` teach what the CircleWorks pricing talk teaches. That means a correct markup-vs-margin split, a charm price that is never negative, reuse-aware itemized costs, per-measure sachet benchmarking, a "pick your price and share it" panel, savings-built value, and a two-price test.

**Architecture:**
- Pure calculation functions live in `lib/calculations/pricing.ts` (existing) and `lib/calculations/pricing-costs.ts` (new), each tested by vitest.
- The page `app/tools/pricing-calculator/page.tsx` keeps all state, because the AI payload needs all of it.
- New presentational pieces go in `app/tools/pricing-calculator/components/`, following the `app/tools/cash-flow-forecast/components/` pattern. Each piece receives values and setters as props.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (new-york), lucide-react, vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-10-circular-pricing-design.md`. Read it first.

## Global Constraints

- **Commands:**
  - Run every command from the repo root, which is the `app/` directory.
  - Package manager is pnpm. Add NO dependencies.
- **Tests:**
  - Never run `pnpm test`; it is watch mode and looks like a hang.
  - Use `pnpm exec vitest run <file>`.
  - Typecheck with `pnpm exec tsc --noEmit`. Exactly one pre-existing error is expected and is not yours: `lib/__tests__/tool-index.test.ts(130)` TS1501.
- **No build or dev server.** Do NOT run `pnpm build`, `pnpm dev` or `next start`. The reviewer runs the build; this machine hangs under memory pressure.
- **Lint scope.** Lint only the files you touched, with `pnpm exec eslint <files>`. `pnpm lint` has a known failing baseline.
- **Styling:**
  - Colours only through existing tokens: `text-good`, `text-warn`, `text-bad`, `text-muted-foreground`, `border-rule`, `bg-muted`, and ResultCard `variant`s.
  - No hex colours, no `shadow-*`, no gradients, no Tailwind palette classes (`text-red-500` etc.). `lib/__tests__/design-tokens.test.ts` fails on all of them.
- **Copy:**
  - American spelling and Philippine English: "behavior", "color", "labor".
  - Say "more expensive", not "dearer". Write peso amounts as `₱`.
  - `lib/__tests__/philippine-english.test.ts` scans `lib/ai/prompts.ts`.
- **Validation pattern** (from `lib/validation.ts`):
  - A field's sanitizer and validator take the SAME `{ min, max }` as its input component.
  - A mismatch silently clamps valid values.
  - Optional counts that may be 0 need `{ allowZero: true }`.
- **One set of numbers.** Feed the sanitized ("safe") values to EVERY consumer: calculations, results, AI payload. Do not mix raw and safe values.
- **Mobile.** No horizontal page scroll at 375px wide. Multi-column rows collapse to one column below `sm`.
- **Commits.**
  - One commit per task, with the message the task gives.
  - End every commit message with the line `Co-Authored-By: Hermes (DeepSeek) <noreply@deepseek.com>`.
  - Do not push. Do not open a PR. Do not touch `master`.
- **Secrets.** Never open `.env`, `.env.local` or `.env.example`.

## Review Focus

1. **Basis switch must keep the price.** Switching Markup ↔ Margin with a large markup (e.g. 150%) must not silently clamp. The percent converts to the equivalent figure, so the price stays the same. Test in Task 1.
2. **Prices under ₱10.** Any price between 0 and 10 gives a non-negative charm suggestion or "none". Never −₱1. Test in Task 2.
3. **Zero or blank divisors.**
   - Inputs: a one-time cost with 0 months, a per-use cost with 0 uses, a competitor pack size of 0.
   - None may produce `Infinity` or `NaN` on screen.
   - Tests in Tasks 3 and 5.
4. **Price below variable cost.** A chosen price below variable cost gives "below cost" and break-even "N/A". It must never show a negative break-even. Test in Task 6.
5. **Deck's worked answers with defaults.**
   - Unit cost ₱110, price ₱143, break-even 362, total cost ₱66,000, profit ₱19,800.
   - ₱0.14 per ml.
   - +₱5 per liter adds ₱3,000 a month.
   - Tests in Tasks 3, 5 and 7.

---

## Phase A — correctness fixes (shippable on their own, before the talk)

### Task 1: Markup vs margin

**Files:**
- Modify: `lib/calculations/pricing.ts`
- Modify: `lib/calculations/__tests__/pricing.test.ts`
- Modify: `app/tools/pricing-calculator/page.tsx` (Cost-Plus tab, reset, AI payload)
- Modify: `lib/ai/prompts.ts` (the `"pricing-calculator"` entry only)
- Modify: `app/learn/pricing-your-product/page.tsx` (the Cost-Plus paragraph only, around lines 38–43)

**Interfaces:**
- Produces:

```ts
export type PricingBasis = "markup" | "margin";

export interface PricingResult {
  price: number;
  unitCost: number;            // fixed ÷ units + variable (variable only when units ≤ 0)
  profitPerUnit: number;       // price − unitCost   (was `margin`)
  markupPercent: number;       // profitPerUnit ÷ unitCost × 100 (0 when unitCost is 0)
  marginPercent: number;       // profitPerUnit ÷ price × 100   (0 when price is 0)
  breakeven: number;           // Math.ceil(fixed ÷ (price − variable)); Infinity when that contribution ≤ 0
  contributionPerUnit: number; // price − variable
}

export function calculateCostPlus(costs: CostBreakdown, percent: number, basis: PricingBasis = "markup"): PricingResult;
export function convertBasisPercent(percent: number, from: PricingBasis, to: PricingBasis): number;
```

- Pricing rules:
  - `markup`: price = unitCost × (1 + percent/100).
  - `margin`: price = unitCost ÷ (1 − percent/100). When `percent >= 100` the price is `Infinity` and break-even is `0`. The UI never sends that (see Step 5).
- `convertBasisPercent` rules:
  - markup→margin: `m / (1 + m/100)`.
  - margin→markup: `g / (1 − g/100)`.
  - Same basis returns the input.
  - Round to 1 decimal.
  - margin→markup with `g >= 100` returns 500, the markup input's max.

- [ ] **Step 1: Update the existing tests and add the deck cases**

In `pricing.test.ts`:
- Rename `result.margin` to `result.profitPerUnit` in the existing "margin equals price minus total cost per unit" test.
- Rename that test to "profitPerUnit equals price minus unit cost".
- Add:

```ts
describe("calculateCostPlus — deck practice case", () => {
  const deck = { fixedCosts: 30_000, variableCostPerUnit: 60, expectedUnits: 600 };

  it("30% markup gives ₱143, which is a 23% margin", () => {
    const r = calculateCostPlus(deck, 30, "markup");
    expect(r.unitCost).toBe(110);
    expect(r.price).toBeCloseTo(143, 6);
    expect(r.markupPercent).toBeCloseTo(30, 6);
    expect(r.marginPercent).toBeCloseTo(23.08, 2);
    expect(r.breakeven).toBe(362);
  });

  it("30% margin gives ₱157, which is a 43% markup", () => {
    const r = calculateCostPlus(deck, 30, "margin");
    expect(r.price).toBeCloseTo(157.14, 2);
    expect(r.marginPercent).toBeCloseTo(30, 6);
    expect(r.markupPercent).toBeCloseTo(42.86, 2);
  });

  it("defaults to markup when no basis is given", () => {
    expect(calculateCostPlus(deck, 30).price).toBeCloseTo(143, 6);
  });

  it("margin of 100% or more prices at Infinity instead of going negative", () => {
    expect(calculateCostPlus(deck, 100, "margin").price).toBe(Infinity);
  });
});

describe("convertBasisPercent", () => {
  it("30% markup is a 23.1% margin", () => expect(convertBasisPercent(30, "markup", "margin")).toBe(23.1));
  it("30% margin is a 42.9% markup", () => expect(convertBasisPercent(30, "margin", "markup")).toBe(42.9));
  it("150% markup is a 60% margin (no clamping on the way)", () => expect(convertBasisPercent(150, "markup", "margin")).toBe(60));
  it("same basis is unchanged", () => expect(convertBasisPercent(37, "margin", "margin")).toBe(37));
  it("margin of 100 converts to the markup max of 500", () => expect(convertBasisPercent(100, "margin", "markup")).toBe(500));
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm exec vitest run lib/calculations/__tests__/pricing.test.ts`
Expected: FAIL. `convertBasisPercent` is not exported, and `profitPerUnit` / `unitCost` are undefined.

- [ ] **Step 3: Implement in `lib/calculations/pricing.ts`**

- Change `PricingResult` and `calculateCostPlus` to the Interfaces block.
- Add `PricingBasis` and `convertBasisPercent`.
- Keep `CostBreakdown` unchanged.

- [ ] **Step 4: Run and confirm pass**

Run: `pnpm exec vitest run lib/calculations/__tests__/pricing.test.ts`
Expected: all PASS.

- [ ] **Step 5: Wire the UI in `page.tsx`**

**State and validation:**
- Rename state `marginPercent` → `targetPercent` (default 40, unchanged in this task).
- Add `const [pricingBasis, setPricingBasis] = useState<PricingBasis>("markup")`.
- `const percentMax = pricingBasis === "margin" ? 99 : 500;`
- Use `percentMax` in all three places: `PercentageInput max`, `validatePercentage(targetPercent, { max: percentMax })` and `sanitizePercentage(targetPercent, { max: percentMax })`.

**Basis toggle:**
- Place it above the inputs, inside the Cost-Plus card: two `Button`s, `size="sm"`, with `aria-pressed`.
- The active one is `variant="default"`, the other `variant="outline"`.
- Labels: **"Markup on cost"** and **"Margin on price"**.
- Clicking the inactive one runs `setTargetPercent(convertBasisPercent(targetPercent, pricingBasis, next))`, then `setPricingBasis(next)`. Converting keeps the price unchanged.

**Input label:** `pricingBasis === "markup" ? "Markup % (of cost)" : "Margin % (of price)"`.

**Result cards** (same 4-column grid), replacing the current four:
1. "Price per Unit": `formatPHP(price)`, variant success.
2. "Unit Cost": `formatPHP(unitCost)`, sublabel "Your price floor at this volume".
3. "Profit per Unit": `formatPHP(profitPerUnit)`, sublabel `` `${markupPercent.toFixed(1)}% markup · ${marginPercent.toFixed(1)}% margin` ``.
4. "Break-even Units": as today. Add sublabel `` `Each sale adds ${formatPHP(contributionPerUnit)} toward fixed costs` ``.

**Explanatory line** under the cards, `<p className="text-sm text-muted-foreground">`, with this exact copy:
`A {markup}% markup is a {margin}% margin. When someone says "30% margin", ask: of cost, or of price?`
Fill `{markup}` and `{margin}` with `toFixed(1)` of the result fields.

**Tooltip:** set the Cost-Plus `InfoTooltip` content to exactly:
`Unit cost = fixed costs ÷ units + variable cost. Markup is profit ÷ cost; margin is profit ÷ price. Kevin's example: ₱130K costs ÷ 10 clients × 1.4 = ₱18,200 per client a month — a 40% markup, which is a 28.6% margin.`

**Psychological tab:** it reads `costPlusResult.price`, so it keeps working. Do not touch it in this task.

**handleReset:** also resets `setPricingBasis("markup")`.

**AI payload `costPlus`:** `{ fixedCosts, variableCost, expectedUnits, basis: pricingBasis, percent: safeTargetPercent, unitCost, price, profitPerUnit, markupPercent, marginPercent, breakeven }`.

- [ ] **Step 6: Fix the words in the AI prompt and the learn article**

In `lib/ai/prompts.ts`, `"pricing-calculator"`, replace the first curriculum bullet with exactly:
`- Cost-plus is the baseline: unit cost × (1 + markup). Kevin's example: ₱130K costs ÷ 10 clients × 1.4 = ₱18,200/month. That is a 40% MARKUP, which is only a 28.6% MARGIN. Markup is profit ÷ cost; margin is profit ÷ price. Never call a markup a margin, and say which one the user chose (the payload's "basis").`

In `app/learn/pricing-your-product/page.tsx`, replace the Cost-Plus paragraph's text with:
`The baseline approach: calculate your total costs, add a markup, and divide by the number of units. Kevin's example: if your monthly costs are ₱130,000 and you add a 40% markup, your revenue target is ₱182,000. With 10 clients, that's ₱18,200 per month per client. Careful with the words: a 40% markup on cost is only a 28.6% margin on price. To earn a true 40% margin, divide cost by 0.6 instead.`
Keep the JSX entities (`&apos;`) style used in the file.

- [ ] **Step 7: Verify**

Run each:
- `pnpm exec vitest run lib/calculations/__tests__/pricing.test.ts lib/__tests__/philippine-english.test.ts lib/__tests__/design-tokens.test.ts`. Expected: all pass.
- `pnpm exec tsc --noEmit`. Expected: only the known TS1501 line.
- `pnpm exec eslint lib/calculations/pricing.ts app/tools/pricing-calculator/page.tsx lib/ai/prompts.ts app/learn/pricing-your-product/page.tsx`. Expected: no new errors in lines you changed.

- [ ] **Step 8: Commit**

```bash
git add lib/calculations/pricing.ts lib/calculations/__tests__/pricing.test.ts app/tools/pricing-calculator/page.tsx lib/ai/prompts.ts app/learn/pricing-your-product/page.tsx
git commit -m "fix(pricing): call a markup a markup, and offer a true margin on price"
```

### Task 2: Charm price that is never negative

**Files:**
- Modify: `lib/calculations/pricing.ts`
- Modify: `lib/calculations/__tests__/pricing.test.ts`
- Modify: `app/tools/pricing-calculator/page.tsx` (Psychological tab, reset, AI payload)

**Interfaces:**
- Consumes: `calculateCostPlus(...).price` from Task 1.
- Produces:

```ts
export function suggestPsychologicalPrice(price: number): number;            // unchanged signature
export function suggestCharmPrices(price: number): { down: number; up: number } | null;
```

- `suggestPsychologicalPrice` rules:
  - `price <= 0` → 0.
  - `0 < price < 9` → `Math.floor(price)` (no 9-ending exists at or below it).
  - Otherwise, today's behavior: the largest integer ending in 9 that is ≤ price.
- `suggestCharmPrices` rules:
  - `price < 9` → `null`.
  - Otherwise `{ down: suggestPsychologicalPrice(price), up: down + 10 }`.

- [ ] **Step 1: Add the failing tests**

```ts
describe("suggestPsychologicalPrice — small prices", () => {
  it("never returns a negative price", () => {
    for (let p = 0.5; p <= 200; p += 0.5) {
      const r = suggestPsychologicalPrice(p);
      expect(r, `price ${p}`).toBeGreaterThanOrEqual(0);
      expect(r, `price ${p}`).toBeLessThanOrEqual(p);
    }
  });
  it("leaves a ₱5 add-on at ₱5", () => expect(suggestPsychologicalPrice(5)).toBe(5));
  it("₱9.50 becomes ₱9", () => expect(suggestPsychologicalPrice(9.5)).toBe(9));
});

describe("suggestCharmPrices", () => {
  it("₱143 → down ₱139, up ₱149", () => expect(suggestCharmPrices(143)).toEqual({ down: 139, up: 149 }));
  it("₱18 → down ₱9, up ₱19", () => expect(suggestCharmPrices(18)).toEqual({ down: 9, up: 19 }));
  it("₱99 → down ₱99, up ₱109", () => expect(suggestCharmPrices(99)).toEqual({ down: 99, up: 109 }));
  it("below ₱9 there is no charm price", () => {
    expect(suggestCharmPrices(5)).toBeNull();
    expect(suggestCharmPrices(0)).toBeNull();
  });
});
```

The existing `suggestPsychologicalPrice` tests must still pass unchanged.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm exec vitest run lib/calculations/__tests__/pricing.test.ts`
Expected: FAIL. The negative-price loop fails at p=0.5, and `suggestCharmPrices` is not exported.

- [ ] **Step 3: Implement both functions in `pricing.ts`.**

- [ ] **Step 4: Run and confirm pass** (same command; all PASS).

- [ ] **Step 5: Make the Psychological tab a real input**

**State and input:**
- State: `const [charmBase, setCharmBase] = useState<number | null>(null);`. `null` means "follow the cost-plus price".
- `const charmInput = charmBase ?? Math.round(costPlusResult.price);`
- `const safeCharmInput = sanitizeFinancialAmount(charmInput);`
- `const charm = suggestCharmPrices(safeCharmInput);`
- Replace the dead `onChange={() => {}}` input with `CurrencyInput label="Price to round" value={charmInput} onChange={setCharmBase}`.
- Under it, render a `Button variant="ghost" size="sm"` labeled "Use my cost-plus price", but only when `charmBase !== null`. It runs `setCharmBase(null)`.

**Results when `charm` is not null** (3 columns):
1. "Your Price": `formatPHP(safeCharmInput)`.
2. "Round Down": `formatPHP(charm.down)`.
   - Use `variant="success"` when `charm.down >= safeCharmInput * 0.95`, else `variant="warning"`.
   - Sublabel when success: `` `Feels cheaper than ${formatPHP(charm.down + 1)}` ``.
   - Sublabel when warning: `` `Cuts ${(100 - (charm.down / safeCharmInput) * 100).toFixed(0)}% off your price — consider rounding up` ``.
3. "Round Up": `formatPHP(charm.up)`, sublabel "More margin, still ends in 9".

**Results when `charm` is null:** one ResultCard, label "Charm Price", value "None", sublabel "Below ₱9 there is no lower price ending in 9. Keep it round, or sell two for ₱9."

**Reset and AI payload:**
- `handleReset` adds `setCharmBase(null)`.
- AI payload: replace `psychologicalPrice` with `psychological: { price: safeCharmInput, down: charm?.down ?? null, up: charm?.up ?? null }`.
- Remove the now-unused `psychologicalPrice` const and its import if nothing else uses it.

- [ ] **Step 6: Verify**

Same three commands as Task 1 Step 7. Lint scope: `lib/calculations/pricing.ts app/tools/pricing-calculator/page.tsx`.

- [ ] **Step 7: Commit**

```bash
git add lib/calculations/pricing.ts lib/calculations/__tests__/pricing.test.ts app/tools/pricing-calculator/page.tsx
git commit -m "fix(pricing): a charm price is never negative, and the price to round is yours to type"
```

---

## Phase B — reuse-aware costing

### Task 3: Cost lines calculation module

**Files:**
- Create: `lib/calculations/pricing-costs.ts`
- Create: `lib/calculations/__tests__/pricing-costs.test.ts`

**Interfaces:**
- Produces:

```ts
export type CostCategory = "materials" | "labor" | "overhead" | "containers" | "collection" | "cleaning";
export type CostBehavior = "fixed" | "variable" | "one-time" | "per-use";

export interface CostLine {
  id: string;
  name: string;
  category: CostCategory;
  behavior: CostBehavior;
  amount: number;        // fixed: ₱/month · variable: ₱/unit · one-time: total ₱ · per-use: ₱ per item
  lifeMonths?: number;   // one-time only; values < 1 or missing are treated as 1
  uses?: number;         // per-use only; values < 1 or missing are treated as 1
  grantFunded?: boolean; // "the grant pays this now"
}

export interface CostSummary {
  fixedMonthly: number;
  variablePerUnit: number;
  grantFixedMonthly: number;     // the part of fixedMonthly from grantFunded lines
  grantVariablePerUnit: number;  // the part of variablePerUnit from grantFunded lines
  byCategory: Record<CostCategory, { fixedMonthly: number; variablePerUnit: number }>;
  hasTakeBackCosts: boolean;     // any containers/collection/cleaning line with amount > 0
}

export interface MonthlyOutcome { totalCost: number; revenue: number; profit: number }

export const COST_CATEGORY_LABELS: Record<CostCategory, string>;
// { materials: "Materials", labor: "Labor", overhead: "Overhead", containers: "Containers", collection: "Collection", cleaning: "Cleaning" }
export const COST_BEHAVIOR_LABELS: Record<CostBehavior, string>;
// { fixed: "Fixed, per month", variable: "Variable, per unit", "one-time": "One-time, spread over months", "per-use": "Reusable item, cost ÷ uses" }

export function summarizeCosts(lines: CostLine[]): CostSummary;
export function calculateMonthlyOutcome(fixedMonthly: number, variablePerUnit: number, units: number, price: number): MonthlyOutcome;

export const REFILL_STATION_EXAMPLE: CostLine[];
export const MISSED_COSTS: Omit<CostLine, "id" | "amount">[];
```

- Behavior rules:
  - `fixed` → `amount` adds to fixed.
  - `one-time` → `amount / max(1, lifeMonths ?? 1)` adds to fixed.
  - `variable` → `amount` adds to variable.
  - `per-use` → `amount / max(1, uses ?? 1)` adds to variable.
- `calculateMonthlyOutcome` returns:
  - `totalCost = fixed + variable × units`;
  - `revenue = price × units`;
  - `profit = revenue − totalCost`.

`REFILL_STATION_EXAMPLE` is exactly the deck's Exercise 1, with ids `ex-1`…`ex-9`:

| id | name | category | behavior | amount | extra |
|---|---|---|---|---|---|
| ex-1 | Stall rent | overhead | fixed | 6000 | |
| ex-2 | Refill attendant salary | labor | fixed | 18000 | |
| ex-3 | Electricity | overhead | fixed | 2500 | |
| ex-4 | Tracking app subscription | overhead | fixed | 1500 | |
| ex-5 | Dispenser | overhead | one-time | 48000 | lifeMonths 24 |
| ex-6 | Bulk dish soap | materials | variable | 45 | |
| ex-7 | Reusable 1-liter bottle | containers | per-use | 50 | uses 10 |
| ex-8 | Bottle washing supplies | cleaning | variable | 4 | |
| ex-9 | Pickup rider | collection | variable | 6 | |

`MISSED_COSTS`, in this order:

| name | category | behavior | extra |
|---|---|---|---|
| Your own time | labor | fixed | |
| Lost containers | containers | variable | |
| Permits and taxes | overhead | fixed | |
| Payment fees | overhead | variable | |
| Restocking trips | overhead | variable | |
| Spills and waste | materials | variable | |
| Marketing | overhead | fixed | |
| Start-up costs | overhead | one-time | lifeMonths 24 |

- [ ] **Step 1: Write the failing tests** in `pricing-costs.test.ts`:

```ts
it("the refill-station example matches Exercise 2: ₱30,000 fixed and ₱60 per liter", () => {
  const s = summarizeCosts(REFILL_STATION_EXAMPLE);
  expect(s.fixedMonthly).toBe(30_000);
  expect(s.variablePerUnit).toBe(60);
  expect(s.hasTakeBackCosts).toBe(true);
});
it("a ₱48,000 dispenser over 24 months is ₱2,000 a month", () => {
  expect(summarizeCosts([line({ behavior: "one-time", amount: 48_000, lifeMonths: 24 })]).fixedMonthly).toBe(2_000);
});
it("a ₱50 bottle used 10 times is ₱5 per unit", () => {
  expect(summarizeCosts([line({ behavior: "per-use", amount: 50, uses: 10 })]).variablePerUnit).toBe(5);
});
it("0 months or 0 uses count as 1, never Infinity", () => {
  const s = summarizeCosts([
    line({ behavior: "one-time", amount: 1_200, lifeMonths: 0 }),
    line({ behavior: "per-use", amount: 50, uses: 0 }),
  ]);
  expect(s.fixedMonthly).toBe(1_200);
  expect(s.variablePerUnit).toBe(50);
});
it("grant-funded lines are counted in the totals and reported separately", () => {
  const s = summarizeCosts([
    line({ behavior: "fixed", amount: 18_000, grantFunded: true }),
    line({ behavior: "fixed", amount: 6_000 }),
    line({ behavior: "variable", amount: 6, grantFunded: true }),
  ]);
  expect(s.fixedMonthly).toBe(24_000);
  expect(s.grantFixedMonthly).toBe(18_000);
  expect(s.grantVariablePerUnit).toBe(6);
});
it("byCategory splits the totals", () => {
  const s = summarizeCosts(REFILL_STATION_EXAMPLE);
  expect(s.byCategory.labor.fixedMonthly).toBe(18_000);
  expect(s.byCategory.containers.variablePerUnit).toBe(5);
  expect(s.byCategory.overhead.fixedMonthly).toBe(12_000);
});
it("materials-only costs have no take-back costs", () => {
  expect(summarizeCosts([line({ category: "materials", amount: 45 })]).hasTakeBackCosts).toBe(false);
});
it("a take-back line at ₱0 does not count as having take-back costs", () => {
  expect(summarizeCosts([line({ category: "cleaning", amount: 0 })]).hasTakeBackCosts).toBe(false);
});
it("Exercise 2: 600 liters at ₱143 costs ₱66,000 and earns ₱19,800", () => {
  expect(calculateMonthlyOutcome(30_000, 60, 600, 143)).toEqual({ totalCost: 66_000, revenue: 85_800, profit: 19_800 });
});
it("MISSED_COSTS lists the deck's eight commonly missed costs", () => {
  expect(MISSED_COSTS.map((m) => m.name)).toEqual([
    "Your own time", "Lost containers", "Permits and taxes", "Payment fees",
    "Restocking trips", "Spills and waste", "Marketing", "Start-up costs",
  ]);
});
```

with this helper at the top of the file:

```ts
function line(o: Partial<CostLine>): CostLine {
  return { id: "t", name: "t", category: "overhead", behavior: "variable", amount: 0, ...o };
}
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm exec vitest run lib/calculations/__tests__/pricing-costs.test.ts`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement `lib/calculations/pricing-costs.ts`.** It must be pure: no React, no side effects.

- [ ] **Step 4: Run and confirm pass.**

- [ ] **Step 5: Commit**

```bash
git add lib/calculations/pricing-costs.ts lib/calculations/__tests__/pricing-costs.test.ts
git commit -m "feat(pricing): itemized cost lines with the full cost of reuse"
```

### Task 4: Cost builder on the Cost-Plus tab

**Files:**
- Create: `app/tools/pricing-calculator/components/cost-lines-editor.tsx`
- Modify: `app/tools/pricing-calculator/page.tsx`

**Interfaces:**
- Consumes: everything Task 3 produces; `calculateCostPlus`, `PricingBasis` from Task 1.
- Produces:
  - `export function CostLinesEditor(props: { lines: CostLine[]; onChange: (lines: CostLine[]) => void; isReuseModel: boolean; hasTakeBackCosts: boolean }): JSX.Element`
  - Page-level values that later tasks read: `costSummary: CostSummary`, `safeExpectedUnits: number`, `unitName: string`, `costPlusResult: PricingResult`.

- [ ] **Step 1: Build `CostLinesEditor`**

**Each line is one row:** `grid grid-cols-1 sm:grid-cols-12 gap-2 items-end`, with a `border-b border-rule pb-3` between rows. The fields:
1. Name: `Input`, `sm:col-span-3`, `aria-label="Cost name"`.
2. Category: shadcn `Select`, `sm:col-span-2`, options from `COST_CATEGORY_LABELS`.
3. Behavior: `Select`, `sm:col-span-3`, options from `COST_BEHAVIOR_LABELS`.
4. Amount: `CurrencyInput`, `sm:col-span-2`. Its label depends on behavior:
   - fixed: "₱ per month"
   - variable: "₱ per unit"
   - one-time: "₱ total"
   - per-use: "₱ per item"
5. Months or Uses: `IntegerInput`, `sm:col-span-1`, `min={1}`. Render only for one-time (`lifeMonths`, label "Months") or per-use (`uses`, label "Uses").
   - When switching to one-time, a missing `lifeMonths` defaults to 12.
   - When switching to per-use, a missing `uses` defaults to 10.
6. A `Checkbox` labeled "Grant pays this now" plus a `Trash2` ghost icon button with `aria-label="Remove cost"`. Together they take `sm:col-span-1`; stack them vertically if needed.

**Below the rows:**
- An outline "Add cost" button with a `Plus` icon. It appends `{ id, name: "", category: "overhead", behavior: "fixed", amount: 0 }`. Hide it at 30 lines.
- New ids come from a `useRef` counter: `` `line-${n}` ``.

**"Commonly missed costs" block:**
- A label in `font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground`.
- Then one `Button variant="outline" size="sm"` per `MISSED_COSTS` entry, text `+ {name}`.
- A button is disabled when a line with the same name already exists.
- Clicking appends that entry with `amount: 0` and a fresh id.

**Take-back warning:**
- When `isReuseModel && !hasTakeBackCosts`, render `<p className="text-sm text-warn">` with exactly:
  `No container, collection or cleaning costs yet. Linear businesses never pay these; reuse businesses always do.`
- The editor does not compute anything else. The page passes `hasTakeBackCosts` in.

- [ ] **Step 2: Replace the two cost inputs on the page**

**State and defaults:**
- Remove the `fixedCosts` and `variableCost` state, their touched/validation/sanitize lines, and their `hasErrors` terms.
- Add state:
  - `costLines` (default `REFILL_STATION_EXAMPLE`);
  - `unitName` (default `"liter"`);
  - `isReuseModel` (default `true`).
- Change defaults to the deck's practice case: `expectedUnits` 600, `targetPercent` 30, basis `"markup"`.

**Derived values:**
- `const safeCostLines = costLines.map(l => ({ ...l, amount: sanitizeFinancialAmount(l.amount), lifeMonths: l.lifeMonths === undefined ? undefined : sanitizePositiveInteger(l.lifeMonths), uses: l.uses === undefined ? undefined : sanitizePositiveInteger(l.uses) }))`.
- `const costSummary = summarizeCosts(safeCostLines)`.
- `calculateCostPlus({ fixedCosts: costSummary.fixedMonthly, variableCostPerUnit: costSummary.variablePerUnit, expectedUnits: safeExpectedUnits }, safeTargetPercent, pricingBasis)`.
- `const outcome = calculateMonthlyOutcome(costSummary.fixedMonthly, costSummary.variablePerUnit, safeExpectedUnits, costPlusResult.price)`.

**Card contents, in order:**
1. The basis toggle.
2. A 3-column row (`grid-cols-1 md:grid-cols-3`):
   - "Selling unit": `Input`, value `unitName`, placeholder "liter".
   - "Expected units a month": the existing IntegerInput.
   - The percent input.
3. A `Switch` labeled "My product is reused, refilled or taken back" bound to `isReuseModel`.
4. `<CostLinesEditor … />`.
5. A summary line: `Fixed ${formatPHP(costSummary.fixedMonthly)} a month · Variable ${formatPHPDetailed(costSummary.variablePerUnit)} per ${unitName}`.

**Results:** six cards in `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Keep Task 1's four cards, with labels changed:
  - "Price per Unit" → `` `Price per ${unitName || "unit"}` ``;
  - "Break-even Units" → "Break-even Volume", sublabel `` `${unitName || "unit"}s a month` ``. Move the contribution text into the Profit card's sublabel.
- Add "Total Monthly Cost": `formatPHP(outcome.totalCost)`.
- Add "Monthly Profit": `formatPHP(outcome.profit)`, `variant={outcome.profit < 0 ? "danger" : "success"}`, sublabel `` `at ${formatNumber(safeExpectedUnits)} ${unitName || "unit"}s` ``.

**Grant line:** when `costSummary.grantFixedMonthly > 0 || costSummary.grantVariablePerUnit > 0`, render `<p className="text-sm text-muted-foreground">` with:
`The grant pays ${formatPHP(grantFixedMonthly)} a month and ${formatPHPDetailed(grantVariablePerUnit)} per ${unitName} today. Your price already covers these, so it still works after the grant ends. While the grant pays, your monthly profit is ${formatPHP(outcome.profit + grantFixedMonthly + grantVariablePerUnit * safeExpectedUnits)}.`

**Tooltip:** set the Cost-Plus `InfoTooltip` to:
`Pre-loaded with the refill-station practice case from Kevin's CircleWorks talk: ₱30,000 fixed, ₱60 per liter, 600 liters, 30% markup → ₱143 per liter. Markup is profit ÷ cost; margin is profit ÷ price.`

**CardDescription:** `List every cost, including take-back: containers, collection and cleaning. Then add your markup or margin.`

**Reset:** `handleReset` restores all new state to these defaults.

**AI payload `costPlus`:** add `unitName, isReuseModel, costLines: safeCostLines.map(({ id, ...rest }) => rest), fixedMonthly, variablePerUnit, grantFixedMonthly, grantVariablePerUnit, totalMonthlyCost, monthlyProfit`. Remove `fixedCosts` / `variableCost`.

- [ ] **Step 3: Verify**

- Run `pnpm exec vitest run lib/calculations lib/__tests__`. Expected: all pass.
- Then tsc as before.
- Then `pnpm exec eslint app/tools/pricing-calculator`.
- Then check by reading the code that, with defaults, the page computes ₱110 / ₱143 / 362 / ₱66,000 / ₱19,800. Every one comes from tested functions, so name the function each card reads from.

- [ ] **Step 4: Commit**

```bash
git add app/tools/pricing-calculator
git commit -m "feat(pricing): build cost-plus from itemized costs, take-back and grant included"
```

---

## Phase C — benchmark and decide

### Task 5: Compare per measure, not per pack

**Files:**
- Modify: `lib/calculations/pricing.ts`
- Modify: `lib/calculations/__tests__/pricing.test.ts`
- Create: `app/tools/pricing-calculator/components/competitive-tab.tsx`
- Modify: `app/tools/pricing-calculator/page.tsx`

**Interfaces:**
- Consumes: `calculateCompetitivePosition` (existing).
- Produces:

```ts
export interface CompetitorOffer { id: string; name: string; price: number; size: number }
export interface PerMeasureRow {
  id: string;
  name: string;
  pricePerMeasure: number;     // price ÷ size
  differencePercent: number;   // (yourPerMeasure − theirs) ÷ theirs × 100; negative = you are cheaper
}
export function comparePerMeasure(
  offers: CompetitorOffer[], yourPrice: number, yourSize: number
): { yourPerMeasure: number; rows: PerMeasureRow[]; position: { min: number; max: number; average: number; median: number } };
```

- Offers with `size <= 0` or `price <= 0` are skipped, not divided.
- `yourSize <= 0` makes `yourPerMeasure` 0 and every `differencePercent` 0.
- `position` is `calculateCompetitivePosition` over the rows' `pricePerMeasure`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("comparePerMeasure — the deck's sachet benchmark", () => {
  const offers = [
    { id: "a", name: "Single-use pack, 100.5 ml", price: 31.2, size: 100.5 },
    { id: "b", name: "Refill hub, 30 ml", price: 4, size: 30 },
  ];
  it("₱143 per liter is ₱0.143 per ml", () => {
    expect(comparePerMeasure(offers, 143, 1000).yourPerMeasure).toBeCloseTo(0.143, 6);
  });
  it("beats the ₱0.31/ml pack and loses to the ₱0.13/ml refill", () => {
    const { rows } = comparePerMeasure(offers, 143, 1000);
    expect(rows[0].pricePerMeasure).toBeCloseTo(0.3104, 4);
    expect(rows[0].differencePercent).toBeCloseTo(-53.9, 1);
    expect(rows[1].pricePerMeasure).toBeCloseTo(0.1333, 4);
    expect(rows[1].differencePercent).toBeCloseTo(7.25, 2);
  });
  it("skips an offer with size 0 instead of dividing by it", () => {
    const { rows } = comparePerMeasure([...offers, { id: "c", name: "x", price: 5, size: 0 }], 143, 1000);
    expect(rows).toHaveLength(2);
  });
  it("your size of 0 gives zeros, not Infinity", () => {
    const r = comparePerMeasure(offers, 143, 0);
    expect(r.yourPerMeasure).toBe(0);
    expect(r.rows.every((row) => row.differencePercent === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run and confirm failure.**

- [ ] **Step 3: Implement `comparePerMeasure`. Run and confirm pass.**

- [ ] **Step 4: Build `CompetitiveTab` and swap it in**

**Props:**
`{ offers: CompetitorOffer[]; onOffersChange; measure: string; onMeasureChange; yourSize: number; onYourSizeChange; yourPrice: number; unitName: string }`

**Top row** (`grid-cols-1 md:grid-cols-3`):
- "Compare per": `Input`, default `"ml"`.
- `` `Your ${unitName} in ${measure}` ``: a plain `Input type="number" inputMode="decimal" min="0"`, default 1000. Not CurrencyInput, which has a ₱ prefix.
- "Your price": read-only text showing `formatPHP(yourPrice)`, with the small note `` `per ${unitName}` ``.

**Offer rows:** name `Input`, price `CurrencyInput`, size number `Input` with label `` `Size (${measure})` ``, and a remove button. "Add offer" appends a new row. The limit is 10, as today.

**Results table** (shadcn `Table`, wrapped in `overflow-x-auto`). Columns: Offer | `` `₱ per ${measure}` `` (`formatPHPDetailed`) | Verdict.
- The verdict is `` `You're ${Math.abs(d).toFixed(0)}% cheaper` `` in `text-good` when `d < 0`.
- Otherwise it is `` `You're ${d.toFixed(0)}% more expensive` `` in `text-warn`.
- The first row is "You" with `yourPerMeasure`.

**Under the table:**
- When any row has `d > 0`, render `<p className="text-sm text-muted-foreground">` with exactly:
  `Where you lose on price, win on a reason: a deposit back, points, quality, or convenience.`
- Then the existing four min/max/average/median cards, fed `position` and formatted with `formatPHPDetailed`. Their labels end in `` ` per ${measure}` ``.

**Page wiring:**
- Remove the `competitorPrices` state.
- Add `offers` (default: the two offers from Step 1's test, ids `"c-1"`, `"c-2"`), `measure` (`"ml"`) and `yourSize` (1000).
- Sanitize: `price` with `sanitizeFinancialAmount`; `size` and `yourSize` with `Math.max(0, Number.isFinite(x) ? x : 0)`.
- `yourPrice` is `costPlusResult.price` in this task. Task 6 replaces it.
- Reset restores the defaults.
- AI payload `competitive`: `{ measure, yourSize, yourPerMeasure, rows, ...position }`.
- CardDescription: `Compare per ml, not per pack. Enter what customers buy now, including the sachet you replace.`

- [ ] **Step 5: Verify** (vitest on `lib/calculations`, tsc, eslint on `app/tools/pricing-calculator lib/calculations/pricing.ts`).

- [ ] **Step 6: Commit**

```bash
git add lib/calculations/pricing.ts lib/calculations/__tests__/pricing.test.ts app/tools/pricing-calculator
git commit -m "feat(pricing): benchmark the sachet per ml, not per pack"
```

### Task 6: Pick your price, and share it

**Files:**
- Modify: `lib/calculations/pricing.ts`
- Modify: `lib/calculations/__tests__/pricing.test.ts`
- Create: `app/tools/pricing-calculator/components/price-decision.tsx`
- Modify: `app/tools/pricing-calculator/page.tsx`

**Interfaces:**
- Consumes: `costPlusResult`, `costSummary`, `comparePerMeasure(...).position`, `yourSize`, `suggestCharmPrices`, `calculateBreakeven` (existing).
- Produces:

```ts
export type PriceVerdict = "below-cost" | "in-range" | "above-market";
export interface PriceAnchor { label: string; price: number; isChosen: boolean }
export function buildPriceLadder(input: {
  unitCost: number; costPlusPrice: number; chosen: number;
  marketLow?: number; marketHigh?: number;  // already converted to the selling unit
}): { anchors: PriceAnchor[]; verdict: PriceVerdict };

export const PRICING_STRATEGIES: readonly ["Cost-Plus", "Value-Based", "Penetration", "Competitive", "Bundle", "Psychological"];
export function formatShareLine(input: {
  startup: string; product: string; price: number; unitName: string;
  strategy: string; breakeven: number;
}): string;
```

- **Ladder anchors**, sorted ascending by price (stable; on ties the chosen price goes last):
  - "Unit cost (floor)", "Cost-plus price", "Your price" (`isChosen: true`);
  - plus "Lowest alternative" and "Highest alternative" when given.
- **Verdict:**
  - `chosen < unitCost` → `"below-cost"`;
  - else `marketHigh !== undefined && chosen > marketHigh` → `"above-market"`;
  - else `"in-range"`.
- **Share line:**
  - Format: `` `${startup || "Startup"} · ${product || "Product"} · ${formatPHP(price)} per ${unitName || "unit"} · ${strategy} · Break-even ${breakeven === Infinity ? "N/A" : formatNumber(breakeven)}` ``.
  - Trim `startup` and `product` before use.
  - Import `formatPHP` and `formatNumber` from `@/lib/utils`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("buildPriceLadder", () => {
  const base = { unitCost: 110, costPlusPrice: 143, marketLow: 133.33, marketHigh: 310.45 };
  it("₱143 sits between the floor and the market high", () => {
    const r = buildPriceLadder({ ...base, chosen: 143 });
    expect(r.verdict).toBe("in-range");
    expect(r.anchors.map((a) => a.label)).toEqual([
      "Unit cost (floor)", "Lowest alternative", "Cost-plus price", "Your price", "Highest alternative",
    ]);
  });
  it("below unit cost is below-cost", () => expect(buildPriceLadder({ ...base, chosen: 100 }).verdict).toBe("below-cost"));
  it("above every alternative is above-market", () => expect(buildPriceLadder({ ...base, chosen: 400 }).verdict).toBe("above-market"));
  it("without market numbers nothing is above-market", () => {
    expect(buildPriceLadder({ unitCost: 110, costPlusPrice: 143, chosen: 9_999 }).verdict).toBe("in-range");
  });
});

describe("formatShareLine", () => {
  it("uses the deck's chat format", () => {
    expect(formatShareLine({ startup: "Ikot", product: "Dish soap refill", price: 143, unitName: "liter", strategy: "Cost-Plus", breakeven: 362 }))
      .toBe("Ikot · Dish soap refill · ₱143 per liter · Cost-Plus · Break-even 362");
  });
  it("fills blanks and shows N/A for an impossible break-even", () => {
    expect(formatShareLine({ startup: " ", product: "", price: 50, unitName: "", strategy: "Penetration", breakeven: Infinity }))
      .toBe("Startup · Product · ₱50 per unit · Penetration · Break-even N/A");
  });
});
```

Note on the `formatPHP` output: if `Intl` on this Node renders `₱143` as `PHP 143` or with a non-breaking space, do NOT change the expected string. Stop and report it.

- [ ] **Step 2: Run and confirm failure. Step 3: Implement. Step 4: Run and confirm pass.**

- [ ] **Step 5: Build `PriceDecision`**

It is a `Card` titled "Pick your price", placed on the page between `</Tabs>` and `AiInsightsPanel`. Its description, exactly:
`Somewhere between your cost floor and what customers pay now. Then test it in your pilot.`

**Props:**
`{ ladder: ReturnType<typeof buildPriceLadder>; chosenInput: number; onChosenChange: (n: number) => void; followsCostPlus: boolean; onUseCostPlus: () => void; charm: { down: number; up: number } | null; unitName: string; startup: string; onStartupChange; product: string; onProductChange; strategy: string; onStrategyChange; shareLine: string }`

**Contents, in order:**
1. `CurrencyInput` `` `Your price per ${unitName || "unit"}` ``.
   - When `!followsCostPlus`, show a ghost button "Use my cost-plus price".
   - When `charm` is not null, show a small line: `` `Charm options: ${formatPHP(charm.down)} or ${formatPHP(charm.up)}` ``.
2. **The ladder:** an `<ol>`, one `<li>` per anchor, `flex justify-between border-b border-rule py-1.5 text-sm tabular`. The chosen row is `font-semibold`.
3. **The verdict line:**
   - below-cost, `text-bad`: `Below your unit cost. Every sale loses money.`
   - in-range, `text-good`: `Covers your full cost and stays within what customers pay now.`
   - above-market, `text-warn`: `Above every alternative. You need a clear reason: proof, quality, convenience or a deposit back.`
4. **The share row:** `grid-cols-1 md:grid-cols-3`, with Startup `Input`, Product `Input` and a Strategy `Select` over `PRICING_STRATEGIES`.
5. **The share line itself:** in a `<code className="block break-words rounded border border-rule bg-muted p-3 text-sm">`.
   - Next to it, an outline button "Copy for the chat" (lucide `Copy` icon). It runs `navigator.clipboard.writeText(shareLine)`.
   - The label shows "Copied" for 2 s on success. Ignore a rejected promise; the text stays selectable.

- [ ] **Step 6: Wire the page**

**State:**
- `chosenPrice: number | null` (null follows the cost-plus price);
- `startupName` (`""`), `productName` (`""`), `shareStrategy` (`"Cost-Plus"`).

**Derived:**
- `const effectivePrice = sanitizeFinancialAmount(chosenPrice ?? Math.round(costPlusResult.price));`
- Pass `effectivePrice` to `CompetitiveTab` as `yourPrice`, replacing Task 5's `costPlusResult.price`.
- Ladder:
  - `unitCost: costPlusResult.unitCost`, `costPlusPrice: costPlusResult.price`, `chosen: effectivePrice`.
  - When the comparison has at least one row, also pass `marketLow: position.min * yourSize` and `marketHigh: position.max * yourSize`.
- `const chosenBreakeven = calculateBreakeven(costSummary.fixedMonthly, effectivePrice, costSummary.variablePerUnit);`
- `shareLine = formatShareLine({ startup: startupName, product: productName, price: effectivePrice, unitName, strategy: shareStrategy, breakeven: chosenBreakeven })`.

**Reset and AI payload:**
- Reset clears all four new states.
- AI payload adds `decision: { chosenPrice: effectivePrice, verdict: ladder.verdict, breakeven: chosenBreakeven, strategy: shareStrategy }`. Do NOT send the startup or product names.

- [ ] **Step 7: Verify** (vitest `lib/calculations`, tsc, eslint `app/tools/pricing-calculator lib/calculations/pricing.ts`).

- [ ] **Step 8: Commit**

```bash
git add lib/calculations/pricing.ts lib/calculations/__tests__/pricing.test.ts app/tools/pricing-calculator
git commit -m "feat(pricing): pick a price between the cost floor and the market, and share it"
```

---

## Phase D — value and testing

### Task 7: Value from savings, and test two prices

**Files:**
- Modify: `lib/calculations/pricing.ts`
- Modify: `lib/calculations/__tests__/pricing.test.ts`
- Create: `app/tools/pricing-calculator/components/two-price-test.tsx`
- Modify: `app/tools/pricing-calculator/page.tsx` (Value-Based tab, new card)

**Interfaces:**
- Produces:

```ts
export interface SavingsItem { id: string; name: string; amount: number }
export function sumSavings(items: SavingsItem[]): number;  // negatives count as 0
export interface PricePoint { price: number; volume: number }
export function compareTwoPrices(fixed: number, variable: number, a: PricePoint, b: PricePoint): {
  profitA: number; profitB: number; difference: number;  // profitB − profitA
  volumeBToMatchA: number;  // Math.ceil((profitA + fixed) ÷ (b.price − variable)); Infinity when b.price ≤ variable
};
```

- [ ] **Step 1: Write the failing tests**

```ts
describe("compareTwoPrices — slide 3", () => {
  it("+₱5 per liter adds ₱3,000 a month", () => {
    const r = compareTwoPrices(30_000, 60, { price: 143, volume: 600 }, { price: 148, volume: 600 });
    expect(r.profitA).toBe(19_800);
    expect(r.difference).toBe(3_000);
  });
  it("selling 5% more liters at ₱143 adds only ₱2,490", () => {
    expect(compareTwoPrices(30_000, 60, { price: 143, volume: 600 }, { price: 143, volume: 630 }).difference).toBe(2_490);
  });
  it("at ₱148 you need 566 liters to match ₱143 × 600", () => {
    expect(compareTwoPrices(30_000, 60, { price: 143, volume: 600 }, { price: 148, volume: 0 }).volumeBToMatchA).toBe(566);
  });
  it("a price at or below variable cost can never match", () => {
    expect(compareTwoPrices(30_000, 60, { price: 143, volume: 600 }, { price: 60, volume: 600 }).volumeBToMatchA).toBe(Infinity);
  });
});

describe("sumSavings", () => {
  it("adds the customer's monthly savings", () => {
    expect(sumSavings([{ id: "1", name: "a", amount: 6_000 }, { id: "2", name: "b", amount: 2_500 }, { id: "3", name: "c", amount: 1_500 }])).toBe(10_000);
  });
  it("ignores negative entries", () => expect(sumSavings([{ id: "1", name: "a", amount: -50 }])).toBe(0));
});
```

(19,800 + 30,000) ÷ (148 − 60) = 565.9 → 566.

- [ ] **Step 2: Fail. Step 3: Implement. Step 4: Pass.**

- [ ] **Step 5: Value-Based tab: build value from savings**

**Switch and state:**
- Add a `Switch` "Build it from what the customer saves".
- State: `useSavings` (default `false`) and `savingsItems`.
- Default items, a B2B refill example like Sangkap Hub:
  - `Fewer stock-outs (lost sales avoided)` 6000;
  - `No emergency purchases` 2500;
  - `Less staff time reordering` 1500.

**When on:**
- Show editable rows (name `Input` + `CurrencyInput` + remove), an "Add saving" button (max 10), and the total.
- `perceivedValue` used everywhere on this tab becomes `sumSavings(safe items)`.
- The "Customer Perceived Value" input is hidden.

**When off:** the tab behaves as today.

**Results:**
- Add a fourth card, "Customer ROI": `` `${(value / price).toFixed(1)}×` `` when price > 0, else "—". Sublabel "Value for every ₱1 they pay".
- Fix while here: the existing cards use raw `perceivedValue`. Switch them to the safe value.
- Change the result grid to `md:grid-cols-4`.

- [ ] **Step 6: `TwoPriceTest` card**

- Place it under `PriceDecision`. Title "Test two prices", description exactly: `Try two price points in your pilot before you settle on one.`
- Inputs, in two columns "Price A" / "Price B": each has a price `CurrencyInput` and a volume `IntegerInput` (`allowZero`).
- Defaults: A = (`effectivePrice`, `safeExpectedUnits`); B = (`effectivePrice + 5`, `safeExpectedUnits`).
  - Use state `twoPriceA`/`twoPriceB` of type `PricePoint | null`, where null follows those defaults. Editing a field sets the full object.
  - Reset sets both to null.
- Results (3 cards):
  - "Profit at A";
  - "Profit at B", with sublabel the signed difference: `` `${difference >= 0 ? "+" : "−"}${formatPHP(Math.abs(difference))} vs A` ``;
  - "Volume B needs to match A": `formatNumber(volumeBToMatchA)` or "N/A".
- Fixed and variable come from `costSummary`.
- AI payload adds `valueBased.useSavings`, `valueBased.savingsItems` (without ids), `twoPriceTest: { a, b, ...result }`.

- [ ] **Step 7: Verify** (vitest `lib/calculations lib/__tests__`, tsc, eslint on touched files).

- [ ] **Step 8: Commit**

```bash
git add lib/calculations/pricing.ts lib/calculations/__tests__/pricing.test.ts app/tools/pricing-calculator
git commit -m "feat(pricing): value built from customer savings, and a two-price test"
```

### Task 8: Teach the AI the circular curriculum

**Files:**
- Modify: `lib/ai/prompts.ts` (`"pricing-calculator"` only)

- [ ] **Step 1: Update the prompt.**
  - Set the CONTEXT line to: `CONTEXT: The user priced a product with itemized costs (including reuse costs such as containers, collection and cleaning), compared it per measure against what customers buy now (often a sachet), picked a price, and may have tested two price points.`
  - Append these bullets to Kevin's curriculum notes, verbatim:

```
- The full cost of reuse: containers (cost ÷ uses), collection (pickups, returns) and cleaning (washing, testing). Linear businesses never pay these; leaving them out loses money every cycle.
- Compare per ml, not per pack. Where the refill loses on price, it must win on a reason: a deposit back, points, quality, or convenience.
- Price for life after the grant. If the payload shows grant-funded costs, check that the price covers them anyway.
- Lost containers are a cost; a deposit protects against them.
- A 1% price improvement lifts operating profit about 11% (Marn & Rosiello, HBR 1992), more than any cost or volume lever.
- Test, don't guess: try two price points in the pilot.
```

  - Keep the closing instruction line. Add one sentence to it: `If the decision verdict is "below-cost" or "above-market", say so plainly first.`

- [ ] **Step 2: Verify**

- Run `pnpm exec vitest run lib/__tests__/philippine-english.test.ts`. Expected: PASS.
- Then tsc.
- Then the full `pnpm exec vitest run`. Expected: all pass. Report the count.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/prompts.ts
git commit -m "feat(pricing): teach the AI explainer the circular pricing curriculum"
```

---

## Reviewer checklist (Claude, after Hermes)

- `pnpm build` passes, all 33 routes.
- In the browser at desktop and 375px width, the defaults show:
  - ₱110 / ₱143 / 362 / ₱66,000 / ₱19,800;
  - ₱0.14 per ml;
  - in-range verdict;
  - +₱3,000 on the two-price card.
- Markup→margin toggle on 150% keeps the price.
- ₱5 in the Psychological tab shows "None", not −₱1.
- Light and dark themes.

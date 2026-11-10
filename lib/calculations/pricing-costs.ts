export type CostCategory = "materials" | "labor" | "overhead" | "containers" | "collection" | "cleaning";
export type CostBehavior = "fixed" | "variable" | "one-time" | "per-use";

export interface CostLine {
  id: string;
  name: string;
  category: CostCategory;
  behavior: CostBehavior;
  amount: number; // fixed: ₱/month · variable: ₱/unit · one-time: total ₱ · per-use: ₱ per item
  lifeMonths?: number; // one-time only; values < 1 or missing are treated as 1
  uses?: number; // per-use only; values < 1 or missing are treated as 1
  grantFunded?: boolean; // "the grant pays this now"
}

export interface CostSummary {
  fixedMonthly: number;
  variablePerUnit: number;
  grantFixedMonthly: number; // the part of fixedMonthly from grantFunded lines
  grantVariablePerUnit: number; // the part of variablePerUnit from grantFunded lines
  byCategory: Record<CostCategory, { fixedMonthly: number; variablePerUnit: number }>;
  hasTakeBackCosts: boolean; // any containers/collection/cleaning line with amount > 0
}

export interface MonthlyOutcome { totalCost: number; revenue: number; profit: number }

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  materials: "Materials",
  labor: "Labor",
  overhead: "Overhead",
  containers: "Containers",
  collection: "Collection",
  cleaning: "Cleaning",
};

export const COST_BEHAVIOR_LABELS: Record<CostBehavior, string> = {
  fixed: "Fixed, per month",
  variable: "Variable, per unit",
  "one-time": "One-time, spread over months",
  "per-use": "Reusable item, cost ÷ uses",
};

const TAKE_BACK_CATEGORIES: readonly CostCategory[] = ["containers", "collection", "cleaning"];

function emptyCategoryTotals(): Record<CostCategory, { fixedMonthly: number; variablePerUnit: number }> {
  return {
    materials: { fixedMonthly: 0, variablePerUnit: 0 },
    labor: { fixedMonthly: 0, variablePerUnit: 0 },
    overhead: { fixedMonthly: 0, variablePerUnit: 0 },
    containers: { fixedMonthly: 0, variablePerUnit: 0 },
    collection: { fixedMonthly: 0, variablePerUnit: 0 },
    cleaning: { fixedMonthly: 0, variablePerUnit: 0 },
  };
}

export function summarizeCosts(lines: CostLine[]): CostSummary {
  let fixedMonthly = 0;
  let variablePerUnit = 0;
  let grantFixedMonthly = 0;
  let grantVariablePerUnit = 0;
  const byCategory = emptyCategoryTotals();

  for (const line of lines) {
    let fixedPart = 0;
    let variablePart = 0;

    if (line.behavior === "fixed") {
      fixedPart = line.amount;
    } else if (line.behavior === "one-time") {
      fixedPart = line.amount / Math.max(1, line.lifeMonths ?? 1);
    } else if (line.behavior === "variable") {
      variablePart = line.amount;
    } else if (line.behavior === "per-use") {
      variablePart = line.amount / Math.max(1, line.uses ?? 1);
    }

    fixedMonthly += fixedPart;
    variablePerUnit += variablePart;
    byCategory[line.category].fixedMonthly += fixedPart;
    byCategory[line.category].variablePerUnit += variablePart;

    if (line.grantFunded) {
      grantFixedMonthly += fixedPart;
      grantVariablePerUnit += variablePart;
    }
  }

  const hasTakeBackCosts = lines.some(
    (line) => TAKE_BACK_CATEGORIES.includes(line.category) && line.amount > 0
  );

  return {
    fixedMonthly,
    variablePerUnit,
    grantFixedMonthly,
    grantVariablePerUnit,
    byCategory,
    hasTakeBackCosts,
  };
}

export function calculateMonthlyOutcome(
  fixedMonthly: number,
  variablePerUnit: number,
  units: number,
  price: number
): MonthlyOutcome {
  const totalCost = fixedMonthly + variablePerUnit * units;
  const revenue = price * units;
  return { totalCost, revenue, profit: revenue - totalCost };
}

export const REFILL_STATION_EXAMPLE: CostLine[] = [
  { id: "ex-1", name: "Stall rent", category: "overhead", behavior: "fixed", amount: 6000 },
  { id: "ex-2", name: "Refill attendant salary", category: "labor", behavior: "fixed", amount: 18000 },
  { id: "ex-3", name: "Electricity", category: "overhead", behavior: "fixed", amount: 2500 },
  { id: "ex-4", name: "Tracking app subscription", category: "overhead", behavior: "fixed", amount: 1500 },
  { id: "ex-5", name: "Dispenser", category: "overhead", behavior: "one-time", amount: 48000, lifeMonths: 24 },
  { id: "ex-6", name: "Bulk dish soap", category: "materials", behavior: "variable", amount: 45 },
  { id: "ex-7", name: "Reusable 1-liter bottle", category: "containers", behavior: "per-use", amount: 50, uses: 10 },
  { id: "ex-8", name: "Bottle washing supplies", category: "cleaning", behavior: "variable", amount: 4 },
  { id: "ex-9", name: "Pickup rider", category: "collection", behavior: "variable", amount: 6 },
];

export const MISSED_COSTS: Omit<CostLine, "id" | "amount">[] = [
  { name: "Your own time", category: "labor", behavior: "fixed" },
  { name: "Lost containers", category: "containers", behavior: "variable" },
  { name: "Permits and taxes", category: "overhead", behavior: "fixed" },
  { name: "Payment fees", category: "overhead", behavior: "variable" },
  { name: "Restocking trips", category: "overhead", behavior: "variable" },
  { name: "Spills and waste", category: "materials", behavior: "variable" },
  { name: "Marketing", category: "overhead", behavior: "fixed" },
  { name: "Start-up costs", category: "overhead", behavior: "one-time", lifeMonths: 24 },
];

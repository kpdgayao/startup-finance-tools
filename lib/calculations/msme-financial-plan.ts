export type EntityType = "sole-prop" | "cooperative" | "corporation";
export type RevenueModel = "lump-sum" | "units-x-price";
export type ScenarioKey = "conservative" | "base" | "optimistic";

export interface ScenarioMultipliers {
  revenueGrowthMultiplier: number;
  cogsAddend: number;
  opexGrowthAddend: number;
}

export interface OpExLines {
  rent: number;
  utilities: number;
  salaries: number;
  marketing: number;
  transportation: number;
  supplies: number;
  insurance: number;
  other: number;
}

export interface MsmeFinancialPlanInputs {
  entityType: EntityType;
  startingCapital: number;
  horizonYears: number;

  revenueModel: RevenueModel;
  startingAnnualRevenue: number;
  annualGrowthRate: number;
  startingUnits: number;
  unitPrice: number;
  unitGrowthRate: number;
  priceGrowthRate: number;

  cogsPercent: number;
  opex: OpExLines;
  opexAnnualGrowth: number;

  daysToCollect: number;
  daysToPay: number;
  inventoryDays: number;

  capExSchedule: number[];
  usefulLifeYears: number;

  loanEnabled: boolean;
  loanPrincipal: number;
  loanInterestRate: number;
  loanTermYears: number;
  loanGracePeriodYears: number;

  taxRate: number;
  distributionPercent: number;

  scenarios: Record<ScenarioKey, ScenarioMultipliers>;
}

export interface OpExBreakdown extends OpExLines {
  total: number;
}

export interface AnnualRow {
  year: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  opex: OpExBreakdown;
  ebitda: number;
  depreciation: number;
  ebit: number;
  interestExpense: number;
  preTaxIncome: number;
  tax: number;
  netIncome: number;
  netMarginPercent: number;
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
  capital: number;
  retainedEarnings: number;
  totalEquity: number;
  operatingCF: number;
  investingCF: number;
  financingCF: number;
  netCashFlow: number;
  distributions: number;
}

export interface SCERow {
  year: number;
  beginningCapital: number;
  contributions: number;
  netIncome: number;
  distributions: number;
  endingCapital: number;
}

export interface BalanceSheetSeed {
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
  capital: number;
  retainedEarnings: number;
  totalEquity: number;
}

export interface ScenarioSummary {
  horizonRevenue: number;
  avgGrossMargin: number;
  finalYearEbit: number;
  finalYearNetIncome: number;
  finalYearCash: number;
  cumulativeNetIncome: number;
  breakEvenYear: number | null;
}

export interface ScenarioOutput {
  annual: AnnualRow[];
  seed: BalanceSheetSeed;
  sce: SCERow[];
  summary: ScenarioSummary;
}

export interface MsmeFinancialPlanResult {
  scenarios: Record<ScenarioKey, ScenarioOutput>;
}

export const DEFAULT_SCENARIOS: Record<ScenarioKey, ScenarioMultipliers> = {
  conservative: { revenueGrowthMultiplier: 0.7, cogsAddend: 5, opexGrowthAddend: 3 },
  base: { revenueGrowthMultiplier: 1.0, cogsAddend: 0, opexGrowthAddend: 0 },
  optimistic: { revenueGrowthMultiplier: 1.3, cogsAddend: -3, opexGrowthAddend: -2 },
};

export const SCENARIO_KEYS: ScenarioKey[] = ["conservative", "base", "optimistic"];

export const OPEX_LINES: { key: keyof OpExLines; label: string }[] = [
  { key: "rent", label: "Rent" },
  { key: "utilities", label: "Utilities" },
  { key: "salaries", label: "Salaries & Wages" },
  { key: "marketing", label: "Marketing" },
  { key: "transportation", label: "Transportation" },
  { key: "supplies", label: "Supplies" },
  { key: "insurance", label: "Insurance" },
  { key: "other", label: "Other" },
];

function computeRevenue(inputs: MsmeFinancialPlanInputs, year: number, mult: ScenarioMultipliers): number {
  const i = year - 1;
  if (inputs.revenueModel === "lump-sum") {
    const adjGrowth = (inputs.annualGrowthRate * mult.revenueGrowthMultiplier) / 100;
    return inputs.startingAnnualRevenue * Math.pow(1 + adjGrowth, i);
  }
  const adjUnitGrowth = (inputs.unitGrowthRate * mult.revenueGrowthMultiplier) / 100;
  const priceGrowth = inputs.priceGrowthRate / 100;
  const units = inputs.startingUnits * Math.pow(1 + adjUnitGrowth, i);
  const price = inputs.unitPrice * Math.pow(1 + priceGrowth, i);
  return units * price;
}

function computeOpExLine(value: number, year: number, growthRate: number): number {
  const i = year - 1;
  return value * Math.pow(1 + growthRate / 100, i);
}

function buildSingleScenario(
  inputs: MsmeFinancialPlanInputs,
  mult: ScenarioMultipliers
): ScenarioOutput {
  const N = inputs.horizonYears;
  const annual: AnnualRow[] = [];
  const sce: SCERow[] = [];

  const initialLoan = inputs.loanEnabled ? inputs.loanPrincipal : 0;
  let cash = inputs.startingCapital + initialLoan;
  let cumulativeCapEx = 0;
  let accumulatedDepreciation = 0;
  let loanBalance = initialLoan;
  const capital = inputs.startingCapital;
  let retainedEarnings = 0;
  let runningEquity = inputs.startingCapital;
  let prevAR = 0;
  let prevAP = 0;
  let prevInventory = 0;
  let breakEvenYear: number | null = null;
  let cumulativeNetIncome = 0;

  const seed: BalanceSheetSeed = {
    cash,
    accountsReceivable: 0,
    inventory: 0,
    cumulativeCapEx: 0,
    accumulatedDepreciation: 0,
    netPPE: 0,
    totalAssets: cash,
    accountsPayable: 0,
    loanBalance,
    totalLiabilities: loanBalance,
    capital,
    retainedEarnings: 0,
    totalEquity: capital,
  };
  assertBalanceSheet(seed.totalAssets, seed.totalLiabilities, seed.totalEquity, "seed");

  const opexGrowth = inputs.opexAnnualGrowth + mult.opexGrowthAddend;
  const cogsRate = (inputs.cogsPercent + mult.cogsAddend) / 100;

  const principalPaymentYears = Math.max(1, inputs.loanTermYears - inputs.loanGracePeriodYears);
  const annualPrincipalPayment = inputs.loanEnabled ? inputs.loanPrincipal / principalPaymentYears : 0;

  for (let year = 1; year <= N; year++) {
    const revenue = computeRevenue(inputs, year, mult);
    const cogs = revenue * cogsRate;
    const grossProfit = revenue - cogs;
    const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const opexLines: OpExLines = {
      rent: computeOpExLine(inputs.opex.rent, year, opexGrowth),
      utilities: computeOpExLine(inputs.opex.utilities, year, opexGrowth),
      salaries: computeOpExLine(inputs.opex.salaries, year, opexGrowth),
      marketing: computeOpExLine(inputs.opex.marketing, year, opexGrowth),
      transportation: computeOpExLine(inputs.opex.transportation, year, opexGrowth),
      supplies: computeOpExLine(inputs.opex.supplies, year, opexGrowth),
      insurance: computeOpExLine(inputs.opex.insurance, year, opexGrowth),
      other: computeOpExLine(inputs.opex.other, year, opexGrowth),
    };
    const opexTotal =
      opexLines.rent +
      opexLines.utilities +
      opexLines.salaries +
      opexLines.marketing +
      opexLines.transportation +
      opexLines.supplies +
      opexLines.insurance +
      opexLines.other;

    const ebitda = grossProfit - opexTotal;

    const capExThisYear = inputs.capExSchedule[year - 1] ?? 0;
    cumulativeCapEx += capExThisYear;

    const undepreciatedBalance = Math.max(0, cumulativeCapEx - accumulatedDepreciation);
    const straightLineRate =
      inputs.usefulLifeYears > 0 ? cumulativeCapEx / inputs.usefulLifeYears : 0;
    const depreciation = Math.min(straightLineRate, undepreciatedBalance);
    accumulatedDepreciation += depreciation;
    const netPPE = cumulativeCapEx - accumulatedDepreciation;

    const ebit = ebitda - depreciation;

    const openingLoanBalance = loanBalance;
    const interestExpense = openingLoanBalance * (inputs.loanInterestRate / 100);

    const preTaxIncome = ebit - interestExpense;
    const tax = preTaxIncome > 0 ? preTaxIncome * (inputs.taxRate / 100) : 0;
    const netIncome = preTaxIncome - tax;
    const netMarginPercent = revenue > 0 ? (netIncome / revenue) * 100 : 0;

    const principalPayment =
      inputs.loanEnabled && year > inputs.loanGracePeriodYears && loanBalance > 0
        ? Math.min(annualPrincipalPayment, loanBalance)
        : 0;
    loanBalance = Math.max(0, loanBalance - principalPayment);

    const distributions = netIncome > 0 ? netIncome * (inputs.distributionPercent / 100) : 0;

    const accountsReceivable = revenue * (inputs.daysToCollect / 365);
    const accountsPayable = (cogs + opexTotal) * (inputs.daysToPay / 365);
    const inventory = cogs * (inputs.inventoryDays / 365);

    const deltaAR = accountsReceivable - prevAR;
    const deltaAP = accountsPayable - prevAP;
    const deltaInv = inventory - prevInventory;

    const operatingCF = netIncome + depreciation - deltaAR + deltaAP - deltaInv;
    const investingCF = -capExThisYear;
    const financingCF = -principalPayment - distributions;
    const netCashFlow = operatingCF + investingCF + financingCF;

    cash += netCashFlow;
    retainedEarnings += netIncome - distributions;
    cumulativeNetIncome += netIncome;

    if (breakEvenYear === null && netIncome >= 0) {
      breakEvenYear = year;
    }

    const totalAssets = cash + accountsReceivable + inventory + netPPE;
    const totalLiabilities = accountsPayable + loanBalance;
    const totalEquity = capital + retainedEarnings;

    assertBalanceSheet(totalAssets, totalLiabilities, totalEquity, `year ${year}`);

    annual.push({
      year,
      revenue,
      cogs,
      grossProfit,
      grossMarginPercent,
      opex: { ...opexLines, total: opexTotal },
      ebitda,
      depreciation,
      ebit,
      interestExpense,
      preTaxIncome,
      tax,
      netIncome,
      netMarginPercent,
      cash,
      accountsReceivable,
      inventory,
      cumulativeCapEx,
      accumulatedDepreciation,
      netPPE,
      totalAssets,
      accountsPayable,
      loanBalance,
      totalLiabilities,
      capital,
      retainedEarnings,
      totalEquity,
      operatingCF,
      investingCF,
      financingCF,
      netCashFlow,
      distributions,
    });

    const beginningCapital = runningEquity;
    const endingCapital = beginningCapital + netIncome - distributions;
    sce.push({
      year,
      beginningCapital,
      contributions: 0,
      netIncome,
      distributions,
      endingCapital,
    });
    runningEquity = endingCapital;

    prevAR = accountsReceivable;
    prevAP = accountsPayable;
    prevInventory = inventory;
  }

  const horizonRevenue = annual.reduce((s, r) => s + r.revenue, 0);
  const avgGrossMargin =
    annual.reduce((s, r) => s + r.grossMarginPercent, 0) / annual.length;
  const finalYear = annual[annual.length - 1];

  const summary: ScenarioSummary = {
    horizonRevenue,
    avgGrossMargin,
    finalYearEbit: finalYear.ebit,
    finalYearNetIncome: finalYear.netIncome,
    finalYearCash: finalYear.cash,
    cumulativeNetIncome,
    breakEvenYear,
  };

  return { annual, seed, sce, summary };
}

function assertBalanceSheet(
  assets: number,
  liabilities: number,
  equity: number,
  context: string
): void {
  const diff = Math.abs(assets - (liabilities + equity));
  if (diff > 1) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        `MSME plan balance sheet mismatch at ${context}: A=${assets.toFixed(2)} L+E=${(liabilities + equity).toFixed(2)} diff=${diff.toFixed(2)}`
      );
    }
  }
}

export function buildMsmeFinancialPlan(
  inputs: MsmeFinancialPlanInputs
): MsmeFinancialPlanResult {
  const scenarios = SCENARIO_KEYS.reduce(
    (acc, key) => {
      acc[key] = buildSingleScenario(inputs, inputs.scenarios[key]);
      return acc;
    },
    {} as Record<ScenarioKey, ScenarioOutput>
  );
  return { scenarios };
}

export function entityCapitalLabel(entityType: EntityType): string {
  switch (entityType) {
    case "sole-prop":
      return "Owner's Capital";
    case "cooperative":
      return "Members' Share Capital";
    case "corporation":
      return "Paid-up Capital";
  }
}

export function entityDistributionLabel(entityType: EntityType): string {
  switch (entityType) {
    case "sole-prop":
      return "Drawings";
    case "cooperative":
      return "Patronage Distributions";
    case "corporation":
      return "Dividends";
  }
}

function fmt(n: number): string {
  return n.toFixed(2);
}

export function exportMsmePlanCSV(
  result: MsmeFinancialPlanResult,
  inputs: MsmeFinancialPlanInputs
): string {
  const date = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const N = inputs.horizonYears;
  const yearHeaders = Array.from({ length: N }, (_, i) => `Year ${i + 1}`).join(",");
  const lines: string[] = [
    `MSME ${N}-Year Financial Plan — Startup Finance Toolkit`,
    `Generated on ${date}`,
    `Entity Type: ${inputs.entityType}`,
    "",
  ];

  // Assumptions
  lines.push("ASSUMPTIONS");
  lines.push(`Starting Capital,${fmt(inputs.startingCapital)}`);
  lines.push(`Revenue Model,${inputs.revenueModel}`);
  if (inputs.revenueModel === "lump-sum") {
    lines.push(`Starting Annual Revenue,${fmt(inputs.startingAnnualRevenue)}`);
    lines.push(`Annual Growth %,${fmt(inputs.annualGrowthRate)}`);
  } else {
    lines.push(`Starting Units,${fmt(inputs.startingUnits)}`);
    lines.push(`Unit Price,${fmt(inputs.unitPrice)}`);
    lines.push(`Unit Growth %,${fmt(inputs.unitGrowthRate)}`);
    lines.push(`Price Growth %,${fmt(inputs.priceGrowthRate)}`);
  }
  lines.push(`COGS %,${fmt(inputs.cogsPercent)}`);
  lines.push(`OpEx Annual Growth %,${fmt(inputs.opexAnnualGrowth)}`);
  lines.push(`Days to Collect,${inputs.daysToCollect}`);
  lines.push(`Days to Pay,${inputs.daysToPay}`);
  lines.push(`Inventory Days,${inputs.inventoryDays}`);
  lines.push(`Useful Life (yrs),${inputs.usefulLifeYears}`);
  if (inputs.loanEnabled) {
    lines.push(`Loan Principal,${fmt(inputs.loanPrincipal)}`);
    lines.push(`Loan Rate %,${fmt(inputs.loanInterestRate)}`);
    lines.push(`Loan Term (yrs),${inputs.loanTermYears}`);
    lines.push(`Loan Grace (yrs),${inputs.loanGracePeriodYears}`);
  }
  lines.push(`Tax Rate %,${fmt(inputs.taxRate)}`);
  lines.push(`Distribution %,${fmt(inputs.distributionPercent)}`);
  lines.push("");

  for (const key of SCENARIO_KEYS) {
    const out = result.scenarios[key];
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    lines.push(`=== ${label.toUpperCase()} SCENARIO ===`);
    lines.push("");

    lines.push(`PROFIT & LOSS,${yearHeaders}`);
    lines.push(`Revenue,${out.annual.map((r) => fmt(r.revenue)).join(",")}`);
    lines.push(`COGS,${out.annual.map((r) => fmt(r.cogs)).join(",")}`);
    lines.push(`Gross Profit,${out.annual.map((r) => fmt(r.grossProfit)).join(",")}`);
    lines.push(`Gross Margin %,${out.annual.map((r) => fmt(r.grossMarginPercent)).join(",")}`);
    for (const line of OPEX_LINES) {
      lines.push(`${line.label},${out.annual.map((r) => fmt(r.opex[line.key])).join(",")}`);
    }
    lines.push(`Total Operating Expenses,${out.annual.map((r) => fmt(r.opex.total)).join(",")}`);
    lines.push(`EBITDA,${out.annual.map((r) => fmt(r.ebitda)).join(",")}`);
    lines.push(`Depreciation,${out.annual.map((r) => fmt(r.depreciation)).join(",")}`);
    lines.push(`EBIT,${out.annual.map((r) => fmt(r.ebit)).join(",")}`);
    lines.push(`Interest Expense,${out.annual.map((r) => fmt(r.interestExpense)).join(",")}`);
    lines.push(`Pre-tax Income,${out.annual.map((r) => fmt(r.preTaxIncome)).join(",")}`);
    lines.push(`Tax,${out.annual.map((r) => fmt(r.tax)).join(",")}`);
    lines.push(`Net Income,${out.annual.map((r) => fmt(r.netIncome)).join(",")}`);
    lines.push(`Net Margin %,${out.annual.map((r) => fmt(r.netMarginPercent)).join(",")}`);
    lines.push("");

    const bsHeaders = `,Year 0,${yearHeaders}`;
    lines.push(`BALANCE SHEET${bsHeaders}`);
    lines.push(`Cash,${fmt(out.seed.cash)},${out.annual.map((r) => fmt(r.cash)).join(",")}`);
    lines.push(`Accounts Receivable,${fmt(out.seed.accountsReceivable)},${out.annual.map((r) => fmt(r.accountsReceivable)).join(",")}`);
    lines.push(`Inventory,${fmt(out.seed.inventory)},${out.annual.map((r) => fmt(r.inventory)).join(",")}`);
    lines.push(`Net PP&E,${fmt(out.seed.netPPE)},${out.annual.map((r) => fmt(r.netPPE)).join(",")}`);
    lines.push(`Total Assets,${fmt(out.seed.totalAssets)},${out.annual.map((r) => fmt(r.totalAssets)).join(",")}`);
    lines.push(`Accounts Payable,${fmt(out.seed.accountsPayable)},${out.annual.map((r) => fmt(r.accountsPayable)).join(",")}`);
    lines.push(`Loan Balance,${fmt(out.seed.loanBalance)},${out.annual.map((r) => fmt(r.loanBalance)).join(",")}`);
    lines.push(`Total Liabilities,${fmt(out.seed.totalLiabilities)},${out.annual.map((r) => fmt(r.totalLiabilities)).join(",")}`);
    lines.push(`Capital,${fmt(out.seed.capital)},${out.annual.map((r) => fmt(r.capital)).join(",")}`);
    lines.push(`Retained Earnings,${fmt(out.seed.retainedEarnings)},${out.annual.map((r) => fmt(r.retainedEarnings)).join(",")}`);
    lines.push(`Total Equity,${fmt(out.seed.totalEquity)},${out.annual.map((r) => fmt(r.totalEquity)).join(",")}`);
    lines.push("");

    lines.push(`CASH FLOW,${yearHeaders}`);
    lines.push(`Operating Cash Flow,${out.annual.map((r) => fmt(r.operatingCF)).join(",")}`);
    lines.push(`Investing Cash Flow,${out.annual.map((r) => fmt(r.investingCF)).join(",")}`);
    lines.push(`Financing Cash Flow,${out.annual.map((r) => fmt(r.financingCF)).join(",")}`);
    lines.push(`Net Cash Flow,${out.annual.map((r) => fmt(r.netCashFlow)).join(",")}`);
    lines.push(`Ending Cash,${out.annual.map((r) => fmt(r.cash)).join(",")}`);
    lines.push("");

    lines.push(`STATEMENT OF CHANGES IN EQUITY,${yearHeaders}`);
    lines.push(`Beginning Capital,${out.sce.map((r) => fmt(r.beginningCapital)).join(",")}`);
    lines.push(`Contributions,${out.sce.map((r) => fmt(r.contributions)).join(",")}`);
    lines.push(`Net Income,${out.sce.map((r) => fmt(r.netIncome)).join(",")}`);
    lines.push(`Distributions,${out.sce.map((r) => fmt(r.distributions)).join(",")}`);
    lines.push(`Ending Capital,${out.sce.map((r) => fmt(r.endingCapital)).join(",")}`);
    lines.push("");
    lines.push("");
  }

  return lines.join("\n");
}

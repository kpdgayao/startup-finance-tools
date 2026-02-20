export interface FinancialModelInputs {
  startingRevenue: number; // monthly
  monthlyGrowthRate: number; // percentage
  cogsPercent: number;
  fixedOpEx: number; // monthly
  variableOpExPercent: number;
  startingCash: number;
  dso: number; // days
  dpo: number; // days
  taxRate: number; // percentage
  annualCapEx: number;
  depreciationYears: number;
}

export interface MonthlyRow {
  month: number; // 1-36
  // P&L
  revenue: number;
  cogs: number;
  grossProfit: number;
  fixedOpEx: number;
  variableOpEx: number;
  totalOpEx: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  tax: number;
  netIncome: number;
  // Balance Sheet
  cash: number;
  accountsReceivable: number;
  cumulativeCapEx: number;
  accumulatedDepreciation: number;
  netPPE: number;
  totalAssets: number;
  accountsPayable: number;
  totalLiabilities: number;
  retainedEarnings: number;
  totalEquity: number;
  // Cash Flow
  cfDepreciation: number;
  deltaAR: number;
  deltaAP: number;
  operatingCF: number;
  investingCF: number;
  netCashFlow: number;
}

export interface AnnualRow {
  year: number; // 1-3
  // P&L (summed)
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  fixedOpEx: number;
  variableOpEx: number;
  totalOpEx: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  tax: number;
  netIncome: number;
  netMarginPercent: number;
  // Balance Sheet (year-end snapshot)
  cash: number;
  accountsReceivable: number;
  cumulativeCapEx: number;
  accumulatedDepreciation: number;
  netPPE: number;
  totalAssets: number;
  accountsPayable: number;
  totalLiabilities: number;
  retainedEarnings: number;
  totalEquity: number;
  // Cash Flow (summed)
  operatingCF: number;
  investingCF: number;
  netCashFlow: number;
}

export interface BalanceSheetSeed {
  cash: number;
  accountsReceivable: number;
  cumulativeCapEx: number;
  accumulatedDepreciation: number;
  netPPE: number;
  totalAssets: number;
  accountsPayable: number;
  totalLiabilities: number;
  retainedEarnings: number;
  totalEquity: number;
}

export interface FinancialModelSummary {
  threeYearRevenue: number;
  avgGrossMargin: number;
  year3Ebitda: number;
  year3NetIncome: number;
}

export interface FinancialModelResult {
  monthly: MonthlyRow[];
  annual: AnnualRow[];
  seed: BalanceSheetSeed;
  summary: FinancialModelSummary;
}

export function buildFinancialModel(
  inputs: FinancialModelInputs
): FinancialModelResult {
  const monthly: MonthlyRow[] = [];

  let prevAR = 0;
  let prevAP = 0;
  let cumulativeCapEx = 0;
  let accumulatedDepreciation = 0;
  let retainedEarnings = 0;
  let cash = inputs.startingCash;

  const arFraction = Math.min(inputs.dso / 30, 1);
  const apFraction = Math.min(inputs.dpo / 30, 1);

  for (let m = 1; m <= 36; m++) {
    // Revenue with compound growth
    const revenue =
      inputs.startingRevenue *
      Math.pow(1 + inputs.monthlyGrowthRate / 100, m - 1);

    // P&L
    const cogs = revenue * (inputs.cogsPercent / 100);
    const grossProfit = revenue - cogs;
    const fixedOpEx = inputs.fixedOpEx;
    const variableOpEx = revenue * (inputs.variableOpExPercent / 100);
    const totalOpEx = fixedOpEx + variableOpEx;
    const ebitda = grossProfit - totalOpEx;

    // CapEx hits at month 1, 13, 25 (start of each year)
    if (m === 1 || m === 13 || m === 25) {
      cumulativeCapEx += inputs.annualCapEx;
    }

    // Depreciation on cumulative CapEx basis
    const monthlyDepreciation =
      inputs.depreciationYears > 0
        ? cumulativeCapEx / (inputs.depreciationYears * 12)
        : 0;
    accumulatedDepreciation += monthlyDepreciation;

    const ebit = ebitda - monthlyDepreciation;

    // Tax only on positive EBIT
    const tax = ebit > 0 ? ebit * (inputs.taxRate / 100) : 0;
    const netIncome = ebit - tax;

    // Balance Sheet
    const ar = revenue * arFraction;
    const ap = (cogs + totalOpEx) * apFraction;

    // Cash Flow (indirect method)
    const deltaAR = ar - prevAR;
    const deltaAP = ap - prevAP;
    const capExThisMonth =
      m === 1 || m === 13 || m === 25 ? inputs.annualCapEx : 0;

    const operatingCF = netIncome + monthlyDepreciation - deltaAR + deltaAP;
    const investingCF = -capExThisMonth;
    const netCashFlow = operatingCF + investingCF;

    cash += netCashFlow;
    retainedEarnings += netIncome;

    const netPPE = cumulativeCapEx - accumulatedDepreciation;
    const totalAssets = cash + ar + netPPE;
    const totalLiabilities = ap;
    const totalEquity = inputs.startingCash + retainedEarnings;

    monthly.push({
      month: m,
      revenue,
      cogs,
      grossProfit,
      fixedOpEx,
      variableOpEx,
      totalOpEx,
      ebitda,
      depreciation: monthlyDepreciation,
      ebit,
      tax,
      netIncome,
      cash,
      accountsReceivable: ar,
      cumulativeCapEx,
      accumulatedDepreciation,
      netPPE,
      totalAssets,
      accountsPayable: ap,
      totalLiabilities,
      retainedEarnings,
      totalEquity,
      cfDepreciation: monthlyDepreciation,
      deltaAR,
      deltaAP,
      operatingCF,
      investingCF,
      netCashFlow,
    });

    prevAR = ar;
    prevAP = ap;
  }

  // Seed (Year 0)
  const seed: BalanceSheetSeed = {
    cash: inputs.startingCash,
    accountsReceivable: 0,
    cumulativeCapEx: 0,
    accumulatedDepreciation: 0,
    netPPE: 0,
    totalAssets: inputs.startingCash,
    accountsPayable: 0,
    totalLiabilities: 0,
    retainedEarnings: 0,
    totalEquity: inputs.startingCash,
  };

  // Aggregate into 3 annual rows
  const annual: AnnualRow[] = [];
  for (let year = 1; year <= 3; year++) {
    const start = (year - 1) * 12;
    const end = year * 12;
    const yearRows = monthly.slice(start, end);
    const lastMonth = yearRows[yearRows.length - 1];

    const totalRevenue = yearRows.reduce((s, r) => s + r.revenue, 0);
    const totalCogs = yearRows.reduce((s, r) => s + r.cogs, 0);
    const totalGrossProfit = yearRows.reduce((s, r) => s + r.grossProfit, 0);
    const totalFixedOpEx = yearRows.reduce((s, r) => s + r.fixedOpEx, 0);
    const totalVariableOpEx = yearRows.reduce(
      (s, r) => s + r.variableOpEx,
      0
    );
    const totalTotalOpEx = yearRows.reduce((s, r) => s + r.totalOpEx, 0);
    const totalEbitda = yearRows.reduce((s, r) => s + r.ebitda, 0);
    const totalDepreciation = yearRows.reduce(
      (s, r) => s + r.depreciation,
      0
    );
    const totalEbit = yearRows.reduce((s, r) => s + r.ebit, 0);
    const totalTax = yearRows.reduce((s, r) => s + r.tax, 0);
    const totalNetIncome = yearRows.reduce((s, r) => s + r.netIncome, 0);

    annual.push({
      year,
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit: totalGrossProfit,
      grossMarginPercent:
        totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0,
      fixedOpEx: totalFixedOpEx,
      variableOpEx: totalVariableOpEx,
      totalOpEx: totalTotalOpEx,
      ebitda: totalEbitda,
      depreciation: totalDepreciation,
      ebit: totalEbit,
      tax: totalTax,
      netIncome: totalNetIncome,
      netMarginPercent:
        totalRevenue > 0 ? (totalNetIncome / totalRevenue) * 100 : 0,
      // BS snapshot from last month of year
      cash: lastMonth.cash,
      accountsReceivable: lastMonth.accountsReceivable,
      cumulativeCapEx: lastMonth.cumulativeCapEx,
      accumulatedDepreciation: lastMonth.accumulatedDepreciation,
      netPPE: lastMonth.netPPE,
      totalAssets: lastMonth.totalAssets,
      accountsPayable: lastMonth.accountsPayable,
      totalLiabilities: lastMonth.totalLiabilities,
      retainedEarnings: lastMonth.retainedEarnings,
      totalEquity: lastMonth.totalEquity,
      // CF summed
      operatingCF: yearRows.reduce((s, r) => s + r.operatingCF, 0),
      investingCF: yearRows.reduce((s, r) => s + r.investingCF, 0),
      netCashFlow: yearRows.reduce((s, r) => s + r.netCashFlow, 0),
    });
  }

  const threeYearRevenue = annual.reduce((s, a) => s + a.revenue, 0);
  const avgGrossMargin =
    annual.reduce((s, a) => s + a.grossMarginPercent, 0) / 3;

  const summary: FinancialModelSummary = {
    threeYearRevenue,
    avgGrossMargin,
    year3Ebitda: annual[2].ebitda,
    year3NetIncome: annual[2].netIncome,
  };

  return { monthly, annual, seed, summary };
}

export function exportFinancialModelCSV(
  annual: AnnualRow[],
  seed: BalanceSheetSeed
): string {
  const fmt = (n: number) => n.toFixed(2);
  const lines: string[] = [];

  // P&L
  lines.push("PROFIT & LOSS,,Year 1,Year 2,Year 3");
  lines.push(
    `Revenue,,${fmt(annual[0].revenue)},${fmt(annual[1].revenue)},${fmt(annual[2].revenue)}`
  );
  lines.push(
    `COGS,,${fmt(annual[0].cogs)},${fmt(annual[1].cogs)},${fmt(annual[2].cogs)}`
  );
  lines.push(
    `Gross Profit,,${fmt(annual[0].grossProfit)},${fmt(annual[1].grossProfit)},${fmt(annual[2].grossProfit)}`
  );
  lines.push(
    `Gross Margin %,,${fmt(annual[0].grossMarginPercent)}%,${fmt(annual[1].grossMarginPercent)}%,${fmt(annual[2].grossMarginPercent)}%`
  );
  lines.push(
    `Fixed OpEx,,${fmt(annual[0].fixedOpEx)},${fmt(annual[1].fixedOpEx)},${fmt(annual[2].fixedOpEx)}`
  );
  lines.push(
    `Variable OpEx,,${fmt(annual[0].variableOpEx)},${fmt(annual[1].variableOpEx)},${fmt(annual[2].variableOpEx)}`
  );
  lines.push(
    `Total OpEx,,${fmt(annual[0].totalOpEx)},${fmt(annual[1].totalOpEx)},${fmt(annual[2].totalOpEx)}`
  );
  lines.push(
    `EBITDA,,${fmt(annual[0].ebitda)},${fmt(annual[1].ebitda)},${fmt(annual[2].ebitda)}`
  );
  lines.push(
    `Depreciation,,${fmt(annual[0].depreciation)},${fmt(annual[1].depreciation)},${fmt(annual[2].depreciation)}`
  );
  lines.push(
    `EBIT,,${fmt(annual[0].ebit)},${fmt(annual[1].ebit)},${fmt(annual[2].ebit)}`
  );
  lines.push(
    `Tax,,${fmt(annual[0].tax)},${fmt(annual[1].tax)},${fmt(annual[2].tax)}`
  );
  lines.push(
    `Net Income,,${fmt(annual[0].netIncome)},${fmt(annual[1].netIncome)},${fmt(annual[2].netIncome)}`
  );
  lines.push(
    `Net Margin %,,${fmt(annual[0].netMarginPercent)}%,${fmt(annual[1].netMarginPercent)}%,${fmt(annual[2].netMarginPercent)}%`
  );

  lines.push("");

  // Balance Sheet
  lines.push("BALANCE SHEET,,Year 0,Year 1,Year 2,Year 3");
  lines.push(
    `Cash,,${fmt(seed.cash)},${fmt(annual[0].cash)},${fmt(annual[1].cash)},${fmt(annual[2].cash)}`
  );
  lines.push(
    `Accounts Receivable,,${fmt(seed.accountsReceivable)},${fmt(annual[0].accountsReceivable)},${fmt(annual[1].accountsReceivable)},${fmt(annual[2].accountsReceivable)}`
  );
  lines.push(
    `Net PP&E,,${fmt(seed.netPPE)},${fmt(annual[0].netPPE)},${fmt(annual[1].netPPE)},${fmt(annual[2].netPPE)}`
  );
  lines.push(
    `Total Assets,,${fmt(seed.totalAssets)},${fmt(annual[0].totalAssets)},${fmt(annual[1].totalAssets)},${fmt(annual[2].totalAssets)}`
  );
  lines.push(
    `Accounts Payable,,${fmt(seed.accountsPayable)},${fmt(annual[0].accountsPayable)},${fmt(annual[1].accountsPayable)},${fmt(annual[2].accountsPayable)}`
  );
  lines.push(
    `Total Liabilities,,${fmt(seed.totalLiabilities)},${fmt(annual[0].totalLiabilities)},${fmt(annual[1].totalLiabilities)},${fmt(annual[2].totalLiabilities)}`
  );
  lines.push(
    `Retained Earnings,,${fmt(seed.retainedEarnings)},${fmt(annual[0].retainedEarnings)},${fmt(annual[1].retainedEarnings)},${fmt(annual[2].retainedEarnings)}`
  );
  lines.push(
    `Total Equity,,${fmt(seed.totalEquity)},${fmt(annual[0].totalEquity)},${fmt(annual[1].totalEquity)},${fmt(annual[2].totalEquity)}`
  );

  lines.push("");

  // Cash Flow
  lines.push("CASH FLOW STATEMENT,,Year 1,Year 2,Year 3");
  lines.push(
    `Operating Cash Flow,,${fmt(annual[0].operatingCF)},${fmt(annual[1].operatingCF)},${fmt(annual[2].operatingCF)}`
  );
  lines.push(
    `Investing Cash Flow,,${fmt(annual[0].investingCF)},${fmt(annual[1].investingCF)},${fmt(annual[2].investingCF)}`
  );
  lines.push(
    `Net Cash Flow,,${fmt(annual[0].netCashFlow)},${fmt(annual[1].netCashFlow)},${fmt(annual[2].netCashFlow)}`
  );
  lines.push(
    `Ending Cash,,${fmt(annual[0].cash)},${fmt(annual[1].cash)},${fmt(annual[2].cash)}`
  );

  return lines.join("\n");
}

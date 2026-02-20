export interface CashFlowInputs {
  monthlyRecurringRevenue: number;
  monthlyOneTimeIncome: number[];  // 12 months
  fixedCosts: number;
  variableCostPercent: number; // % of revenue
  paymentTermsDays: number; // DSO
  payableTermsDays: number; // DPO
}

export interface MonthlyProjection {
  month: number;
  monthLabel: string;
  // Accrual basis
  revenue: number;
  totalExpenses: number;
  fixedCosts: number;
  variableCosts: number;
  // Cash basis (after DSO/DPO timing)
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  // Balances
  openingBalance: number;
  closingBalance: number;
  // Working capital
  accountsReceivable: number;
  accountsPayable: number;
}

export interface CashFlowSummary {
  totalInflow: number;
  totalOutflow: number;
  totalNetFlow: number;
  finalBalance: number;
  peakBalance: number;        // includes starting balance
  lowestBalance: number;      // includes starting balance
  avgNetFlow: number;
  negativeMonths: number;     // months with negative net cash flow
  negativeBalanceMonths: number; // months ending with negative balance
  cashConversionCycle: number; // DSO - DPO
  workingCapitalImpact: number; // cash tied up in month 1 due to AR/AP build-up
  bestMonth: MonthlyProjection;
  worstMonth: MonthlyProjection;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Projects 12-month cash flow using the AR/AP balance method.
 *
 * DSO effect (Wall Street standard):
 *   Ending_AR = (DSO / 30) * Revenue
 *   Cash_Collected = Beginning_AR + Revenue - Ending_AR
 *
 * DPO effect (symmetric):
 *   Ending_AP = (DPO / 30) * Expenses
 *   Cash_Paid = Beginning_AP + Expenses - Ending_AP
 *
 * This properly handles fractional month delays (e.g., DSO=15 → 50% collected same month).
 */
export function projectMonthlyCashFlow(
  inputs: CashFlowInputs,
  startingBalance: number = 0,
  startMonth: number = 0
): MonthlyProjection[] {
  const projections: MonthlyProjection[] = [];

  // AR/AP ratios (what fraction of monthly revenue/expenses remains uncollected/unpaid)
  const arRatio = Math.min(inputs.paymentTermsDays / 30, 12); // cap at 12 months
  const apRatio = Math.min(inputs.payableTermsDays / 30, 12);

  let openingBalance = startingBalance;
  let beginningAR = 0; // no outstanding receivables at start
  let beginningAP = 0; // no outstanding payables at start

  for (let i = 0; i < 12; i++) {
    const mrr = inputs.monthlyRecurringRevenue;
    const oneTimeIncome = inputs.monthlyOneTimeIncome[i] || 0;
    const revenue = mrr + oneTimeIncome;

    // Variable costs based on accrual revenue (matching principle)
    const variableCosts = revenue * (inputs.variableCostPercent / 100);
    const totalExpenses = inputs.fixedCosts + variableCosts;

    // --- AR-balance method for cash inflow ---
    // Ending AR = proportion of this month's revenue still uncollected
    const endingAR = arRatio * revenue;
    // Cash collected = what was owed + new revenue - what's still owed
    const cashInflow = Math.max(0, beginningAR + revenue - endingAR);

    // --- AP-balance method for cash outflow ---
    // Ending AP = proportion of this month's expenses still unpaid
    const endingAP = apRatio * totalExpenses;
    // Cash paid = what was owed + new expenses - what's still owed
    const cashOutflow = Math.max(0, beginningAP + totalExpenses - endingAP);

    const netCashFlow = cashInflow - cashOutflow;
    const closingBalance = openingBalance + netCashFlow;

    projections.push({
      month: i + 1,
      monthLabel: MONTH_LABELS[(startMonth + i) % 12],
      revenue,
      totalExpenses,
      fixedCosts: inputs.fixedCosts,
      variableCosts,
      cashInflow,
      cashOutflow,
      netCashFlow,
      openingBalance,
      closingBalance,
      accountsReceivable: endingAR,
      accountsPayable: endingAP,
    });

    // Carry forward
    openingBalance = closingBalance;
    beginningAR = endingAR;
    beginningAP = endingAP;
  }

  return projections;
}

export function calculateSummary(
  projections: MonthlyProjection[],
  startingBalance: number,
  dsoDays: number = 0,
  dpoDays: number = 0
): CashFlowSummary {
  const totalInflow = projections.reduce((s, p) => s + p.cashInflow, 0);
  const totalOutflow = projections.reduce((s, p) => s + p.cashOutflow, 0);
  const totalNetFlow = totalInflow - totalOutflow;
  const finalBalance = projections[projections.length - 1]?.closingBalance ?? startingBalance;

  // Include starting balance in peak/lowest — it's a real balance snapshot
  const allBalances = [startingBalance, ...projections.map((p) => p.closingBalance)];
  const peakBalance = Math.max(...allBalances);
  const lowestBalance = Math.min(...allBalances);

  const avgNetFlow = projections.length > 0
    ? projections.reduce((s, p) => s + p.netCashFlow, 0) / projections.length
    : 0;
  const negativeMonths = projections.filter((p) => p.netCashFlow < 0).length;
  const negativeBalanceMonths = projections.filter((p) => p.closingBalance < 0).length;
  const bestMonth = projections.reduce((best, p) =>
    p.netCashFlow > best.netCashFlow ? p : best, projections[0]);
  const worstMonth = projections.reduce((worst, p) =>
    p.netCashFlow < worst.netCashFlow ? p : worst, projections[0]);

  // Working capital impact = cash tied up in month 1 from AR/AP build-up
  const month1 = projections[0];
  const workingCapitalImpact = month1
    ? (month1.accountsReceivable - month1.accountsPayable)
    : 0;

  return {
    totalInflow,
    totalOutflow,
    totalNetFlow,
    finalBalance,
    peakBalance,
    lowestBalance,
    avgNetFlow,
    negativeMonths,
    negativeBalanceMonths,
    cashConversionCycle: dsoDays - dpoDays,
    workingCapitalImpact,
    bestMonth,
    worstMonth,
  };
}

export function calculateDSO(receivables: number, revenue: number): number {
  if (revenue === 0) return 0;
  return (receivables / revenue) * 30;
}

export function calculateDPO(payables: number, expenses: number): number {
  if (expenses === 0) return 0;
  return (payables / expenses) * 30;
}

export function exportToCSV(projections: MonthlyProjection[]): string {
  const headers = [
    "Month",
    "Opening Balance",
    "Revenue (Accrual)",
    "Cash Inflow",
    "Total Expenses (Accrual)",
    "Cash Outflow",
    "Net Cash Flow",
    "Closing Balance",
    "Accounts Receivable",
    "Accounts Payable",
    "Fixed Costs",
    "Variable Costs",
  ];

  const rows = projections.map((p) => [
    p.monthLabel,
    p.openingBalance.toFixed(2),
    p.revenue.toFixed(2),
    p.cashInflow.toFixed(2),
    p.totalExpenses.toFixed(2),
    p.cashOutflow.toFixed(2),
    p.netCashFlow.toFixed(2),
    p.closingBalance.toFixed(2),
    p.accountsReceivable.toFixed(2),
    p.accountsPayable.toFixed(2),
    p.fixedCosts.toFixed(2),
    p.variableCosts.toFixed(2),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

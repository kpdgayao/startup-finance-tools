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
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  cumulativeBalance: number;
  mrr: number;
  oneTimeIncome: number;
  fixedCosts: number;
  variableCosts: number;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function projectMonthlyCashFlow(
  inputs: CashFlowInputs,
  startingBalance: number = 0,
  startMonth: number = 0
): MonthlyProjection[] {
  const projections: MonthlyProjection[] = [];
  let cumulativeBalance = startingBalance;

  // DSO effect: delay revenue collection
  const dsoMonthDelay = Math.floor(inputs.paymentTermsDays / 30);
  // DPO effect: delay expense payment
  const dpoMonthDelay = Math.floor(inputs.payableTermsDays / 30);

  for (let i = 0; i < 12; i++) {
    const mrr = inputs.monthlyRecurringRevenue;
    const oneTimeIncome = inputs.monthlyOneTimeIncome[i] || 0;
    const totalRevenue = mrr + oneTimeIncome;

    // Cash inflow considers DSO delay
    let cashInflow: number;
    if (i >= dsoMonthDelay) {
      const delayedOneTime = inputs.monthlyOneTimeIncome[i - dsoMonthDelay] || 0;
      cashInflow = mrr + delayedOneTime;
    } else {
      cashInflow = 0; // Haven't collected yet
    }

    const variableCosts = totalRevenue * (inputs.variableCostPercent / 100);
    const totalExpenses = inputs.fixedCosts + variableCosts;

    // Cash outflow considers DPO delay — bills deferred during delay period
    let cashOutflow: number;
    if (i >= dpoMonthDelay) {
      cashOutflow = totalExpenses;
    } else {
      cashOutflow = 0; // Payables not yet due — DPO benefit
    }

    const netCashFlow = cashInflow - cashOutflow;
    cumulativeBalance += netCashFlow;

    projections.push({
      month: i + 1,
      monthLabel: MONTH_LABELS[(startMonth + i) % 12],
      cashInflow,
      cashOutflow,
      netCashFlow,
      cumulativeBalance,
      mrr,
      oneTimeIncome,
      fixedCosts: inputs.fixedCosts,
      variableCosts,
    });
  }

  return projections;
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
    "Cash Inflow",
    "Cash Outflow",
    "Net Cash Flow",
    "Cumulative Balance",
    "MRR",
    "One-Time Income",
    "Fixed Costs",
    "Variable Costs",
  ];

  const rows = projections.map((p) => [
    p.monthLabel,
    p.cashInflow.toFixed(2),
    p.cashOutflow.toFixed(2),
    p.netCashFlow.toFixed(2),
    p.cumulativeBalance.toFixed(2),
    p.mrr.toFixed(2),
    p.oneTimeIncome.toFixed(2),
    p.fixedCosts.toFixed(2),
    p.variableCosts.toFixed(2),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

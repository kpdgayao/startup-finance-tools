export interface BurnRateInputs {
  cashBalance: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
}

export interface BurnRateResult {
  grossBurn: number;
  netBurn: number;
  runway: number; // months
  monthlyRevenue: number;
}

export function calculateBurnRate(inputs: BurnRateInputs): BurnRateResult {
  const grossBurn = inputs.monthlyExpenses;
  const netBurn = inputs.monthlyExpenses - inputs.monthlyRevenue;
  const runway = netBurn > 0 ? inputs.cashBalance / netBurn : Infinity;

  return {
    grossBurn,
    netBurn: Math.max(0, netBurn),
    runway: netBurn <= 0 ? Infinity : runway,
    monthlyRevenue: inputs.monthlyRevenue,
  };
}

export interface CashProjection {
  month: number;
  balance: number;
  revenue: number;
  expenses: number;
  netCashFlow: number;
}

export function projectCashBalance(
  cashBalance: number,
  monthlyRevenue: number,
  monthlyExpenses: number,
  months: number = 24
): CashProjection[] {
  const projections: CashProjection[] = [];
  let balance = cashBalance;

  for (let i = 0; i <= months; i++) {
    if (i === 0) {
      projections.push({
        month: 0,
        balance: cashBalance,
        revenue: 0,
        expenses: 0,
        netCashFlow: 0,
      });
      continue;
    }

    const netCashFlow = monthlyRevenue - monthlyExpenses;
    balance += netCashFlow;

    projections.push({
      month: i,
      balance,
      revenue: monthlyRevenue,
      expenses: monthlyExpenses,
      netCashFlow,
    });
  }

  return projections;
}

export function projectWithAdjustments(
  cashBalance: number,
  monthlyRevenue: number,
  monthlyExpenses: number,
  expenseCutPercent: number,
  revenueIncreasePercent: number,
  months: number = 24
): CashProjection[] {
  const adjustedExpenses = monthlyExpenses * (1 - expenseCutPercent / 100);
  const adjustedRevenue = monthlyRevenue * (1 + revenueIncreasePercent / 100);
  return projectCashBalance(cashBalance, adjustedRevenue, adjustedExpenses, months);
}

export function getRunwayZone(months: number): "red" | "yellow" | "green" {
  if (months === Infinity) return "green";
  if (months < 3) return "red";
  if (months < 6) return "yellow";
  return "green";
}

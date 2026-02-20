export interface UnitEconomicsInputs {
  monthlyMarketingSpend: number;
  newCustomersPerMonth: number;
  revenuePerCustomer: number; // monthly
  grossMarginPercent: number;
  monthlyChurnRate: number;
}

export interface UnitEconomicsResult {
  cac: number;
  arpu: number;
  avgLifetimeMonths: number;
  ltv: number;
  ltvCacRatio: number;
  paybackMonths: number;
  monthlyGrossProfit: number;
  breakEvenCustomers: number;
}

export interface SensitivityPoint {
  churnRate: number;
  ltv: number;
  ltvCacRatio: number;
}

export function calculateUnitEconomics(
  inputs: UnitEconomicsInputs
): UnitEconomicsResult {
  const cac =
    inputs.newCustomersPerMonth > 0
      ? inputs.monthlyMarketingSpend / inputs.newCustomersPerMonth
      : 0;

  const arpu = inputs.revenuePerCustomer;
  const avgLifetimeMonths =
    inputs.monthlyChurnRate > 0 ? 1 / (inputs.monthlyChurnRate / 100) : Infinity;

  const monthlyGrossProfit = arpu * (inputs.grossMarginPercent / 100);
  const ltv =
    avgLifetimeMonths === Infinity
      ? Infinity
      : monthlyGrossProfit * avgLifetimeMonths;

  const ltvCacRatio = cac > 0 && ltv !== Infinity ? ltv / cac : ltv === Infinity ? Infinity : 0;

  const paybackMonths =
    monthlyGrossProfit > 0 ? cac / monthlyGrossProfit : Infinity;

  const breakEvenCustomers =
    monthlyGrossProfit > 0
      ? Math.ceil(inputs.monthlyMarketingSpend / monthlyGrossProfit)
      : Infinity;

  return {
    cac,
    arpu,
    avgLifetimeMonths,
    ltv,
    ltvCacRatio,
    paybackMonths,
    monthlyGrossProfit,
    breakEvenCustomers,
  };
}

export function generateSensitivity(
  inputs: UnitEconomicsInputs,
  churnRange: number[]
): SensitivityPoint[] {
  return churnRange.map((churnRate) => {
    const result = calculateUnitEconomics({
      ...inputs,
      monthlyChurnRate: churnRate,
    });
    return {
      churnRate,
      ltv: result.ltv === Infinity ? 0 : result.ltv,
      ltvCacRatio: result.ltvCacRatio === Infinity ? 0 : result.ltvCacRatio,
    };
  });
}

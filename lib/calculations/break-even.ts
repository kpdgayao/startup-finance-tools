export interface BreakEvenInputs {
  fixedCostsMonthly: number;
  variableCostPerUnit: number;
  sellingPricePerUnit: number;
  currentMonthlyVolume?: number;
  targetProfitMargin?: number; // e.g. 20 for 20%
}

export interface BreakEvenResult {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  contributionMarginPerUnit: number;
  contributionMarginRatio: number;
  marginOfSafety: number | null; // null if no current volume
  marginOfSafetyPercent: number | null;
  targetProfitUnits: number | null;
  targetProfitRevenue: number | null;
}

export interface BreakEvenChartPoint {
  units: number;
  revenue: number;
  totalCost: number;
  profit: number;
}

export function calculateBreakEven(
  inputs: BreakEvenInputs
): BreakEvenResult | null {
  const { fixedCostsMonthly, variableCostPerUnit, sellingPricePerUnit } =
    inputs;

  if (sellingPricePerUnit <= 0) return null;

  const contributionMarginPerUnit = sellingPricePerUnit - variableCostPerUnit;
  if (contributionMarginPerUnit <= 0) return null; // can never break even

  const contributionMarginRatio =
    contributionMarginPerUnit / sellingPricePerUnit;

  const breakEvenUnits = Math.ceil(
    fixedCostsMonthly / contributionMarginPerUnit
  );
  const breakEvenRevenue = breakEvenUnits * sellingPricePerUnit;

  // Margin of safety
  let marginOfSafety: number | null = null;
  let marginOfSafetyPercent: number | null = null;
  if (
    inputs.currentMonthlyVolume !== undefined &&
    inputs.currentMonthlyVolume > 0
  ) {
    marginOfSafety = inputs.currentMonthlyVolume - breakEvenUnits;
    marginOfSafetyPercent =
      (marginOfSafety / inputs.currentMonthlyVolume) * 100;
  }

  // Target profit
  let targetProfitUnits: number | null = null;
  let targetProfitRevenue: number | null = null;
  if (
    inputs.targetProfitMargin !== undefined &&
    inputs.targetProfitMargin > 0
  ) {
    const adjustedCM =
      contributionMarginPerUnit -
      (inputs.targetProfitMargin / 100) * sellingPricePerUnit;
    if (adjustedCM > 0) {
      targetProfitUnits = Math.ceil(fixedCostsMonthly / adjustedCM);
      targetProfitRevenue = targetProfitUnits * sellingPricePerUnit;
    }
  }

  return {
    breakEvenUnits,
    breakEvenRevenue,
    contributionMarginPerUnit,
    contributionMarginRatio,
    marginOfSafety,
    marginOfSafetyPercent,
    targetProfitUnits,
    targetProfitRevenue,
  };
}

export function generateBreakEvenChartData(
  inputs: BreakEvenInputs,
  maxUnits: number
): BreakEvenChartPoint[] {
  const points: BreakEvenChartPoint[] = [];
  const steps = 20;
  const step = Math.max(1, Math.ceil(maxUnits / steps));

  for (let units = 0; units <= maxUnits; units += step) {
    const revenue = units * inputs.sellingPricePerUnit;
    const totalCost =
      inputs.fixedCostsMonthly + units * inputs.variableCostPerUnit;
    points.push({
      units,
      revenue,
      totalCost,
      profit: revenue - totalCost,
    });
  }

  return points;
}

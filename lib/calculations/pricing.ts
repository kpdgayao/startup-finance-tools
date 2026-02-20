export interface CostBreakdown {
  fixedCosts: number;
  variableCostPerUnit: number;
  expectedUnits: number;
}

export interface PricingResult {
  price: number;
  margin: number;
  marginPercent: number;
  breakeven: number;
  contributionPerUnit: number;
}

export function calculateCostPlus(
  costs: CostBreakdown,
  marginPercent: number
): PricingResult {
  const totalCostPerUnit =
    costs.expectedUnits > 0
      ? costs.fixedCosts / costs.expectedUnits + costs.variableCostPerUnit
      : costs.variableCostPerUnit;

  const price = totalCostPerUnit * (1 + marginPercent / 100);
  const margin = price - totalCostPerUnit;
  const contributionPerUnit = price - costs.variableCostPerUnit;
  const breakeven =
    contributionPerUnit > 0
      ? Math.ceil(costs.fixedCosts / contributionPerUnit)
      : Infinity;

  return {
    price,
    margin,
    marginPercent,
    breakeven,
    contributionPerUnit,
  };
}

export function calculateValueBased(
  perceivedValue: number,
  discountFromValue: number
): number {
  return perceivedValue * (1 - discountFromValue / 100);
}

export function calculatePenetrationPrice(
  marketPrice: number,
  discountPercent: number
): number {
  return marketPrice * (1 - discountPercent / 100);
}

export function calculateCompetitivePosition(
  competitorPrices: number[]
): { min: number; max: number; average: number; median: number } {
  if (competitorPrices.length === 0) {
    return { min: 0, max: 0, average: 0, median: 0 };
  }
  const sorted = [...competitorPrices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const average = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return { min, max, average, median };
}

export function calculateBundlePrice(
  individualPrices: number[],
  discountPercent: number
): { totalIndividual: number; bundlePrice: number; savings: number } {
  const totalIndividual = individualPrices.reduce((a, b) => a + b, 0);
  const bundlePrice = totalIndividual * (1 - discountPercent / 100);
  return {
    totalIndividual,
    bundlePrice,
    savings: totalIndividual - bundlePrice,
  };
}

export function suggestPsychologicalPrice(price: number): number {
  if (price <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(price)));
  const rounded = Math.ceil(price / magnitude) * magnitude;
  return rounded - 1;
}

export function calculateBreakeven(
  fixedCosts: number,
  pricePerUnit: number,
  variableCostPerUnit: number
): number {
  const contribution = pricePerUnit - variableCostPerUnit;
  if (contribution <= 0) return Infinity;
  return Math.ceil(fixedCosts / contribution);
}

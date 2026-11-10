import { formatPHP, formatNumber } from "@/lib/utils";

export interface CostBreakdown {
  fixedCosts: number;
  variableCostPerUnit: number;
  expectedUnits: number;
}

export interface CompetitorOffer { id: string; name: string; price: number; size: number }

export interface PerMeasureRow {
  id: string;
  name: string;
  pricePerMeasure: number;     // price ÷ size
  differencePercent: number;   // (yourPerMeasure − theirs) ÷ theirs × 100; negative = you are cheaper
}

export type PricingBasis = "markup" | "margin";

export interface PricingResult {
  price: number;
  unitCost: number;
  profitPerUnit: number;
  markupPercent: number;
  marginPercent: number;
  breakeven: number;
  contributionPerUnit: number;
}

export function calculateCostPlus(
  costs: CostBreakdown,
  percent: number,
  basis: PricingBasis = "markup"
): PricingResult {
  const unitCost =
    costs.expectedUnits > 0
      ? costs.fixedCosts / costs.expectedUnits + costs.variableCostPerUnit
      : costs.variableCostPerUnit;

  const price =
    basis === "margin"
      ? percent >= 100
        ? Infinity
        : unitCost / (1 - percent / 100)
      : unitCost * (1 + percent / 100);

  const profitPerUnit = price - unitCost;
  const contributionPerUnit = price - costs.variableCostPerUnit;
  const breakeven =
    contributionPerUnit > 0
      ? Math.ceil(costs.fixedCosts / contributionPerUnit)
      : Infinity;

  return {
    price,
    unitCost,
    profitPerUnit,
    markupPercent: unitCost === 0 ? 0 : (profitPerUnit / unitCost) * 100,
    marginPercent: price === 0 ? 0 : (profitPerUnit / price) * 100,
    breakeven,
    contributionPerUnit,
  };
}

export function convertBasisPercent(
  percent: number,
  from: PricingBasis,
  to: PricingBasis
): number {
  if (from === to) return percent;
  if (from === "markup") {
    return Math.round((percent / (1 + percent / 100)) * 10) / 10;
  }
  // 500 is the markup input's max. A margin above ~83.3% is a markup above
  // 500%, which the input would clamp anyway — cap it here so the two agree.
  if (percent >= 100) return 500;
  return Math.min(500, Math.round((percent / (1 - percent / 100)) * 10) / 10);
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

export function comparePerMeasure(
  offers: CompetitorOffer[],
  yourPrice: number,
  yourSize: number
): {
  yourPerMeasure: number;
  rows: PerMeasureRow[];
  position: { min: number; max: number; average: number; median: number };
} {
  const yourPerMeasure = yourSize <= 0 ? 0 : yourPrice / yourSize;

  const rows: PerMeasureRow[] = [];
  for (const offer of offers) {
    if (offer.size <= 0 || offer.price <= 0) continue;
    const pricePerMeasure = offer.price / offer.size;
    const differencePercent =
      yourSize <= 0
        ? 0
        : ((yourPerMeasure - pricePerMeasure) / pricePerMeasure) * 100;
    rows.push({ id: offer.id, name: offer.name, pricePerMeasure, differencePercent });
  }

  const position = calculateCompetitivePosition(rows.map((r) => r.pricePerMeasure));

  return { yourPerMeasure, rows, position };
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
  if (price < 9) return Math.floor(price);
  const floored = Math.floor(price);
  const lastDigit = floored % 10;
  if (lastDigit === 9) return floored;
  // Step down to nearest number ending in 9
  return floored - lastDigit - 1;
}

export function suggestCharmPrices(
  price: number
): { down: number; up: number } | null {
  if (price < 9) return null;
  const down = suggestPsychologicalPrice(price);
  return { down, up: down + 10 };
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

export type PriceVerdict = "below-cost" | "in-range" | "above-market";

export interface PriceAnchor {
  label: string;
  price: number;
  isChosen: boolean;
}

export function buildPriceLadder(input: {
  unitCost: number;
  costPlusPrice: number;
  chosen: number;
  marketLow?: number; // already converted to the selling unit
  marketHigh?: number; // already converted to the selling unit
}): { anchors: PriceAnchor[]; verdict: PriceVerdict } {
  const anchors: PriceAnchor[] = [
    { label: "Unit cost (floor)", price: input.unitCost, isChosen: false },
    { label: "Cost-plus price", price: input.costPlusPrice, isChosen: false },
    { label: "Your price", price: input.chosen, isChosen: true },
  ];
  if (input.marketLow !== undefined) {
    anchors.push({ label: "Lowest alternative", price: input.marketLow, isChosen: false });
  }
  if (input.marketHigh !== undefined) {
    anchors.push({ label: "Highest alternative", price: input.marketHigh, isChosen: false });
  }

  // Ascending by price. On a tie the chosen price sorts last so it stays
  // visible beside an equal anchor instead of hiding behind it.
  anchors.sort((a, b) => {
    if (a.price === b.price) {
      if (a.isChosen) return 1;
      if (b.isChosen) return -1;
      return 0;
    }
    return a.price - b.price;
  });

  let verdict: PriceVerdict = "in-range";
  if (input.chosen < input.unitCost) {
    verdict = "below-cost";
  } else if (input.marketHigh !== undefined && input.chosen > input.marketHigh) {
    verdict = "above-market";
  }

  return { anchors, verdict };
}

export const PRICING_STRATEGIES = [
  "Cost-Plus",
  "Value-Based",
  "Penetration",
  "Competitive",
  "Bundle",
  "Psychological",
] as const;

export function formatShareLine(input: {
  startup: string;
  product: string;
  price: number;
  unitName: string;
  strategy: string;
  breakeven: number;
}): string {
  const startup = input.startup.trim() || "Startup";
  const product = input.product.trim() || "Product";
  const unitName = input.unitName || "unit";
  const breakeven = input.breakeven === Infinity ? "N/A" : formatNumber(input.breakeven);
  return `${startup} · ${product} · ${formatPHP(input.price)} per ${unitName} · ${input.strategy} · Break-even ${breakeven}`;
}

export interface SavingsItem { id: string; name: string; amount: number }

export function sumSavings(items: SavingsItem[]): number {
  // Negatives are a slip, not a saving — count them as 0 rather than letting
  // one typo cancel a month of real savings.
  // Math.max(0, NaN) is NaN, so check finiteness too.
  return items.reduce(
    (sum, item) => sum + (Number.isFinite(item.amount) ? Math.max(0, item.amount) : 0),
    0
  );
}

export interface PricePoint { price: number; volume: number }

export function compareTwoPrices(
  fixed: number,
  variable: number,
  a: PricePoint,
  b: PricePoint
): {
  profitA: number;
  profitB: number;
  difference: number; // profitB − profitA
  volumeBToMatchA: number; // Math.ceil((profitA + fixed) ÷ (b.price − variable)); Infinity when b.price ≤ variable
} {
  const profitA = a.price * a.volume - (fixed + variable * a.volume);
  const profitB = b.price * b.volume - (fixed + variable * b.volume);
  const difference = profitB - profitA;
  const contribution = b.price - variable;
  const volumeBToMatchA =
    // profitA + fixed is A's contribution; it is negative when A sells below
    // variable cost, and no volume is "needed" then, so floor it at 0.
    contribution <= 0 ? Infinity : Math.max(0, Math.ceil((profitA + fixed) / contribution));
  return { profitA, profitB, difference, volumeBToMatchA };
}

/**
 * What a customer gets back for every ₱1 they spend with you in a month.
 * Value is monthly (what they save or gain); spend is your price × the units
 * one customer buys a month. Null when they spend nothing.
 */
export function calculateCustomerRoi(
  monthlyValue: number,
  price: number,
  unitsPerMonth: number
): { spend: number; roi: number | null } {
  // Same guard as sumSavings: non-finite or negative inputs count as 0.
  const safe = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);
  const spend = safe(price) * safe(unitsPerMonth);
  return { spend, roi: spend > 0 ? safe(monthlyValue) / spend : null };
}

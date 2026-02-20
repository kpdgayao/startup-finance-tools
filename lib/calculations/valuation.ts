export interface BerkusFactor {
  id: string;
  label: string;
  value: number; // 0 to maxValue
  maxValue: number;
}

export interface ScorecardFactor {
  id: string;
  label: string;
  weight: number; // percentage, should sum to 100
  score: number; // multiplier: 0.5 (much worse) to 1.5 (much better), 1.0 = average
}

export interface DCFInputs {
  cashFlows: number[]; // projected annual cash flows
  discountRate: number; // as percentage, e.g. 15 for 15%
  terminalGrowthRate?: number; // optional terminal growth rate
}

export interface VCMethodInputs {
  expectedExitValue: number;
  targetReturnMultiple: number; // e.g. 10x
  expectedDilution: number; // percentage of dilution in future rounds
}

export function calculateDCF(inputs: DCFInputs): number {
  const { cashFlows, discountRate, terminalGrowthRate = 3 } = inputs;
  const rate = discountRate / 100;
  const g = terminalGrowthRate / 100;

  let npv = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    npv += cashFlows[i] / Math.pow(1 + rate, i + 1);
  }

  // Terminal value using Gordon Growth Model
  if (cashFlows.length > 0 && rate > g) {
    const lastCashFlow = cashFlows[cashFlows.length - 1];
    const terminalValue = (lastCashFlow * (1 + g)) / (rate - g);
    npv += terminalValue / Math.pow(1 + rate, cashFlows.length);
  }

  return Math.max(0, npv);
}

export function calculateBerkus(factors: BerkusFactor[]): number {
  const total = factors.reduce((sum, factor) => sum + Math.min(factor.value, factor.maxValue), 0);
  const cap = factors.reduce((sum, factor) => sum + factor.maxValue, 0);
  return Math.min(total, cap);
}

export function calculateScorecard(
  factors: ScorecardFactor[],
  medianValuation: number
): number {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight === 0) return medianValuation;

  const weightedScore = factors.reduce((sum, factor) => {
    const normalizedWeight = factor.weight / totalWeight;
    return sum + normalizedWeight * factor.score;
  }, 0);

  return medianValuation * weightedScore;
}

export function calculateVCMethod(inputs: VCMethodInputs): number {
  const { expectedExitValue, targetReturnMultiple, expectedDilution } = inputs;
  const retentionFactor = 1 - expectedDilution / 100;

  if (targetReturnMultiple <= 0 || retentionFactor <= 0) return 0;

  // Post-money today, grossed up for future dilution
  // VC needs ownership that, after dilution, still delivers target return
  const postMoney = (expectedExitValue / targetReturnMultiple) / retentionFactor;

  return Math.max(0, postMoney);
}

export interface ValuationSummary {
  dcf: number | null;
  berkus: number | null;
  scorecard: number | null;
  vcMethod: number | null;
  average: number;
  range: { min: number; max: number };
}

export function calculateValuationSummary(
  values: { dcf?: number; berkus?: number; scorecard?: number; vcMethod?: number }
): ValuationSummary {
  const entries = Object.entries(values).filter(
    ([, v]) => v !== undefined && v > 0
  ) as [string, number][];

  const nums = entries.map(([, v]) => v);
  const average = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  const min = nums.length > 0 ? Math.min(...nums) : 0;
  const max = nums.length > 0 ? Math.max(...nums) : 0;

  return {
    dcf: values.dcf ?? null,
    berkus: values.berkus ?? null,
    scorecard: values.scorecard ?? null,
    vcMethod: values.vcMethod ?? null,
    average,
    range: { min, max },
  };
}

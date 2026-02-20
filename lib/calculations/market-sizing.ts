export interface TopDownInputs {
  totalMarketSize: number;
  samPercent: number;
  somPercent: number;
}

export interface BottomUpInputs {
  totalCustomers: number;
  targetPercent: number;
  revenuePerCustomer: number;
}

export interface MarketSizeResult {
  tam: number;
  sam: number;
  som: number;
}

export interface RevenueProjection {
  year: number;
  marketShare: number;
  revenue: number;
  grossMargin: number;
  opex: number;
  profit: number;
}

export function calculateTopDown(inputs: TopDownInputs): MarketSizeResult {
  const tam = inputs.totalMarketSize;
  const sam = tam * (inputs.samPercent / 100);
  const som = sam * (inputs.somPercent / 100);
  return { tam, sam, som };
}

export function calculateBottomUp(inputs: BottomUpInputs): MarketSizeResult {
  const targetCustomers = inputs.totalCustomers * (inputs.targetPercent / 100);
  const tam = inputs.totalCustomers * inputs.revenuePerCustomer;
  const sam = targetCustomers * inputs.revenuePerCustomer;
  // SOM is a realistic capture — assume ~10% of SAM for bottom-up
  const som = sam * 0.1;
  return { tam, sam, som };
}

export function projectRevenue(
  som: number,
  marketShares: number[],
  grossMarginPct: number,
  opexPct: number
): RevenueProjection[] {
  return marketShares.map((share, i) => {
    const revenue = som * (share / 100);
    const grossMargin = revenue * (grossMarginPct / 100);
    const opex = grossMargin * (opexPct / 100);
    const profit = grossMargin - opex;

    return {
      year: i + 1,
      marketShare: share,
      revenue,
      grossMargin,
      opex,
      profit,
    };
  });
}

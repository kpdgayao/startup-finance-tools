export interface Founder {
  id: string;
  name: string;
  equity: number; // percentage
}

export interface FundingRound {
  id: string;
  name: string;
  investment: number;
  preMoneyValuation: number;
  esopPool?: number; // percentage to set aside for ESOP
}

export interface CapTableEntry {
  stakeholder: string;
  type: "founder" | "investor" | "esop";
  shares?: number;
  percentage: number;
  roundAdded: string;
}

export interface RoundResult {
  roundName: string;
  preMoney: number;
  investment: number;
  postMoney: number;
  investorEquity: number;
  entries: CapTableEntry[];
}

export function calculatePostMoney(preMoney: number, investment: number): number {
  return preMoney + investment;
}

export function calculateInvestorEquity(investment: number, postMoney: number): number {
  if (postMoney === 0) return 0;
  return (investment / postMoney) * 100;
}

export function calculateExistingEquity(preMoney: number, postMoney: number): number {
  if (postMoney === 0) return 0;
  return (preMoney / postMoney) * 100;
}

export function simulateCapTable(
  founders: Founder[],
  rounds: FundingRound[]
): RoundResult[] {
  const results: RoundResult[] = [];

  // Initial state
  let currentEntries: CapTableEntry[] = founders.map((f) => ({
    stakeholder: f.name,
    type: "founder" as const,
    percentage: f.equity,
    roundAdded: "Founding",
  }));

  results.push({
    roundName: "Founding",
    preMoney: 0,
    investment: 0,
    postMoney: 0,
    investorEquity: 0,
    entries: [...currentEntries],
  });

  for (const round of rounds) {
    const postMoney = calculatePostMoney(round.preMoneyValuation, round.investment);
    const dilutionFactor = round.preMoneyValuation / postMoney;

    // Dilute all existing holders
    currentEntries = currentEntries.map((entry) => ({
      ...entry,
      percentage: entry.percentage * dilutionFactor,
    }));

    // Add ESOP pool if specified (dilutes from pre-money)
    if (round.esopPool && round.esopPool > 0) {
      const esopDilution = round.esopPool / 100;
      currentEntries = currentEntries.map((entry) => ({
        ...entry,
        percentage: entry.percentage * (1 - esopDilution),
      }));

      const existingEsop = currentEntries.find(
        (e) => e.type === "esop" && e.stakeholder === "ESOP Pool"
      );
      if (existingEsop) {
        existingEsop.percentage += round.esopPool;
      } else {
        currentEntries.push({
          stakeholder: "ESOP Pool",
          type: "esop",
          percentage:
            currentEntries.reduce((s, e) => s + e.percentage, 0) > 0
              ? round.esopPool
              : round.esopPool,
          roundAdded: round.name,
        });
      }
    }

    // Add investor
    const investorPct = calculateInvestorEquity(round.investment, postMoney);
    currentEntries.push({
      stakeholder: `${round.name} Investor`,
      type: "investor",
      percentage: investorPct,
      roundAdded: round.name,
    });

    // Normalize to 100%
    const total = currentEntries.reduce((s, e) => s + e.percentage, 0);
    if (total > 0 && Math.abs(total - 100) > 0.01) {
      const factor = 100 / total;
      currentEntries = currentEntries.map((e) => ({
        ...e,
        percentage: e.percentage * factor,
      }));
    }

    results.push({
      roundName: round.name,
      preMoney: round.preMoneyValuation,
      investment: round.investment,
      postMoney,
      investorEquity: investorPct,
      entries: [...currentEntries],
    });
  }

  return results;
}

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
    // Skip empty rounds to avoid NaN from 0/0
    if (round.preMoneyValuation === 0 && round.investment === 0) continue;

    const postMoney = calculatePostMoney(round.preMoneyValuation, round.investment);
    const dilutionFactor = postMoney > 0 ? round.preMoneyValuation / postMoney : 1;

    // Step 1: Dilute all existing holders by the investor round
    currentEntries = currentEntries.map((entry) => ({
      ...entry,
      percentage: entry.percentage * dilutionFactor,
    }));

    // Step 2: Add investor at their correct percentage
    const investorPct = calculateInvestorEquity(round.investment, postMoney);
    currentEntries.push({
      stakeholder: `${round.name} Investor`,
      type: "investor",
      percentage: investorPct,
      roundAdded: round.name,
    });

    // Step 3: ESOP carved from existing holders (not investor)
    if (round.esopPool && round.esopPool > 0) {
      const esopFraction = round.esopPool / 100;

      // Calculate ESOP size from non-investor existing equity
      const existingNonInvestorPct = currentEntries
        .filter((e) => !(e.type === "investor" && e.roundAdded === round.name))
        .reduce((s, e) => s + e.percentage, 0);

      const esopPct = existingNonInvestorPct * esopFraction;

      // Dilute non-investor holders proportionally
      currentEntries = currentEntries.map((entry) => {
        if (entry.type === "investor" && entry.roundAdded === round.name) return entry;
        return { ...entry, percentage: entry.percentage * (1 - esopFraction) };
      });

      const existingEsop = currentEntries.find(
        (e) => e.type === "esop" && e.stakeholder === "ESOP Pool"
      );
      if (existingEsop) {
        existingEsop.percentage += esopPct;
      } else {
        currentEntries.push({
          stakeholder: "ESOP Pool",
          type: "esop",
          percentage: esopPct,
          roundAdded: round.name,
        });
      }
    }

    // Safety: normalize only for floating-point drift
    const total = currentEntries.reduce((s, e) => s + e.percentage, 0);
    if (total > 0 && Math.abs(total - 100) > 0.001) {
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

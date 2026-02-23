export interface SafeInputs {
  investmentAmount: number;
  valuationCap: number;
  discountRate: number; // e.g. 20 for 20%
}

export interface NoteInputs extends SafeInputs {
  interestRate: number; // annual, e.g. 5 for 5%
  termMonths: number;
}

export interface PricedRoundInputs {
  preMoneyValuation: number;
  roundSize: number;
}

export interface ConversionResult {
  label: string;
  effectivePricePerShare: number;
  sharesIssued: number;
  ownershipPercent: number;
  investmentValue: number;
}

export interface SafeConversionResult {
  capPrice: number;
  discountPrice: number;
  effectivePrice: number;
  conversionMethod: "cap" | "discount";
  principalConverted: number;
  sharesIssued: number;
  ownershipPercent: number;
  scenarios: ConversionResult[];
  pieData: { name: string; value: number }[];
}

export function calculateSafeConversion(
  safe: SafeInputs,
  round: PricedRoundInputs
): SafeConversionResult | null {
  if (
    round.preMoneyValuation <= 0 ||
    round.roundSize <= 0 ||
    safe.investmentAmount <= 0
  )
    return null;

  const postMoney = round.preMoneyValuation + round.roundSize;
  const pricePerShare = postMoney / 10_000_000; // assume 10M shares outstanding

  // Cap price: investment buys shares as if company valued at cap
  const capPrice =
    safe.valuationCap > 0 ? safe.valuationCap / 10_000_000 : Infinity;

  // Discount price: round price × (1 - discount)
  const discountPrice = pricePerShare * (1 - safe.discountRate / 100);

  // Effective price is the lower of cap or discount (better deal for investor)
  const effectivePrice = Math.min(
    capPrice === Infinity ? discountPrice : capPrice,
    discountPrice
  );
  const conversionMethod =
    capPrice <= discountPrice && capPrice !== Infinity ? "cap" : "discount";

  const principalConverted = safe.investmentAmount;
  const safeShares = principalConverted / effectivePrice;
  const roundShares = round.roundSize / pricePerShare;
  const totalShares = 10_000_000 + safeShares + roundShares;
  const ownershipPercent = (safeShares / totalShares) * 100;

  // Build 3 scenarios
  const scenarios = buildConversionScenarios(
    safe,
    round,
    pricePerShare,
    capPrice,
    discountPrice
  );

  const founderPercent =
    100 -
    ownershipPercent -
    (roundShares / totalShares) * 100;

  const pieData = [
    { name: "Founders", value: founderPercent },
    { name: "SAFE Holder", value: ownershipPercent },
    { name: "New Investors", value: (roundShares / totalShares) * 100 },
  ];

  return {
    capPrice,
    discountPrice,
    effectivePrice,
    conversionMethod,
    principalConverted,
    sharesIssued: safeShares,
    ownershipPercent,
    scenarios,
    pieData,
  };
}

export function calculateNoteConversion(
  note: NoteInputs,
  round: PricedRoundInputs
): SafeConversionResult | null {
  // Accrue interest on principal
  const accruedInterest =
    note.investmentAmount *
    (note.interestRate / 100) *
    (note.termMonths / 12);
  const totalPrincipal = note.investmentAmount + accruedInterest;

  // Treat as SAFE with inflated principal
  return calculateSafeConversion(
    { ...note, investmentAmount: totalPrincipal },
    round
  );
}

function buildConversionScenarios(
  safe: SafeInputs,
  round: PricedRoundInputs,
  pricePerShare: number,
  capPrice: number,
  discountPrice: number
): ConversionResult[] {
  const postMoney = round.preMoneyValuation + round.roundSize;
  const scenarios: ConversionResult[] = [];

  // Scenario 1: With cap
  if (safe.valuationCap > 0) {
    const shares = safe.investmentAmount / capPrice;
    const roundShares = round.roundSize / pricePerShare;
    const total = 10_000_000 + shares + roundShares;
    scenarios.push({
      label: "With Cap",
      effectivePricePerShare: capPrice,
      sharesIssued: shares,
      ownershipPercent: (shares / total) * 100,
      investmentValue: safe.investmentAmount,
    });
  }

  // Scenario 2: With discount
  if (safe.discountRate > 0) {
    const shares = safe.investmentAmount / discountPrice;
    const roundShares = round.roundSize / pricePerShare;
    const total = 10_000_000 + shares + roundShares;
    scenarios.push({
      label: "With Discount",
      effectivePricePerShare: discountPrice,
      sharesIssued: shares,
      ownershipPercent: (shares / total) * 100,
      investmentValue: safe.investmentAmount,
    });
  }

  // Scenario 3: No SAFE (just the priced round)
  {
    const roundShares = round.roundSize / pricePerShare;
    const total = 10_000_000 + roundShares;
    scenarios.push({
      label: "No SAFE",
      effectivePricePerShare: pricePerShare,
      sharesIssued: 0,
      ownershipPercent: 0,
      investmentValue: 0,
    });
  }

  return scenarios;
}

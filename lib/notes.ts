export type NoteTone = "rule" | "watch" | "ph";

export interface MarginNoteData {
  tone: NoteTone;
  body: string; // markdown — may contain formulas, links to Learn modules
}

export const NOTES: Record<string, MarginNoteData[]> = {
  "valuation-calculator": [
    {
      tone: "rule",
      body: "No single valuation method is right. I always run at least two — usually Scorecard or Berkus for pre-revenue, DCF or Revenue Multiple once there's traction — and treat the spread as the negotiation range, not a single number to defend.",
    },
    {
      tone: "watch",
      body: "The biggest mistake I see is founders anchoring on a top-down market size and deriving valuation from it. Investors discount that hard. A bottom-up estimate (real customers × real ARPU) survives due diligence; a 1% of a 10B market claim does not.",
    },
    {
      tone: "ph",
      body: "For PH pre-revenue startups, the Scorecard method lands better than DCF — comparable funded startups in the region give you a defensible anchor, whereas 5-year cash-flow projections for a company with no revenue are fiction the investor will politely ignore.",
    },
  ],
  "equity-simulator": [
    {
      tone: "rule",
      body: "Founder equity should align with contributions, not with equal splits. I've seen equal three-way splits kill companies when one founder stops showing up. Vesting — usually 4 years with a 1-year cliff — is non-negotiable before anyone writes a check.",
    },
    {
      tone: "watch",
      body: "Carve out the ESOP pool before pricing the round, not after. If you set aside 10% after investors come in, the dilution falls entirely on the founders. Set it first and the dilution is shared.",
    },
    {
      tone: "ph",
      body: "Typical PH founder ownership at seed lands 60–80%, investor 10–40%. Going below 60% founder ownership at the first priced round is a red flag for later investors — it signals the cap table is already heavy before the hard work starts.",
    },
  ],
  "safe-calculator": [
    {
      tone: "rule",
      body: "A SAFE is not priced equity — it converts at a later round, so the cap and the discount are the only two numbers that matter today. I treat the cap as my downside and the discount (usually 20%) as my reward for taking the early risk.",
    },
    {
      tone: "watch",
      body: "Stacking SAFEs with different caps distorts the cap table in ways most founders don't model until it's too late. Run the conversion at two or three different next-round valuations before you sign the second SAFE — the ownership outcomes can swing wildly.",
    },
    {
      tone: "ph",
      body: "SAFEs are still uncommon enough in the Philippines that some early investors will push for convertible notes instead. Notes carry interest and a maturity date SAFEs don't — if you're choosing, the SAFE is friendlier to the founder. Push back gently but push back.",
    },
  ],
  "burn-rate": [
    {
      tone: "rule",
      body: "I size every raise to cover 12–18 months of cash burn. Less than 12 and you're back fundraising before the work lands; more than 18 and you're diluting for capital you don't yet need. The answer is almost always in that band.",
    },
    {
      tone: "watch",
      body: "Profitable on paper and out of cash are two different things. A negative cash flow month is the warning, not a negative P&L. I review cash flow weekly — the income statement can look fine while the bank account empties.",
    },
    {
      tone: "ph",
      body: "Build a cash reserve of 3–6 months of operating expenses before you scale. PH grants and donor funding can disburse late — I've seen EU-PH partnership tranches slip by a quarter. The reserve is what keeps you from raising a bridge at punitive terms.",
    },
  ],
  "unit-economics": [
    {
      tone: "rule",
      body: "Anything under 3× and you're buying revenue, not building a business. Above 5× usually means you're underspending on growth — not that you're efficient.\n\nFor PH SaaS at seed, I look for 3–4× with payback under 12 months. Grant-funded companies can run leaner because the capital isn't priced.",
    },
    {
      tone: "watch",
      body: "Churn is the silent killer of LTV. A 4.5% monthly churn halves your LTV compared to a 2% churn — and most founders model LTV on the optimistic number. Run the calculation at your real churn, not the one you hope to hit.",
    },
  ],
  "compliance-checklist": [
    {
      tone: "ph",
      body: "Register in this order: DTI or SEC first, then BIR, then the local business permit, then SSS/PhilHealth/HDMF. Each step depends on the one before it — skipping ahead wastes weeks, not days.",
    },
    {
      tone: "ph",
      body: "Budget for the BIR filing cadence, not just registration. Monthly, quarterly, and annual filings add up to 34 forms a year for a small corporation. Missing a deadline costs more in penalties than the compliance itself — set calendar reminders the day you get your TIN.",
    },
    {
      tone: "watch",
      body: "Keep personal and business accounts separate from day one. Mixing them is the most common startup accounting mistake I see — it turns tax filing into a forensic exercise and undermines your books when an investor asks for due diligence.",
    },
  ],
};

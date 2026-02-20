export const TOOLS = [
  {
    id: "valuation-calculator",
    name: "Valuation Calculator",
    description: "Multi-method startup valuation (DCF, Berkus, Scorecard, VC Method)",
    href: "/tools/valuation-calculator",
    icon: "TrendingUp",
  },
  {
    id: "equity-simulator",
    name: "Equity & Cap Table",
    description: "Simulate funding rounds, dilution, and ownership across stages",
    href: "/tools/equity-simulator",
    icon: "PieChart",
  },
  {
    id: "pre-post-money",
    name: "Pre/Post-Money",
    description: "Quick calculator for pre-money, post-money, and equity stakes",
    href: "/tools/pre-post-money",
    icon: "Calculator",
  },
  {
    id: "burn-rate",
    name: "Burn Rate & Runway",
    description: "Calculate your runway and model expense scenarios",
    href: "/tools/burn-rate",
    icon: "Flame",
  },
  {
    id: "pricing-calculator",
    name: "Pricing Calculator",
    description: "6 pricing strategies with unit economics analysis",
    href: "/tools/pricing-calculator",
    icon: "Tag",
  },
  {
    id: "cash-flow-forecast",
    name: "Cash Flow Forecaster",
    description: "12-month cash flow projection with visual analysis",
    href: "/tools/cash-flow-forecast",
    icon: "BarChart3",
  },
] as const;

export const BERKUS_FACTORS = [
  { id: "sound-idea", label: "Sound Idea (Basic Value)", maxValue: 500000 },
  { id: "prototype", label: "Prototype (Reducing Technology Risk)", maxValue: 500000 },
  { id: "management", label: "Quality Management Team", maxValue: 500000 },
  { id: "strategic-relationships", label: "Strategic Relationships", maxValue: 500000 },
  { id: "product-rollout", label: "Product Rollout / Sales", maxValue: 500000 },
] as const;

export const SCORECARD_FACTORS = [
  { id: "management", label: "Strength of Management Team", defaultWeight: 30 },
  { id: "market-size", label: "Size of the Opportunity", defaultWeight: 25 },
  { id: "product", label: "Product / Technology", defaultWeight: 15 },
  { id: "competitive", label: "Competitive Environment", defaultWeight: 10 },
  { id: "marketing", label: "Marketing / Sales Channels", defaultWeight: 10 },
  { id: "need-for-funding", label: "Need for Additional Funding", defaultWeight: 5 },
  { id: "other", label: "Other Factors", defaultWeight: 5 },
] as const;

export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ec4899",
];

export const RUNWAY_ZONES = {
  RED: 3,
  YELLOW: 6,
} as const;

export const DEFAULT_DISCOUNT_RATE = 15;
export const DEFAULT_PROJECTION_YEARS = 5;

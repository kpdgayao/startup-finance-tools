export const TOOLS = [
  {
    id: "valuation-calculator",
    name: "Valuation Calculator",
    description: "Multi-method startup valuation (DCF, Berkus, Scorecard, VC, Revenue Multiple)",
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
  {
    id: "market-sizing",
    name: "Market Sizing",
    description: "Estimate TAM, SAM, SOM with top-down and bottom-up methods",
    href: "/tools/market-sizing",
    icon: "Target",
  },
  {
    id: "unit-economics",
    name: "Unit Economics",
    description: "Calculate CAC, LTV, payback period, and break-even",
    href: "/tools/unit-economics",
    icon: "Users",
  },
  {
    id: "financial-model-builder",
    name: "Financial Model",
    description: "3-year integrated P&L, Balance Sheet, and Cash Flow model",
    href: "/tools/financial-model-builder",
    icon: "FileSpreadsheet",
  },
  {
    id: "compliance-checklist",
    name: "PH Compliance Checklist",
    description: "SEC, DTI, BIR registration & ongoing compliance for Filipino startups",
    href: "/tools/compliance-checklist",
    icon: "ClipboardCheck",
  },
  {
    id: "self-assessment",
    name: "Finance Self-Assessment",
    description: "Test your startup finance knowledge across 5 key categories",
    href: "/tools/self-assessment",
    icon: "GraduationCap",
  },
  {
    id: "fundraising-guide",
    name: "Fundraising Stage Guide",
    description: "R&D to Scaling lifecycle guide with checklists and funding sources",
    href: "/tools/fundraising-guide",
    icon: "Map",
  },
] as const;

export const LEARN_MODULES = [
  {
    id: "pricing-your-product",
    name: "Pricing Your Product",
    href: "/learn/pricing-your-product",
    icon: "Tag",
    relatedTool: "/tools/pricing-calculator",
  },
  {
    id: "reading-financial-statements",
    name: "Reading Financial Statements",
    href: "/learn/reading-financial-statements",
    icon: "FileSpreadsheet",
    relatedTool: "/tools/financial-model-builder",
  },
  {
    id: "startup-valuation",
    name: "Startup Valuation",
    href: "/learn/startup-valuation",
    icon: "TrendingUp",
    relatedTool: "/tools/valuation-calculator",
  },
  {
    id: "managing-cash-flow",
    name: "Managing Cash Flow",
    href: "/learn/managing-cash-flow",
    icon: "Flame",
    relatedTool: "/tools/burn-rate",
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
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
  "#14b8a6", // teal
];

export const RUNWAY_ZONES = {
  RED: 3,
  YELLOW: 6,
} as const;

export const DEFAULT_DISCOUNT_RATE = 15;
export const DEFAULT_PROJECTION_YEARS = 5;

export type QuizCategory =
  | "financial-statements"
  | "valuation"
  | "cash-management"
  | "fundraising"
  | "compliance"
  | "revenue-pricing";

export interface QuizQuestion {
  id: string;
  category: QuizCategory;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CategoryScore {
  category: QuizCategory;
  label: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface QuizResult {
  overallScore: number;
  overallPercentage: number;
  totalQuestions: number;
  profileLabel: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  categoryScores: CategoryScore[];
  weakCategories: QuizCategory[];
  recommendedTools: { id: string; name: string; reason: string }[];
}

const CATEGORY_LABELS: Record<QuizCategory, string> = {
  "financial-statements": "Financial Statements",
  valuation: "Valuation",
  "cash-management": "Cash Management",
  fundraising: "Fundraising",
  compliance: "Compliance",
  "revenue-pricing": "Revenue & Pricing",
};

const CATEGORY_TOOL_MAP: Record<QuizCategory, { id: string; name: string; reason: string }[]> = {
  "financial-statements": [
    { id: "financial-model-builder", name: "Financial Model Builder", reason: "Practice building linked P&L, Balance Sheet, and Cash Flow statements" },
    { id: "cash-flow-forecast", name: "Cash Flow Forecaster", reason: "Understand cash flow timing and DSO/DPO dynamics" },
  ],
  valuation: [
    { id: "valuation-calculator", name: "Valuation Calculator", reason: "Practice all 5 valuation methods with real numbers" },
    { id: "pre-post-money", name: "Pre/Post-Money Calculator", reason: "Master the relationship between pre-money, post-money, and equity" },
  ],
  "cash-management": [
    { id: "burn-rate", name: "Burn Rate & Runway", reason: "Model your runway and practice what-if scenarios" },
    { id: "cash-flow-forecast", name: "Cash Flow Forecaster", reason: "Build 12-month cash projections" },
    { id: "startup-costs", name: "Startup Cost Estimator", reason: "Estimate PH-specific registration and launch costs" },
  ],
  fundraising: [
    { id: "equity-simulator", name: "Equity & Cap Table", reason: "Simulate funding rounds and understand dilution" },
    { id: "unit-economics", name: "Unit Economics", reason: "Calculate the metrics investors care about most" },
    { id: "safe-calculator", name: "SAFE Calculator", reason: "Model SAFE and convertible note conversions" },
    { id: "fundraising-guide", name: "Fundraising Guide", reason: "Follow the full fundraising lifecycle from R&D to scaling" },
  ],
  compliance: [
    { id: "compliance-checklist", name: "PH Compliance Checklist", reason: "Walk through SEC, DTI, BIR, and LGU registration step by step" },
  ],
  "revenue-pricing": [
    { id: "pricing-calculator", name: "Pricing Calculator", reason: "Explore 6 pricing strategies and find the right model for your product" },
    { id: "market-sizing", name: "Market Sizing", reason: "Calculate your TAM, SAM, and SOM with top-down and bottom-up methods" },
    { id: "break-even", name: "Break-Even Analysis", reason: "Find your break-even point and model what-if scenarios" },
  ],
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // Financial Statements (4 questions)
  {
    id: "fs-1",
    category: "financial-statements",
    question: "Which financial statement shows a company's profitability over a period of time?",
    options: ["Balance Sheet", "Income Statement (P&L)", "Cash Flow Statement", "Statement of Equity"],
    correctIndex: 1,
    explanation: "The Income Statement (Profit & Loss) shows revenues minus expenses over a period. The Balance Sheet shows financial position at a point in time.",
  },
  {
    id: "fs-2",
    category: "financial-statements",
    question: "If a company has ₱10M in assets and ₱4M in liabilities, what is the shareholders' equity?",
    options: ["₱14M", "₱6M", "₱4M", "₱10M"],
    correctIndex: 1,
    explanation: "Assets = Liabilities + Equity. So Equity = ₱10M - ₱4M = ₱6M. This is the fundamental accounting equation.",
  },
  {
    id: "fs-3",
    category: "financial-statements",
    question: "A company is profitable but running out of cash. Which statement explains why?",
    options: ["Income Statement", "Balance Sheet", "Cash Flow Statement", "None — profit always means cash"],
    correctIndex: 2,
    explanation: "Profit ≠ cash. The Cash Flow Statement reconciles the difference through working capital changes, CapEx, and financing activities. A company can be profitable but cash-poor due to slow collections or heavy investment.",
  },
  {
    id: "fs-4",
    category: "financial-statements",
    question: "What does EBITDA exclude that Net Income includes?",
    options: ["Revenue", "Operating expenses", "Depreciation, amortization, interest, and taxes", "Cost of goods sold"],
    correctIndex: 2,
    explanation: "EBITDA = Earnings Before Interest, Taxes, Depreciation, and Amortization. It measures operating profitability without the effects of financing decisions, tax jurisdiction, and non-cash accounting charges.",
  },

  // Valuation (4 questions)
  {
    id: "val-1",
    category: "valuation",
    question: "Which valuation method is most appropriate for a pre-revenue startup?",
    options: ["DCF (Discounted Cash Flow)", "Revenue Multiple", "Berkus Method", "Comparable Transactions"],
    correctIndex: 2,
    explanation: "The Berkus Method values pre-revenue startups based on qualitative factors (team, idea, prototype, relationships, sales). DCF and Revenue Multiple require financial data that pre-revenue startups don't have.",
  },
  {
    id: "val-2",
    category: "valuation",
    question: "In DCF valuation, a higher discount rate results in:",
    options: ["Higher valuation", "Lower valuation", "No change in valuation", "It depends on cash flows"],
    correctIndex: 1,
    explanation: "A higher discount rate means future cash flows are worth less today. Early-stage startups use higher discount rates (25-50%) because they're riskier, resulting in lower present values.",
  },
  {
    id: "val-3",
    category: "valuation",
    question: "A SaaS startup with ₱8M ARR is valued at ₱48M. What revenue multiple is being used?",
    options: ["4x", "6x", "8x", "48x"],
    correctIndex: 1,
    explanation: "Revenue Multiple = Valuation / Revenue = ₱48M / ₱8M = 6x. This is typical for a growing SaaS company with good retention.",
  },
  {
    id: "val-4",
    category: "valuation",
    question: "Why do investors prefer to see multiple valuation methods rather than just one?",
    options: [
      "Each method has different biases and assumptions",
      "It's a legal requirement",
      "Only one method is accurate",
      "Multiple methods always give the same answer",
    ],
    correctIndex: 0,
    explanation: "No single method is 'correct.' DCF assumes predictable cash flows, Berkus is qualitative, VC Method depends on exit assumptions. A range from multiple methods gives a more reliable picture.",
  },

  // Cash Management (4 questions)
  {
    id: "cm-1",
    category: "cash-management",
    question: "Your startup has ₱3M in cash and a net burn rate of ₱500K/month. What is your runway?",
    options: ["3 months", "6 months", "12 months", "500 months"],
    correctIndex: 1,
    explanation: "Runway = Cash / Net Burn = ₱3M / ₱500K = 6 months. This puts you in the YELLOW ZONE — you should start preparing for your next fundraise.",
  },
  {
    id: "cm-2",
    category: "cash-management",
    question: "What does a DSO of 60 days mean?",
    options: [
      "You pay suppliers in 60 days",
      "It takes 60 days on average to collect payment from customers",
      "Your cash lasts 60 days",
      "Your product takes 60 days to build",
    ],
    correctIndex: 1,
    explanation: "DSO (Days Sales Outstanding) measures how long it takes to collect payment after a sale. High DSO means cash is tied up in receivables, creating a working capital gap.",
  },
  {
    id: "cm-3",
    category: "cash-management",
    question: "Kevin's rule: when running low on cash, you should first:",
    options: ["Raise a new round immediately", "Cut expenses", "Increase prices 50%", "Hire a sales team"],
    correctIndex: 1,
    explanation: "Kevin's rule: cut expenses before chasing revenue. A 20% expense cut extends runway immediately, while a 20% revenue increase takes months to materialize. Cutting buys you time to execute other strategies.",
  },
  {
    id: "cm-4",
    category: "cash-management",
    question: "Which of these is typically the LARGEST initial cost when registering a corporation in the Philippines?",
    options: [
      "Barangay clearance",
      "SEC registration fee",
      "BIR registration (Form 0605)",
      "Mayor's/business permit",
    ],
    correctIndex: 3,
    explanation: "Mayor's/business permit fees vary by city but are typically the largest registration cost, often ₱5K-₱30K+ depending on location and capitalization. SEC fees, BIR's ₱500 registration, and barangay clearance are all relatively small by comparison.",
  },

  // Fundraising (6 questions)
  {
    id: "fr-1",
    category: "fundraising",
    question: "Pre-money valuation is ₱20M and the investment is ₱5M. What is the investor's equity stake?",
    options: ["25%", "20%", "15%", "5%"],
    correctIndex: 1,
    explanation: "Post-money = Pre-money + Investment = ₱20M + ₱5M = ₱25M. Investor equity = ₱5M / ₱25M = 20%. The pre-money valuation is what determines dilution.",
  },
  {
    id: "fr-2",
    category: "fundraising",
    question: "After a Series A where founders give up 25%, and a Series B where they give up another 20%, how much do founders retain?",
    options: ["55%", "60%", "75%", "80%"],
    correctIndex: 1,
    explanation: "Dilution is multiplicative, not additive. After Series A: 100% × 75% = 75%. After Series B: 75% × 80% = 60%. Each round dilutes your remaining stake, not your original stake.",
  },
  {
    id: "fr-3",
    category: "fundraising",
    question: "What is a typical ESOP pool size for an early-stage startup?",
    options: ["1-5%", "10-20%", "30-40%", "50%+"],
    correctIndex: 1,
    explanation: "10-20% is standard for an ESOP pool to attract key hires. This is carved out before each funding round, which means it dilutes founders more than investors.",
  },
  {
    id: "fr-4",
    category: "fundraising",
    question: "What LTV:CAC ratio do investors consider healthy?",
    options: ["1:1", "3:1 or higher", "Less than 1:1", "It doesn't matter"],
    correctIndex: 1,
    explanation: "An LTV:CAC ratio of 3:1 means each customer generates 3x more value than the cost to acquire them. Below 1:1 means you're losing money per customer. Above 5:1 may mean you're underinvesting in growth.",
  },
  {
    id: "fr-5",
    category: "fundraising",
    question: "What happens to a SAFE (Simple Agreement for Future Equity) when a startup raises a priced round?",
    options: [
      "It expires worthless",
      "It converts to equity at a discount or valuation cap",
      "It gets repaid as debt with interest",
      "Nothing — SAFEs are permanent instruments",
    ],
    correctIndex: 1,
    explanation: "A SAFE converts to equity when a qualifying priced round occurs. The investor gets shares at either a discounted price or a price based on the valuation cap — whichever gives them more shares.",
  },
  {
    id: "fr-6",
    category: "fundraising",
    question: "A SAFE has a ₱20M valuation cap and a 20% discount. The Series A prices at ₱30M pre-money. Which conversion term gives the SAFE investor a better deal?",
    options: [
      "The valuation cap (₱20M)",
      "The discount (20% off ₱30M = ₱24M)",
      "They're exactly the same",
      "Neither applies at this valuation",
    ],
    correctIndex: 0,
    explanation: "The cap converts at ₱20M effective valuation, the discount at ₱30M × 80% = ₱24M. Lower effective valuation = more shares per peso invested. The SAFE holder gets whichever is better for them.",
  },

  // Compliance (3 questions)
  {
    id: "comp-1",
    category: "compliance",
    question: "Under Philippine law, where does a corporation register?",
    options: ["DTI (Department of Trade and Industry)", "SEC (Securities and Exchange Commission)", "BIR (Bureau of Internal Revenue)", "Barangay Hall"],
    correctIndex: 1,
    explanation: "Corporations and partnerships register with the SEC. Only sole proprietorships register with the DTI. BIR registration is required for all business types but is for tax purposes, not business formation.",
  },
  {
    id: "comp-2",
    category: "compliance",
    question: "Under the CREATE Act, what is the corporate income tax rate for most Philippine businesses?",
    options: ["30%", "25%", "20%", "12%"],
    correctIndex: 1,
    explanation: "The CREATE Act (2021) reduced the corporate income tax rate to 25%. Small domestic corporations (net taxable income ≤ ₱5M and total assets ≤ ₱100M) get a reduced rate of 20%.",
  },
  {
    id: "comp-3",
    category: "compliance",
    question: "What happens if you file BIR returns late?",
    options: [
      "Nothing, there's a grace period",
      "25% surcharge + 20% annual interest on unpaid tax",
      "A small ₱100 penalty",
      "Only a warning for the first offense",
    ],
    correctIndex: 1,
    explanation: "BIR penalties are harsh: 25% surcharge on the tax due + 20% annual interest. Penalties compound quickly. Even if you have zero tax due, you must still file — failure to file is a separate violation.",
  },

  // Revenue & Pricing (4 questions)
  {
    id: "rp-1",
    category: "revenue-pricing",
    question: "Your startup has ₱200K/month in fixed costs and a 40% contribution margin. What is your monthly break-even revenue?",
    options: ["₱200K", "₱500K", "₱800K", "₱2M"],
    correctIndex: 1,
    explanation: "Break-even Revenue = Fixed Costs / Contribution Margin = ₱200K / 0.40 = ₱500K. Below this revenue, you lose money each month; above it, you're profitable.",
  },
  {
    id: "rp-2",
    category: "revenue-pricing",
    question: "Which pricing strategy sets price based on perceived customer value rather than cost?",
    options: ["Cost-plus pricing", "Value-based pricing", "Penetration pricing", "Freemium"],
    correctIndex: 1,
    explanation: "Value-based pricing captures willingness to pay. Cost-plus adds a markup to costs. Penetration underprices to gain share. Freemium gives a free tier — it's a distribution model, not a pricing method.",
  },
  {
    id: "rp-3",
    category: "revenue-pricing",
    question: "Your product serves Filipino SMEs. There are 1M SMEs in the Philippines, 200K use software like yours, and you can realistically reach 5K in year one. What is your SOM?",
    options: ["1M SMEs (TAM)", "200K SMEs (SAM)", "5K SMEs (SOM)", "None of these"],
    correctIndex: 2,
    explanation: "SOM (Serviceable Obtainable Market) is the realistic share you can capture short-term. TAM = total market (1M), SAM = addressable segment (200K), SOM = what you can actually win (5K).",
  },
  {
    id: "rp-4",
    category: "revenue-pricing",
    question: "A product sells for ₱1,000 with ₱600 in variable costs. What is the contribution margin?",
    options: ["60%", "40%", "₱400", "Both 40% and ₱400"],
    correctIndex: 3,
    explanation: "Contribution margin = (Price - Variable Cost) / Price = ₱400 / ₱1,000 = 40%. It can be expressed as a percentage (40%) or absolute value (₱400 per unit). Both are correct.",
  },
];

export function calculateQuizResult(answers: Record<string, number>): QuizResult {
  const categories: QuizCategory[] = [
    "financial-statements",
    "valuation",
    "cash-management",
    "fundraising",
    "compliance",
    "revenue-pricing",
  ];

  let totalCorrect = 0;
  const categoryScores: CategoryScore[] = categories.map((cat) => {
    const questions = QUIZ_QUESTIONS.filter((q) => q.category === cat);
    const correct = questions.filter((q) => answers[q.id] === q.correctIndex).length;
    totalCorrect += correct;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      correct,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
    };
  });

  const totalQuestions = QUIZ_QUESTIONS.length;
  const overallPercentage = Math.round((totalCorrect / totalQuestions) * 100);

  let profileLabel: QuizResult["profileLabel"];
  if (overallPercentage >= 85) profileLabel = "Expert";
  else if (overallPercentage >= 65) profileLabel = "Advanced";
  else if (overallPercentage >= 40) profileLabel = "Intermediate";
  else profileLabel = "Beginner";

  const weakCategories = categoryScores
    .filter((cs) => cs.percentage < 50)
    .sort((a, b) => a.percentage - b.percentage)
    .map((cs) => cs.category);

  const recommendedTools = weakCategories.flatMap(
    (cat) => CATEGORY_TOOL_MAP[cat]
  ).filter((tool, index, self) =>
    self.findIndex((t) => t.id === tool.id) === index
  );

  return {
    overallScore: totalCorrect,
    overallPercentage,
    totalQuestions,
    profileLabel,
    categoryScores,
    weakCategories,
    recommendedTools,
  };
}

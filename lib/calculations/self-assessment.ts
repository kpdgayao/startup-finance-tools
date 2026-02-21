export type QuizCategory =
  | "financial-statements"
  | "valuation"
  | "cash-management"
  | "fundraising"
  | "compliance";

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
  ],
  fundraising: [
    { id: "equity-simulator", name: "Equity & Cap Table", reason: "Simulate funding rounds and understand dilution" },
    { id: "unit-economics", name: "Unit Economics", reason: "Calculate the metrics investors care about most" },
  ],
  compliance: [
    { id: "compliance-checklist", name: "PH Compliance Checklist", reason: "Walk through SEC, DTI, BIR, and LGU registration step by step" },
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

  // Cash Management (3 questions)
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

  // Fundraising (4 questions)
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
];

export function calculateQuizResult(answers: Record<string, number>): QuizResult {
  const categories: QuizCategory[] = [
    "financial-statements",
    "valuation",
    "cash-management",
    "fundraising",
    "compliance",
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

// Fundraising Stage Guide — Data + Logic

export type FundraisingStage =
  | "research"
  | "proof-of-concept"
  | "fundraising"
  | "operations"
  | "scaling";

export interface FundingSource {
  name: string;
  description: string;
}

export interface StageInfo {
  id: FundraisingStage;
  label: string;
  description: string;
  valuationRange: { min: number; max: number };
  fundingSources: FundingSource[];
  keyMetrics: string[];
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  tips?: string;
  dependsOn?: string[];
  relatedToolId?: string;
}

export interface StageSummary {
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  itemsRemaining: number;
}

export const STAGE_ORDER: FundraisingStage[] = [
  "research",
  "proof-of-concept",
  "fundraising",
  "operations",
  "scaling",
];

export const STAGE_LABELS: Record<FundraisingStage, string> = {
  research: "R&D",
  "proof-of-concept": "Proof of Concept",
  fundraising: "Fundraising",
  operations: "Operations",
  scaling: "Scaling",
};

export const STAGE_COLORS: Record<FundraisingStage, string> = {
  research: "bg-blue-500",
  "proof-of-concept": "bg-amber-500",
  fundraising: "bg-green-500",
  operations: "bg-purple-500",
  scaling: "bg-red-500",
};

const STAGE_DATA: Record<FundraisingStage, StageInfo> = {
  research: {
    id: "research",
    label: "R&D",
    description:
      "Validate the problem exists, understand the market, and build your first prototype. This is the foundation — skip it and everything built on top is shaky.",
    valuationRange: { min: 0, max: 5000000 },
    fundingSources: [
      { name: "Bootstrapping", description: "Personal savings, side income" },
      {
        name: "Friends & Family",
        description: "Small checks from your network (₱100K–₱1M)",
      },
      {
        name: "Grants",
        description: "DOST, DICT, or university innovation grants",
      },
    ],
    keyMetrics: [
      "Number of customer interviews conducted",
      "Problem severity score (must-have vs nice-to-have)",
      "Willingness-to-pay signals",
      "Competitive landscape mapped",
    ],
  },
  "proof-of-concept": {
    id: "proof-of-concept",
    label: "Proof of Concept",
    description:
      "Launch your MVP, acquire first paying customers, and prove the business model works. This is where assumptions meet reality.",
    valuationRange: { min: 5000000, max: 20000000 },
    fundingSources: [
      {
        name: "Angel Investors",
        description: "Individual investors (₱500K–₱5M typical in PH)",
      },
      {
        name: "Accelerators",
        description: "QBO, Launchgarage, Ideaspace (₱500K–₱2M + mentorship)",
      },
      {
        name: "Bootstrapping",
        description: "Revenue from early customers",
      },
    ],
    keyMetrics: [
      "Number of paying customers",
      "Weekly active user engagement",
      "Week-1 retention rate (target: 60%+)",
      "Unit economics baseline (CAC, LTV)",
      "Monthly recurring revenue (MRR)",
    ],
  },
  fundraising: {
    id: "fundraising",
    label: "Fundraising",
    description:
      "Prepare materials, build investor pipeline, negotiate terms, and close your round. Fundraising is a full-time job — plan for 3-6 months.",
    valuationRange: { min: 10000000, max: 50000000 },
    fundingSources: [
      {
        name: "Seed VCs",
        description: "Institutional seed funds (₱5M–₱30M)",
      },
      {
        name: "Angel Syndicates",
        description: "Groups of angels investing together",
      },
      {
        name: "Corporate VCs",
        description: "Strategic investors in your industry",
      },
    ],
    keyMetrics: [
      "Pitch deck conversion rate (meetings/intros)",
      "Term sheet quality and investor reputation",
      "Pre-money valuation vs dilution trade-off",
      "Round size vs 18-month runway coverage",
    ],
  },
  operations: {
    id: "operations",
    label: "Operations",
    description:
      "Deploy capital against milestones, build the team, establish processes, and achieve break-even. This is where startups become real businesses.",
    valuationRange: { min: 30000000, max: 150000000 },
    fundingSources: [
      {
        name: "Series A VCs",
        description: "Growth-stage funds (₱30M–₱150M)",
      },
      {
        name: "Revenue",
        description: "Growing customer revenue should fund operations",
      },
      {
        name: "Debt Financing",
        description: "Bank lines, revenue-based financing",
      },
    ],
    keyMetrics: [
      "Monthly burn rate and runway",
      "Revenue growth rate (MoM)",
      "Path to break-even point",
      "Team productivity (revenue per employee)",
      "DSO < 30 days",
    ],
  },
  scaling: {
    id: "scaling",
    label: "Scaling",
    description:
      "Expand to new markets, build senior leadership, and prepare for Series A/B. Growth should be efficient and repeatable, not chaotic.",
    valuationRange: { min: 100000000, max: 500000000 },
    fundingSources: [
      {
        name: "Series A/B VCs",
        description: "Major growth funds (₱100M+)",
      },
      {
        name: "Strategic Partners",
        description: "Corporate partnerships with revenue sharing",
      },
      {
        name: "International VCs",
        description: "Regional SEA funds targeting Philippines expansion",
      },
    ],
    keyMetrics: [
      "Net Revenue Retention (NRR) > 100%",
      "LTV:CAC ratio > 3:1",
      "Gross margin trend",
      "Market share in primary segment",
      "Efficient growth (Rule of 40)",
    ],
  },
};

const STAGE_CHECKLISTS: Record<FundraisingStage, ChecklistItem[]> = {
  research: [
    {
      id: "r-problem-definition",
      title: "Define the problem clearly",
      description:
        "Write a clear, specific problem statement. Who has this problem? How severe is it? What do they currently do about it? A vague problem leads to a vague product.",
      tips: "Use the format: '[Target customer] struggles with [specific problem] because [root cause], which costs them [quantified impact].'",
    },
    {
      id: "r-customer-interviews",
      title: "Conduct 20+ customer interviews",
      description:
        "Talk to at least 20 potential customers. Focus on understanding their pain points, current solutions, and willingness to pay. Don't pitch — listen.",
      tips: "Use the Mom Test framework: ask about their life, not your idea. 'Tell me about the last time you dealt with [problem]' is better than 'Would you use our product?'",
    },
    {
      id: "r-core-assumptions",
      title: "Document core assumptions",
      description:
        "List every assumption your business rests on: market size, willingness to pay, acquisition channels, unit economics. Rank them by risk and impact.",
      tips: "Create a hypothesis table: Assumption | Evidence For | Evidence Against | Risk Level. Update this as you learn.",
    },
    {
      id: "r-alternatives-analysis",
      title: "Map competitive alternatives",
      description:
        "Identify all alternatives customers use today — direct competitors, indirect solutions, manual workarounds, and doing nothing. Understand why each exists.",
      tips: "Include 'do nothing' as a competitor. In many cases, the biggest competition is inertia. Your solution must be 10x better to overcome switching costs.",
    },
    {
      id: "r-ip-filing",
      title: "Consider IP protection",
      description:
        "Evaluate if you need patents, trademarks, or trade secret protection. File trademark applications early for your brand name in the Philippines (IPOPHL).",
      tips: "Trademark registration at IPOPHL costs ~₱5K-₱10K and takes 6-12 months. Start early — it's first-to-file in the Philippines.",
      dependsOn: ["r-problem-definition"],
    },
    {
      id: "r-prototype",
      title: "Build a prototype or mockup",
      description:
        "Create a minimum viable prototype that demonstrates your core value proposition. It can be a Figma mockup, a landing page, or a basic working version.",
      tips: "Don't build the full product. The goal is to test your riskiest assumption with the least effort. A clickable Figma prototype is often enough.",
      dependsOn: ["r-customer-interviews"],
    },
    {
      id: "r-willingness-to-pay",
      title: "Validate willingness to pay",
      description:
        "Get evidence that customers will pay for your solution. Pre-orders, letters of intent, or pricing survey data. Verbal 'I'd pay for that' is weak evidence.",
      tips: "The strongest signal is someone giving you money. Offer a pre-sale, pilot program, or paid beta. Even ₱1 exchanged is stronger than 100 'I'd buy it' responses.",
      dependsOn: ["r-prototype"],
    },
    {
      id: "r-regulatory-scan",
      title: "Scan regulatory requirements",
      description:
        "Identify industry-specific regulations that apply to your business (BSP for fintech, FDA for food/health, NTC for telecom, etc.). Plan for compliance costs.",
      tips: "In the Philippines, fintech startups may need BSP registration. Health products need FDA. EdTech may need DepEd/CHED accreditation. Check early — regulatory delays can be 6-12 months.",
    },
  ],
  "proof-of-concept": [
    {
      id: "poc-mvp-launch",
      title: "Launch MVP to 10+ pilot customers",
      description:
        "Get your minimum viable product into the hands of at least 10 real users or paying customers. Focus on learning, not perfection.",
      tips: "Pick customers who have the most painful version of the problem. They'll tolerate a rough product and give the most honest feedback.",
    },
    {
      id: "poc-first-revenue",
      title: "Generate first revenue",
      description:
        "Close your first paying customer. This is the most important milestone — it proves someone values your solution enough to pay for it.",
      tips: "Don't give away your product for free 'to build a user base.' Free users behave differently from paying ones. Charge from day one, even if it's a discounted pilot price.",
      dependsOn: ["poc-mvp-launch"],
    },
    {
      id: "poc-engagement-metric",
      title: "Define and track weekly engagement metric",
      description:
        "Identify the one metric that best indicates product value (daily active users, transactions processed, time saved, etc.). Track it weekly.",
      tips: "Choose a metric that reflects value delivered, not vanity. 'Users who completed [core action] this week' is better than 'total signups.'",
      dependsOn: ["poc-mvp-launch"],
    },
    {
      id: "poc-retention",
      title: "Achieve 60%+ Week-1 retention",
      description:
        "At least 60% of new users should return and engage in their second week. Below this threshold, you have a retention problem that marketing can't fix.",
      tips: "If retention is below 60%, fix the product before spending on acquisition. Common fixes: improve onboarding, reduce time-to-value, add activation triggers.",
      dependsOn: ["poc-engagement-metric"],
    },
    {
      id: "poc-unit-economics",
      title: "Establish unit economics baseline",
      description:
        "Calculate your initial CAC, LTV, and LTV:CAC ratio. These numbers will be rough, but you need a baseline to improve from.",
      tips: "Use the Unit Economics tool in this toolkit. At this stage, LTV:CAC > 1 is the minimum bar. Aim for 3:1 before scaling acquisition spend.",
      relatedToolId: "unit-economics",
      dependsOn: ["poc-first-revenue"],
    },
    {
      id: "poc-advisory-board",
      title: "Assemble advisory board (2-3 advisors)",
      description:
        "Recruit 2-3 advisors with relevant industry experience, investor networks, or technical expertise. Typical compensation: 0.25%-1% equity over 2 years.",
      tips: "Good advisors open doors (intros to investors, customers, partners). Bad advisors just take equity and disappear. Set expectations upfront with a simple advisory agreement.",
    },
    {
      id: "poc-business-registration",
      title: "Complete business registration",
      description:
        "Register your business formally (DTI for sole prop, SEC for corporation). Get your BIR registration, barangay clearance, and Mayor's permit.",
      tips: "Use the PH Compliance Checklist tool for step-by-step guidance. Most founders register as a corporation if they plan to raise investment.",
      relatedToolId: "compliance-checklist",
    },
    {
      id: "poc-bank-account",
      title: "Open a business bank account",
      description:
        "Separate personal and business finances. This is essential for bookkeeping, tax compliance, and investor due diligence.",
      tips: "Choose a bank with good online banking (UnionBank, BPI). You'll need your SEC/DTI registration, BIR COR, and Mayor's permit.",
      dependsOn: ["poc-business-registration"],
    },
    {
      id: "poc-financial-model",
      title: "Build a 3-year financial model",
      description:
        "Create a bottom-up financial model with linked P&L, Balance Sheet, and Cash Flow statements. This becomes the basis for investor conversations.",
      tips: "Use the Financial Model Builder tool. Base your revenue assumptions on actual customer data, not top-down market percentages. Investors can smell made-up numbers.",
      relatedToolId: "financial-model-builder",
      dependsOn: ["poc-unit-economics"],
    },
  ],
  fundraising: [
    {
      id: "fr-pitch-deck",
      title: "Create a compelling pitch deck",
      description:
        "Build a 10-15 slide deck covering: problem, solution, market size, traction, business model, team, competition, financials, ask, and use of funds.",
      tips: "Lead with traction. If you have revenue, that slide goes near the front. Use the Market Sizing tool for your TAM/SAM/SOM slide. Keep it under 15 slides.",
      relatedToolId: "market-sizing",
    },
    {
      id: "fr-financial-model",
      title: "Prepare financial model with 3 scenarios",
      description:
        "Build base, conservative, and aggressive scenarios. Investors want to see you've thought about downside risk, not just the hockey stick.",
      tips: "Conservative scenario should show you survive even if growth is 50% of plan. This demonstrates maturity and capital efficiency.",
      dependsOn: ["fr-pitch-deck"],
    },
    {
      id: "fr-data-room",
      title: "Set up a data room",
      description:
        "Organize all due diligence documents: incorporation papers, financial statements, cap table, customer contracts, IP documentation, team bios.",
      tips: "Use Google Drive or Notion with organized folders. Having a data room ready signals professionalism. Include: legal docs, financials, metrics dashboard, team backgrounds.",
      dependsOn: ["fr-pitch-deck"],
    },
    {
      id: "fr-target-list",
      title: "Build a list of 30+ target investors",
      description:
        "Research investors who invest in your stage, sector, and geography. Prioritize those who have invested in similar companies in the Philippines or SEA.",
      tips: "Check DealStreetAsia, Tracxn, and Crunchbase for PH/SEA investors. Look at who funded companies similar to yours. Warm intros convert 10x better than cold outreach.",
    },
    {
      id: "fr-warm-intros",
      title: "Secure 10+ warm introductions",
      description:
        "Get introduced to investors through mutual connections — founders they've backed, advisors, accelerator alumni. Cold emails have <5% response rates.",
      tips: "Ask your advisors, fellow founders, and accelerator network for intros. The intro email should include: one-line description, key traction metric, and why this investor specifically.",
      dependsOn: ["fr-target-list"],
    },
    {
      id: "fr-meetings",
      title: "Complete 5+ investor meetings",
      description:
        "Pitch to at least 5 qualified investors. Track feedback, follow-up actions, and pipeline stage for each. Fundraising is a numbers game.",
      tips: "Start with investors you're less excited about to practice your pitch. Save your top choices for when you've refined the story. Take notes on every objection — they reveal what to improve.",
      dependsOn: ["fr-warm-intros"],
    },
    {
      id: "fr-term-sheet",
      title: "Receive first term sheet",
      description:
        "A term sheet outlines the proposed investment terms: valuation, investment amount, board seats, liquidation preferences, anti-dilution provisions.",
      tips: "Don't sign the first term sheet immediately. Having multiple term sheets gives you negotiating leverage. Key terms to watch: liquidation preference (1x non-participating is standard), anti-dilution (broad-based weighted average is founder-friendly).",
      dependsOn: ["fr-meetings"],
    },
    {
      id: "fr-lawyer-review",
      title: "Have a startup lawyer review terms",
      description:
        "Hire a lawyer experienced in startup fundraising to review the term sheet. They'll flag unfavorable terms and suggest negotiation points.",
      tips: "In the Philippines, startup-focused law firms include Gorriceta, Romulo, and SyCip. Budget ₱50K-₱200K for legal fees on a seed round. This is not where you cut costs.",
      dependsOn: ["fr-term-sheet"],
    },
    {
      id: "fr-negotiation",
      title: "Negotiate pre-money valuation and key terms",
      description:
        "Negotiate the pre-money valuation, option pool size, board composition, and protective provisions. Use the Pre/Post-Money tool to model scenarios.",
      tips: "Focus on what matters long-term: valuation is less important than finding the right partner. Avoid giving away board control at seed stage. Standard seed: 1 founder seat, 1 investor seat, 1 independent.",
      relatedToolId: "pre-post-money",
      dependsOn: ["fr-lawyer-review"],
    },
    {
      id: "fr-close-round",
      title: "Close the round and update cap table",
      description:
        "Sign the definitive agreements, wire the funds, issue shares, and update your cap table. Celebrate — then get back to work.",
      tips: "Use the Equity Simulator to model your post-round cap table. File the SEC amendment for new share issuance. Update your books immediately — don't let accounting pile up.",
      relatedToolId: "equity-simulator",
      dependsOn: ["fr-negotiation"],
    },
  ],
  operations: [
    {
      id: "ops-deploy-capital",
      title: "Deploy capital against milestones",
      description:
        "Create a 12-18 month capital deployment plan tied to specific milestones. Don't spend faster than your progress justifies.",
      tips: "Allocate capital in tranches: 60% on product/engineering, 20% on sales/marketing, 20% on operations/buffer. Adjust based on what's working.",
    },
    {
      id: "ops-first-hires",
      title: "Make your first 3 strategic hires",
      description:
        "Hire for your biggest gaps: typically engineering lead, first sales/BD person, and operations. Quality over speed — a bad hire at this stage is devastating.",
      tips: "First hires should be generalists who can wear multiple hats. Offer competitive salary + meaningful equity (0.5-2% for early employees). Use 4-year vesting with 1-year cliff.",
      dependsOn: ["ops-deploy-capital"],
    },
    {
      id: "ops-okr-framework",
      title: "Implement OKR framework",
      description:
        "Set quarterly Objectives and Key Results for the company, each team, and each individual. Review weekly, score quarterly.",
      tips: "Start simple: 3 company-level OKRs per quarter, each with 3-5 measurable key results. Common mistake: setting too many OKRs. Focus on what moves the needle most.",
      dependsOn: ["ops-first-hires"],
    },
    {
      id: "ops-monthly-reporting",
      title: "Establish monthly reporting (P&L + cash position)",
      description:
        "Send monthly investor updates with: P&L summary, cash balance, burn rate, runway, key metrics, wins, challenges, and asks. Consistency builds trust.",
      tips: "Keep it to one page. Include: revenue, burn, runway, 3 key metrics, top win, top challenge, specific asks (intros, hires, advice). Send by the 10th of each month.",
      dependsOn: ["ops-deploy-capital"],
    },
    {
      id: "ops-break-even",
      title: "Achieve break-even point",
      description:
        "Reach the point where monthly revenue covers monthly expenses. This is the milestone that proves your business model is sustainable.",
      tips: "Use the Burn Rate tool to track your path to break-even. Focus on unit economics first — if each customer is profitable, break-even is a function of customer count.",
      relatedToolId: "burn-rate",
      dependsOn: ["ops-monthly-reporting"],
    },
    {
      id: "ops-ar-ap",
      title: "Set up AR/AP processes (target DSO < 30 days)",
      description:
        "Implement accounts receivable and accounts payable processes. Invoice promptly, follow up on payments, and negotiate favorable payment terms with suppliers.",
      tips: "DSO (Days Sales Outstanding) < 30 is the target. Offer early payment discounts (2/10 net 30). Use the Cash Flow Forecaster to model working capital needs.",
      relatedToolId: "cash-flow-forecast",
      dependsOn: ["ops-monthly-reporting"],
    },
    {
      id: "ops-audited-financials",
      title: "Prepare first audited financial statements",
      description:
        "Engage an SEC-accredited external auditor. Audited financials are required for SEC compliance (corporations) and essential for future fundraising.",
      tips: "Start preparing 3 months before fiscal year end. Budget ₱30K-₱100K for a small audit firm. Big 4 firms are overkill at this stage. Clean books make audits cheaper and faster.",
      dependsOn: ["ops-monthly-reporting"],
    },
    {
      id: "ops-regulatory-renewals",
      title: "Complete all regulatory renewals",
      description:
        "Renew Mayor's permit (January), file all required BIR returns (quarterly VAT/percentage tax, income tax), and submit SEC annual requirements (AFS and GIS).",
      tips: "Use the PH Compliance Checklist tool to track all ongoing requirements. Set calendar reminders 1 month before each deadline. Late BIR filing = 25% surcharge + 20% annual interest.",
      relatedToolId: "compliance-checklist",
      dependsOn: ["ops-deploy-capital"],
    },
  ],
  scaling: [
    {
      id: "sc-nrr",
      title: "Achieve Net Revenue Retention (NRR) > 100%",
      description:
        "Existing customers should generate more revenue over time through upsells, cross-sells, and expansion. NRR > 100% means you grow even without new customers.",
      tips: "NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR. Top SaaS companies achieve 120-140% NRR. Focus on expansion revenue before aggressive new customer acquisition.",
    },
    {
      id: "sc-second-market",
      title: "Expand to second market or segment",
      description:
        "Enter a new geographic market (other PH cities, SEA) or customer segment. Use your playbook from market #1 but adapt to local dynamics.",
      tips: "Don't expand until you've dominated your first niche. The biggest mistake is spreading too thin too early. Prove the expansion thesis with a small pilot before full commitment.",
      dependsOn: ["sc-nrr"],
    },
    {
      id: "sc-senior-hires",
      title: "Hire VP Sales and VP Engineering",
      description:
        "Transition from founder-led functions to professional leadership. VP Sales builds the sales machine. VP Eng scales the product and team.",
      tips: "Hire VPs who have done the next stage before. A VP Sales who scaled from ₱0 to ₱50M ARR is different from one who scaled ₱50M to ₱500M. Match experience to your stage.",
      dependsOn: ["sc-nrr"],
    },
    {
      id: "sc-series-a-audit",
      title: "Conduct Series A readiness audit",
      description:
        "Assess if you meet Series A benchmarks: ₱2-5M MRR, 100%+ NRR, LTV:CAC > 3:1, clear path to ₱100M+ market, strong unit economics.",
      tips: "Series A investors in SEA typically want: proven product-market fit, ₱2M+ MRR, 15%+ MoM growth, and a clear plan for 10x growth in 18-24 months.",
      dependsOn: ["sc-nrr"],
    },
    {
      id: "sc-prepare-raise",
      title: "Prepare Series A/B raise materials",
      description:
        "Update pitch deck with actual traction data, prepare detailed financial model with cohort analysis, and build a qualified investor pipeline.",
      tips: "Series A decks focus on metrics, not story. Lead with: revenue growth chart, unit economics, retention cohorts, and market expansion plan. The narrative should be 'we found product-market fit, now we need capital to scale.'",
      dependsOn: ["sc-series-a-audit"],
    },
    {
      id: "sc-hire-cfo",
      title: "Hire a CFO or VP Finance",
      description:
        "Bring in a finance leader to manage financial planning, investor relations, treasury, and compliance. Essential for Series A+ companies.",
      tips: "A fractional CFO (part-time) works at this stage. Budget ₱80K-₱150K/month for a good fractional CFO in the Philippines. They should have startup and fundraising experience.",
      dependsOn: ["sc-series-a-audit"],
    },
    {
      id: "sc-strategic-partnership",
      title: "Close first strategic partnership",
      description:
        "Secure a partnership with a larger company that provides distribution, credibility, or technology advantage. Strategic partners can accelerate growth 2-5x.",
      tips: "The best partnerships are mutually beneficial. Offer something the partner can't build themselves. Start with a small pilot before committing to exclusivity or revenue sharing.",
      dependsOn: ["sc-second-market"],
    },
  ],
};

export function getStageInfo(stage: FundraisingStage): StageInfo {
  return STAGE_DATA[stage];
}

export function getStageChecklist(stage: FundraisingStage): ChecklistItem[] {
  return STAGE_CHECKLISTS[stage];
}

export function computeStageSummary(
  items: ChecklistItem[],
  completedIds: Set<string>
): StageSummary {
  const totalItems = items.length;
  const completedItems = items.filter((i) => completedIds.has(i.id)).length;
  const progressPercent =
    totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
  const itemsRemaining = totalItems - completedItems;

  return { totalItems, completedItems, progressPercent, itemsRemaining };
}

export function areDependenciesMet(
  item: ChecklistItem,
  completedIds: Set<string>,
  allItems: ChecklistItem[]
): boolean {
  if (!item.dependsOn || item.dependsOn.length === 0) return true;
  const allIds = new Set(allItems.map((i) => i.id));
  return item.dependsOn.every(
    (depId) => !allIds.has(depId) || completedIds.has(depId)
  );
}

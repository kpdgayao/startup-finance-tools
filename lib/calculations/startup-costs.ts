import {
  type BusinessType,
  getFilteredChecklist,
} from "./compliance-checklist";

export interface CostLineItem {
  id: string;
  name: string;
  amount: number;
  isRecurring: boolean;
}

export interface CostCategory {
  id: string;
  label: string;
  items: CostLineItem[];
  isReadOnly?: boolean; // true for registration category
}

export interface StartupCostInputs {
  businessType: BusinessType;
  categories: CostCategory[];
  bufferMonths: number; // 3-6
  contingencyPercent: number; // default 20
}

export interface StartupCostResult {
  totalOneTime: number;
  totalMonthlyRecurring: number;
  registrationCostMin: number;
  registrationCostMax: number;
  recommendedCapital: number;
  bufferAmount: number;
  contingencyAmount: number;
  byCategory: { category: string; oneTime: number; recurring: number }[];
}

export interface PhBenchmark {
  category: string;
  min: number;
  max: number;
}

export const PH_STARTUP_BENCHMARKS: Record<BusinessType, PhBenchmark[]> = {
  "sole-proprietorship": [
    { category: "Registration & Legal", min: 1000, max: 10000 },
    { category: "Office & Equipment", min: 10000, max: 100000 },
    { category: "Technology", min: 5000, max: 30000 },
    { category: "Marketing", min: 10000, max: 50000 },
    { category: "Team", min: 0, max: 50000 },
    { category: "Working Capital", min: 30000, max: 200000 },
  ],
  partnership: [
    { category: "Registration & Legal", min: 5000, max: 25000 },
    { category: "Office & Equipment", min: 20000, max: 200000 },
    { category: "Technology", min: 5000, max: 50000 },
    { category: "Marketing", min: 15000, max: 100000 },
    { category: "Team", min: 30000, max: 150000 },
    { category: "Working Capital", min: 50000, max: 500000 },
  ],
  corporation: [
    { category: "Registration & Legal", min: 10000, max: 80000 },
    { category: "Office & Equipment", min: 30000, max: 500000 },
    { category: "Technology", min: 10000, max: 100000 },
    { category: "Marketing", min: 20000, max: 200000 },
    { category: "Team", min: 50000, max: 300000 },
    { category: "Working Capital", min: 100000, max: 1000000 },
  ],
};

export function calculateRegistrationCosts(businessType: BusinessType): {
  costMin: number;
  costMax: number;
  items: { name: string; costMin: number; costMax: number }[];
} {
  const checklist = getFilteredChecklist(businessType);
  const registrationItems = checklist.filter(
    (item) =>
      item.phase === "registration" || item.phase === "post-registration"
  );

  const items = registrationItems.map((item) => ({
    name: item.title,
    costMin: item.costMin,
    costMax: item.costMax,
  }));

  return {
    costMin: items.reduce((sum, i) => sum + i.costMin, 0),
    costMax: items.reduce((sum, i) => sum + i.costMax, 0),
    items,
  };
}

export function calculateTotalStartupCosts(
  inputs: StartupCostInputs
): StartupCostResult {
  const { categories, bufferMonths, contingencyPercent } = inputs;

  let totalOneTime = 0;
  let totalMonthlyRecurring = 0;
  const byCategory: StartupCostResult["byCategory"] = [];

  const reg = calculateRegistrationCosts(inputs.businessType);

  for (const cat of categories) {
    let catOneTime = 0;
    let catRecurring = 0;

    if (cat.id === "registration") {
      // Use average of min/max from compliance data
      catOneTime = Math.round((reg.costMin + reg.costMax) / 2);
    } else {
      for (const item of cat.items) {
        if (item.isRecurring) {
          catRecurring += item.amount;
        } else {
          catOneTime += item.amount;
        }
      }
    }

    totalOneTime += catOneTime;
    totalMonthlyRecurring += catRecurring;
    byCategory.push({
      category: cat.label,
      oneTime: catOneTime,
      recurring: catRecurring,
    });
  }

  const bufferAmount = totalMonthlyRecurring * bufferMonths;
  const subtotal = totalOneTime + bufferAmount;
  const contingencyAmount = Math.round(subtotal * (contingencyPercent / 100));
  const recommendedCapital = subtotal + contingencyAmount;

  return {
    totalOneTime,
    totalMonthlyRecurring,
    registrationCostMin: reg.costMin,
    registrationCostMax: reg.costMax,
    recommendedCapital,
    bufferAmount,
    contingencyAmount,
    byCategory,
  };
}

export function getDefaultCategories(): CostCategory[] {
  return [
    {
      id: "registration",
      label: "Registration & Legal",
      items: [],
      isReadOnly: true,
    },
    {
      id: "office",
      label: "Office & Equipment",
      items: [
        { id: "rent", name: "Office/Co-working rent", amount: 15000, isRecurring: true },
        { id: "equipment", name: "Computers & equipment", amount: 50000, isRecurring: false },
        { id: "internet", name: "Internet & utilities", amount: 3000, isRecurring: true },
      ],
    },
    {
      id: "technology",
      label: "Technology",
      items: [
        { id: "domain", name: "Domain & hosting", amount: 5000, isRecurring: false },
        { id: "software", name: "Software subscriptions", amount: 5000, isRecurring: true },
      ],
    },
    {
      id: "marketing",
      label: "Marketing",
      items: [
        { id: "branding", name: "Branding & logo", amount: 15000, isRecurring: false },
        { id: "website", name: "Website development", amount: 30000, isRecurring: false },
        { id: "campaigns", name: "Initial ad campaigns", amount: 10000, isRecurring: true },
      ],
    },
    {
      id: "team",
      label: "Team",
      items: [
        { id: "founder-salary", name: "Founder salary", amount: 30000, isRecurring: true },
      ],
    },
  ];
}

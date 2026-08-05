import { Building2, Wallet, BarChart3, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface EcosystemPlatform {
  id: string;
  name: string;
  url: string;
  description: string;
  icon: LucideIcon;
  isCurrent?: boolean;
}

export const ECOSYSTEM_PLATFORMS: EcosystemPlatform[] = [
  {
    id: "startup-finance",
    name: "Startup Finance Tools",
    url: "https://startupfinance.tools",
    description: "Financial planning & fundraising tools for founders",
    icon: BarChart3,
    isCurrent: true,
  },
  {
    id: "talinohr",
    name: "TalinoHR",
    url: "https://talinohr.com",
    description: "AI-native HRIS & payroll for Philippine SMEs",
    icon: Building2,
  },
  {
    id: "zigmafy",
    name: "Zigmafy",
    url: "https://zigmafy.com",
    description: "AI-native POS & retail management for SMEs",
    icon: Store,
  },
  {
    id: "moneyglow",
    name: "MoneyGlow",
    url: "https://moneyglow.app",
    description: "Budget & income tools for Filipino creators",
    icon: Wallet,
  },
];

export type EcosystemToolId =
  | "burn-rate"
  | "financial-model-builder"
  | "compliance-checklist"
  | "fundraising-guide"
  | "msme-financial-plan"
  | "break-even"
  | "startup-costs"
  | "pricing-calculator";

export interface EcosystemBannerConfig {
  platformId: string;
  message: string;
}

export const ECOSYSTEM_BANNERS: Record<EcosystemToolId, EcosystemBannerConfig> = {
  "burn-rate": {
    platformId: "talinohr",
    message:
      "Payroll is usually the biggest burn driver. TalinoHR automates PH payroll, SSS, PhilHealth & Pag-IBIG compliance.",
  },
  "financial-model-builder": {
    platformId: "talinohr",
    message:
      "Building headcount into your model? TalinoHR handles automated payroll and compliance for Philippine teams.",
  },
  "compliance-checklist": {
    platformId: "talinohr",
    message:
      "Done with SEC/BIR registration? TalinoHR keeps your SSS, PhilHealth & Pag-IBIG contributions compliant automatically.",
  },
  "fundraising-guide": {
    platformId: "talinohr",
    message:
      "Scaling your team post-funding? TalinoHR is an AI-native HRIS built for Philippine startups.",
  },
  "msme-financial-plan": {
    platformId: "talinohr",
    message:
      "Salaries are a major line in your plan. TalinoHR automates Philippine payroll, SSS, PhilHealth & Pag-IBIG so you stay compliant as you grow.",
  },
  "break-even": {
    platformId: "zigmafy",
    message:
      "Break-even is only as good as your unit costs and volume. Zigmafy's AI-native POS tracks both per product, so the numbers come from actual sales instead of estimates.",
  },
  "startup-costs": {
    platformId: "zigmafy",
    message:
      "Opening a retail or F&B storefront? Zigmafy is an AI-native POS covering inventory, sales and promotions — budget it in from day one.",
  },
  "pricing-calculator": {
    platformId: "zigmafy",
    message:
      "Pricing works best with real margin data. Zigmafy tracks cost, price and promo performance per product so you can see which prices actually sell.",
  },
};

export function getEcosystemBanner(toolId: string): (EcosystemBannerConfig & { platform: EcosystemPlatform }) | null {
  const config = ECOSYSTEM_BANNERS[toolId as EcosystemToolId];
  if (!config) return null;

  const platform = ECOSYSTEM_PLATFORMS.find((p) => p.id === config.platformId);
  if (!platform) return null;

  return { ...config, platform };
}

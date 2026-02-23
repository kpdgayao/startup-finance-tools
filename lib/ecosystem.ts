import { Building2, Wallet, BarChart3 } from "lucide-react";
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
  | "fundraising-guide";

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
};

export function getEcosystemBanner(toolId: string): (EcosystemBannerConfig & { platform: EcosystemPlatform }) | null {
  const config = ECOSYSTEM_BANNERS[toolId as EcosystemToolId];
  if (!config) return null;

  const platform = ECOSYSTEM_PLATFORMS.find((p) => p.id === config.platformId);
  if (!platform) return null;

  return { ...config, platform };
}

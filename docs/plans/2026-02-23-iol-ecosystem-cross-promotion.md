# IOL Ecosystem Cross-Promotion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add cross-promotion for TalinoHR and MoneyGlow within Startup Finance Tools under a unified "Built by IOL" ecosystem brand.

**Architecture:** A centralized data file (`lib/ecosystem.ts`) defines all platform info and per-tool contextual messages. Two new shared components consume this data: a footer strip and a contextual banner. The banner is placed on 4 tool pages between AiInsightsPanel and RelatedTools.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Lucide icons, shadcn/ui Card

---

### Task 1: Create ecosystem data file

**Files:**
- Create: `lib/ecosystem.ts`

**Step 1: Create the data file**

```typescript
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
```

**Step 2: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to ecosystem.ts

**Step 3: Commit**

```bash
git add lib/ecosystem.ts
git commit -m "feat: add ecosystem platform data for cross-promotion"
```

---

### Task 2: Create EcosystemStrip footer component

**Files:**
- Create: `components/shared/ecosystem-strip.tsx`

**Step 1: Create the component**

```typescript
import { ECOSYSTEM_PLATFORMS } from "@/lib/ecosystem";
import { ExternalLink } from "lucide-react";

export function EcosystemStrip() {
  return (
    <div className="py-6">
      <div className="container mx-auto px-4 max-w-3xl">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center mb-4">
          Built by IOL
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ECOSYSTEM_PLATFORMS.map((platform) => {
            const Icon = platform.icon;

            if (platform.isCurrent) {
              return (
                <div
                  key={platform.id}
                  className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center"
                >
                  <Icon className="h-5 w-5 mx-auto mb-1.5 text-primary" />
                  <p className="text-sm font-medium">{platform.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {platform.description}
                  </p>
                </div>
              );
            }

            return (
              <a
                key={platform.id}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-lg border border-border/50 p-3 text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
              >
                <Icon className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                  {platform.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {platform.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors mt-1.5">
                  Visit <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add components/shared/ecosystem-strip.tsx
git commit -m "feat: add EcosystemStrip footer component"
```

---

### Task 3: Create EcosystemBanner contextual component

**Files:**
- Create: `components/shared/ecosystem-banner.tsx`

**Step 1: Create the component**

```typescript
"use client";

import { useState, useEffect } from "react";
import { getEcosystemBanner } from "@/lib/ecosystem";
import { X, ExternalLink } from "lucide-react";

interface EcosystemBannerProps {
  toolId: string;
}

export function EcosystemBanner({ toolId }: EcosystemBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const storageKey = `ecosystem-banner-${toolId}-dismissed`;

  useEffect(() => {
    setDismissed(sessionStorage.getItem(storageKey) === "true");
    setHydrated(true);
  }, [storageKey]);

  const banner = getEcosystemBanner(toolId);
  if (!banner || !hydrated || dismissed) return null;

  const { platform, message } = banner;
  const Icon = platform.icon;

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, "true");
    setDismissed(true);
  };

  return (
    <div className="relative rounded-lg border border-border/50 bg-accent/30 p-4 pl-5 border-l-4 border-l-primary/60">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <Icon className="h-5 w-5 shrink-0 mt-0.5 text-primary/80" />
        <div>
          <p className="text-sm font-medium">{platform.name}</p>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
          <a
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-2"
          >
            Learn more <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add components/shared/ecosystem-banner.tsx
git commit -m "feat: add dismissible EcosystemBanner component"
```

---

### Task 4: Add EcosystemStrip to footer

**Files:**
- Modify: `components/layout/footer.tsx:7-9` (between NewsletterSection and Separator)

**Step 1: Update footer.tsx**

Add import at top:
```typescript
import { EcosystemStrip } from "@/components/shared/ecosystem-strip";
```

Insert `<EcosystemStrip />` between `<NewsletterSection />` and `<Separator />`:
```typescript
<footer className="border-t border-border/50 mt-auto">
  <NewsletterSection />
  <EcosystemStrip />
  <Separator />
  {/* rest unchanged */}
</footer>
```

**Step 2: Verify dev server renders correctly**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add components/layout/footer.tsx
git commit -m "feat: add IOL ecosystem strip to footer"
```

---

### Task 5: Add EcosystemBanner to 4 tool pages

**Files:**
- Modify: `app/tools/burn-rate/page.tsx:271` (before RelatedTools)
- Modify: `app/tools/financial-model-builder/page.tsx` (before RelatedTools)
- Modify: `app/tools/compliance-checklist/page.tsx` (before RelatedTools)
- Modify: `app/tools/fundraising-guide/page.tsx` (before RelatedTools)

**Step 1: Add import and component to burn-rate/page.tsx**

Add import:
```typescript
import { EcosystemBanner } from "@/components/shared/ecosystem-banner";
```

Insert `<EcosystemBanner toolId="burn-rate" />` between `<AiInsightsPanel ... />` and `<RelatedTools ... />`:
```typescript
      <AiInsightsPanel
        {/* existing props */}
      />

      <EcosystemBanner toolId="burn-rate" />

      <RelatedTools currentToolId="burn-rate" />
```

**Step 2: Repeat for financial-model-builder/page.tsx**

Same pattern: add import, insert `<EcosystemBanner toolId="financial-model-builder" />` between AiInsightsPanel and RelatedTools.

**Step 3: Repeat for compliance-checklist/page.tsx**

Same pattern: add import, insert `<EcosystemBanner toolId="compliance-checklist" />` between AiInsightsPanel and RelatedTools.

**Step 4: Repeat for fundraising-guide/page.tsx**

Same pattern: add import, insert `<EcosystemBanner toolId="fundraising-guide" />` between AiInsightsPanel and RelatedTools.

**Step 5: Verify no TypeScript errors**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 6: Commit**

```bash
git add app/tools/burn-rate/page.tsx app/tools/financial-model-builder/page.tsx app/tools/compliance-checklist/page.tsx app/tools/fundraising-guide/page.tsx
git commit -m "feat: add contextual ecosystem banners to 4 tool pages"
```

---

### Task 6: Visual verification

**Step 1: Start dev server and verify**

Run: `cd "C:/Users/ASUS TUF/Projects/startup-finance-tools/app" && pnpm dev`

Verify these pages:
1. Any tool page footer → should show "Built by IOL" strip with 3 platform cards
2. `/tools/burn-rate` → should show TalinoHR banner between AI Insights and Related Tools
3. `/tools/financial-model-builder` → same
4. `/tools/compliance-checklist` → same
5. `/tools/fundraising-guide` → same
6. Dismiss a banner → refresh page → banner should stay hidden (sessionStorage)
7. Mobile responsive → strip stacks vertically, banner still readable

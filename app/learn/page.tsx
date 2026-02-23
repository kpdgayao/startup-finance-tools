import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LEARN_MODULES } from "@/lib/constants";
import { Tag, FileSpreadsheet, TrendingUp, Flame, FileText, Scale, ArrowRight } from "lucide-react";

const iconMap = {
  Tag,
  FileSpreadsheet,
  TrendingUp,
  Flame,
  FileText,
  Scale,
} as const;

const MODULE_META: Record<string, { description: string; readTime: string }> = {
  "pricing-your-product": {
    description: "Learn the 6 pricing strategies every startup founder should know, with real Philippine peso examples.",
    readTime: "5 min",
  },
  "reading-financial-statements": {
    description: "Understand how P&L, Balance Sheet, and Cash Flow statements connect — and why it matters.",
    readTime: "6 min",
  },
  "startup-valuation": {
    description: "5 valuation methods explained simply: DCF, Berkus, Scorecard, VC Method, and Revenue Multiple.",
    readTime: "5 min",
  },
  "managing-cash-flow": {
    description: "Cash flow kills more startups than bad ideas. Learn burn rate, runway zones, and cash management.",
    readTime: "6 min",
  },
  "understanding-safes": {
    description: "How SAFEs and convertible notes work, including caps, discounts, and what stacking means for your cap table.",
    readTime: "7 min",
  },
  "break-even-analysis": {
    description: "The break-even formula, contribution margin, and the 3 levers that move your break-even point.",
    readTime: "6 min",
  },
};

export const metadata: Metadata = {
  title: "Learn Startup Finance",
  description: "Free startup finance education for Filipino founders. Learn pricing, financial statements, valuation, and cash flow management.",
  openGraph: {
    title: "Learn Startup Finance | Startup Finance Toolkit",
    description: "Free startup finance education for Filipino founders.",
  },
};

export default function LearnPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Learn Startup Finance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Free, practical finance education for Filipino founders. Each module
          connects to an interactive tool so you can practice what you learn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEARN_MODULES.map((mod) => {
          const Icon = iconMap[mod.icon as keyof typeof iconMap];
          const meta = MODULE_META[mod.id];
          return (
            <Link key={mod.id} href={mod.href}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{mod.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {meta?.readTime}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {meta?.description}
                  </p>
                  <p className="text-sm text-primary mt-3 flex items-center gap-1">
                    Start Learning <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TOOLS, TOOL_GROUPS } from "@/lib/constants";
import {
  TrendingUp,
  PieChart,
  Calculator,
  Flame,
  Tag,
  BarChart3,
  Target,
  Users,
  FileSpreadsheet,
  ClipboardCheck,
  GraduationCap,
  Map,
  FileText,
  Scale,
  Landmark,
  ArrowRight,
} from "lucide-react";

const iconMap = {
  TrendingUp,
  PieChart,
  Calculator,
  Flame,
  Tag,
  BarChart3,
  Target,
  Users,
  FileSpreadsheet,
  ClipboardCheck,
  GraduationCap,
  Map,
  FileText,
  Scale,
  Landmark,
} as const;

export const metadata: Metadata = {
  title: { absolute: "Startup Finance Toolkit | IOL Inc." },
  description: "Interactive financial tools for Filipino startup founders. Valuation calculators, equity simulators, burn rate analysis, and more.",
  openGraph: {
    title: "Startup Finance Toolkit | IOL Inc.",
    description: "Interactive financial tools for Filipino startup founders.",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <section className="bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Startup Finance Toolkit
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Interactive financial tools for Filipino startup founders. Calculate
              valuations, simulate equity rounds, forecast cash flow, and make
              data-driven decisions.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Based on the startup finance curriculum by Kevin (CPA, MBA) of IOL Inc.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/tools/self-assessment">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tools">
                  Browse All Tools
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16 space-y-10">
          {TOOL_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {group.label}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.tools.map((toolId) => {
                  const tool = TOOLS.find((t) => t.id === toolId);
                  if (!tool) return null;
                  const Icon = iconMap[tool.icon as keyof typeof iconMap];
                  return (
                    <Link key={tool.id} href={tool.href}>
                      <Card className="h-full hover:border-primary/50 hover:shadow-[0_0_15px_-3px] hover:shadow-primary/15 transition-all cursor-pointer">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg">{tool.name}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription>{tool.description}</CardDescription>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}

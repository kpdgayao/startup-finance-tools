import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/constants";
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
} as const;

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16 text-center">
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
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/tools/valuation-calculator">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map((tool) => {
              const Icon = iconMap[tool.icon as keyof typeof iconMap];
              return (
                <Link key={tool.id} href={tool.href}>
                  <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
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
        </section>
      </main>
      <Footer />
    </div>
  );
}

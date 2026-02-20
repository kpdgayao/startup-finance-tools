import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold">About</h1>
        <p className="text-muted-foreground mt-2">
          The Startup Finance Toolkit is built by IOL Inc. to make financial
          literacy accessible to Filipino startup founders.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Kevin — CPA, MBA, CEO of IOL Inc.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Kevin teaches startup finance to Filipino founders through
              comprehensive presentation decks covering pricing strategy,
              entrepreneurial accounting, financial statements, cash flow
              management, fundraising, valuation methods, equity division,
              dilution mechanics, Philippine compliance (SEC/DTI/BIR), and
              financial modeling.
            </p>
            <p>
              This toolkit transforms those teachings into interactive
              calculators that founders can use to make real financial decisions
              — from pricing their first product to modeling their cap table
              through multiple funding rounds.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>What&apos;s Included</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Valuation Calculator</strong> — 4 methods
              (DCF, Berkus, Scorecard, VC Method) with a comparison summary.
            </p>
            <p>
              <strong className="text-foreground">Equity & Cap Table Simulator</strong> — Model
              founder splits, funding rounds, ESOP pools, and dilution visually.
            </p>
            <p>
              <strong className="text-foreground">Pre/Post-Money Calculator</strong> — Quick
              calculation with formula breakdown and ownership pie chart.
            </p>
            <p>
              <strong className="text-foreground">Burn Rate & Runway</strong> — Cash balance
              projections with what-if scenario sliders.
            </p>
            <p>
              <strong className="text-foreground">Pricing Calculator</strong> — 6 strategies from
              cost-plus to psychological pricing with unit economics.
            </p>
            <p>
              <strong className="text-foreground">Cash Flow Forecaster</strong> — 12-month
              projection with DSO/DPO tracking and CSV export.
            </p>
            <p>
              <strong className="text-foreground">Market Sizing</strong> — Estimate TAM, SAM,
              and SOM with top-down and bottom-up methods, funnel chart, and
              3-year revenue projections.
            </p>
            <p>
              <strong className="text-foreground">Unit Economics</strong> — Calculate CAC, LTV,
              LTV:CAC ratio, payback period, and break-even with churn
              sensitivity analysis.
            </p>
            <p>
              <strong className="text-foreground">Financial Model Builder</strong> — 3-year
              integrated P&L, Balance Sheet, and Cash Flow model with linked
              statements, charts, and CSV export.
            </p>
            <p>
              <strong className="text-foreground">PH Compliance Checklist</strong> — Interactive
              step-by-step guide to SEC, DTI, BIR, and LGU registration with
              dependency tracking, cost estimates, and progress persistence.
            </p>
          </CardContent>
        </Card>

        <div className="mt-8">
          <Button asChild>
            <Link href="/tools/valuation-calculator">
              Start Using the Tools
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Linkedin } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about the Startup Finance Toolkit by IOL Inc. and Kevin's startup finance curriculum for Filipino founders.",
  openGraph: {
    title: "About | Startup Finance Toolkit",
    description: "Learn about the Startup Finance Toolkit by IOL Inc.",
  },
};

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
            <CardTitle className="flex items-center gap-3">
              Kevin — CPA, MBA, CEO of IOL Inc.
              <a
                href="https://www.linkedin.com/in/kpdgayao/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-normal text-muted-foreground hover:text-primary transition-colors"
                aria-label="Kevin's LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </CardTitle>
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
              Kevin&apos;s startup finance teachings come from direct, hands-on
              experience raising and managing funds. For IOL Inc., he secured a
              DOST-PCIEERD Startup Grant (2021) and a DOST-TAPI TECHNiCOM Grant
              (2023), and raised angel investment after completing the IdeaSpace
              Foundation Incubation Program (Cohort 7). He also served as
              Finance Manager of Vivita Philippines Corp. (2020–2024), where he
              managed investment funds from Mistletoe Ventures (investor of
              Vivita International), developed financial sustainability plans
              for the organization&apos;s transition to a non-profit, and helped
              raise funds for both Vivita Philippines and IOL Inc. as part of
              the EU-Philippines Green Economy Partnership grant program. His
              startup finance experience spans pre-seed fundraising, grant
              administration, angel investor relations, and international donor
              funding.
            </p>
            <p>
              Beyond fundraising, Kevin has been invited as a resource speaker
              by USTP CDO b.i.t.e.s. (Cohort 9 Incubation Program), CHED
              Region I (BANKS Summit, 2024–2025), and NATCCO (National
              Confederation of Cooperatives). He serves as Finance Mentor at
              the New Energy Nexus Startup Acceleration Program, is a certified
              mentor under PCE – Go Negosyo, a Philippine Startup Challenge
              Finalist, and an ARISE Plus Ye! Boost graduate. He also serves as
              a Visiting Lecturer at Saint Louis University&apos;s graduate
              school.
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
              <strong className="text-foreground">Valuation Calculator</strong> — 5 methods
              (DCF, Berkus, Scorecard, VC Method, Revenue Multiple) with a comparison summary.
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
            <p>
              <strong className="text-foreground">Finance Self-Assessment</strong> — Interactive
              quiz covering Financial Statements, Valuation, Cash Management,
              Fundraising, and Compliance with personalized learning recommendations.
            </p>
            <p>
              <strong className="text-foreground">Fundraising Stage Guide</strong> — Interactive
              R&D to Scaling lifecycle guide with stage-specific checklists, funding
              sources, key metrics, and dependency tracking.
            </p>
            <p>
              <strong className="text-foreground">SAFE Calculator</strong> — Model how SAFEs and
              convertible notes convert to equity at a priced round, with cap vs. discount
              comparison and post-conversion cap table.
            </p>
            <p>
              <strong className="text-foreground">Break-Even Analysis</strong> — Calculate your
              break-even point in units and revenue, with interactive what-if sliders for
              price, variable cost, and fixed costs.
            </p>
            <p>
              <strong className="text-foreground">Startup Cost Estimator</strong> — Estimate total
              startup capital with PH-specific registration costs pulled from the compliance
              checklist, category-based budgeting, and contingency buffer.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Learn Startup Finance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Free educational modules that teach core startup finance concepts with
              practical examples in Philippine pesos. Each module links to an interactive
              tool so you can practice what you learn.
            </p>
            <p>
              <strong className="text-foreground">Pricing Your Product</strong> — 6 pricing
              strategies from cost-plus to psychological pricing with real examples.
            </p>
            <p>
              <strong className="text-foreground">Reading Financial Statements</strong> — How
              P&L, Balance Sheet, and Cash Flow connect and why founders must understand them.
            </p>
            <p>
              <strong className="text-foreground">Startup Valuation</strong> — 5 valuation
              methods explained simply with Philippine context.
            </p>
            <p>
              <strong className="text-foreground">Managing Cash Flow</strong> — Burn rate,
              runway zones, working capital, and Kevin&apos;s cash flow rules.
            </p>
            <p>
              <strong className="text-foreground">Understanding SAFEs</strong> — SAFEs vs.
              convertible notes, valuation caps, discount rates, and what stacking
              multiple SAFEs means for your cap table.
            </p>
            <p>
              <strong className="text-foreground">Break-Even Analysis</strong> — Break-even
              formula, contribution margin, the 3 levers that move your break-even point,
              with SaaS and Philippine context.
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

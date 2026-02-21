import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function ManagingCashFlowPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-2xl font-bold mb-2">Managing Cash Flow</h1>
      <p className="text-sm text-muted-foreground mb-6">6 min read</p>

      <p>
        Cash flow kills more startups than bad ideas, bad products, or bad
        teams. Kevin has watched profitable businesses shut down because they
        ran out of cash — the P&L showed profit, but the bank account was empty.
        Understanding cash flow isn&apos;t optional for founders. It&apos;s
        survival.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Cash Flow vs. Profit</h2>
      <p>
        Profit is an accounting concept. Cash flow is reality. You can record
        ₱1M in revenue (profit!) but if the customer doesn&apos;t pay for 60
        days and your rent is due today, you&apos;re still broke.
      </p>
      <p>
        The difference comes from <strong>timing</strong>. Revenue is recognized
        when earned (accrual accounting), but cash moves when it moves. Three
        common scenarios where profit and cash diverge:
      </p>
      <ul className="space-y-1 text-sm">
        <li>You invoiced a large project but won&apos;t collect for 2 months</li>
        <li>You pre-paid 6 months of rent but only expense 1 month on the P&L</li>
        <li>You bought equipment that&apos;s depreciated over 5 years, but cash left immediately</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">Burn Rate: Gross vs. Net</h2>
      <p>
        <strong>Gross burn</strong> is your total monthly spending — everything
        that goes out the door. Salaries, rent, software, marketing, everything.
      </p>
      <p>
        <strong>Net burn</strong> is gross burn minus revenue. This is the actual
        amount of cash you&apos;re losing each month. If you spend ₱500K/month
        and earn ₱200K/month, your net burn is ₱300K/month.
      </p>
      <p>
        <strong>Runway</strong> = Cash Balance / Net Burn. If you have ₱3M in
        the bank and net burn is ₱300K, you have 10 months of runway.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Runway Zones</h2>
      <p>
        Kevin uses a traffic light system for runway:
      </p>
      <ul className="space-y-2 text-sm">
        <li>
          <strong className="text-red-400">Red Zone (under 3 months):</strong>{" "}
          Emergency. You should already be fundraising, cutting costs, or both.
          At this point, you&apos;re negotiating from weakness.
        </li>
        <li>
          <strong className="text-yellow-400">Yellow Zone (3-6 months):</strong>{" "}
          Caution. Start preparing for your next raise. Update your pitch deck,
          warm up investor relationships, and begin modeling scenarios.
        </li>
        <li>
          <strong className="text-green-400">Green Zone (6+ months):</strong>{" "}
          Healthy. You have time to execute, but don&apos;t get complacent.
          Monitor monthly and project forward.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">When to Start Fundraising in the Philippines</h2>
      <p>
        Fundraising in the Philippines takes 3-6 months from first meeting to
        money in the bank. That means you should start raising when you have{" "}
        <strong>6-9 months of runway left</strong>. Any later and you&apos;re
        in the yellow/red zone during negotiations.
      </p>
      <p>
        Kevin&apos;s rule: <strong>cut expenses before chasing revenue</strong>.
        A 20% expense cut extends runway immediately. A 20% revenue increase
        takes months to materialize and isn&apos;t guaranteed.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Working Capital: DSO, DPO, and Cash Conversion</h2>
      <p>
        <strong>DSO (Days Sales Outstanding)</strong> — how many days before
        customers pay you. If DSO = 45, it takes 45 days on average to collect
        after invoicing. Lower is better.
      </p>
      <p>
        <strong>DPO (Days Payable Outstanding)</strong> — how many days before
        you pay your suppliers. Higher DPO preserves cash (but don&apos;t
        damage supplier relationships).
      </p>
      <p>
        <strong>Cash Conversion Cycle</strong> = DSO - DPO. A negative CCC is
        the dream — it means you collect from customers before you pay
        suppliers. Subscription businesses with annual prepayment achieve this
        naturally.
      </p>
      <p>
        If your DSO is 45 and DPO is 30, you have a 15-day gap where you need
        cash to bridge. Multiply that gap by your daily expenses and you know
        your working capital requirement.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Kevin&apos;s Cash Flow Rules</h2>
      <ul className="space-y-1 text-sm">
        <li>Maintain at least 3 months of operating expenses as a cash buffer</li>
        <li>Never count one-time income (grants, large contracts) as recurring for expense planning</li>
        <li>Target DSO under 30 days — invoice immediately, follow up relentlessly</li>
        <li>Negotiate 30-60 day payment terms with suppliers (increase DPO)</li>
        <li>Review cash position weekly, not monthly — by the time a monthly report shows a problem, it&apos;s often too late</li>
        <li>If Year 3 operating cash flow is still negative despite growing revenue, the business model has a structural cash problem</li>
      </ul>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <p className="font-medium mb-2">Check your runway</p>
            <p className="text-sm text-muted-foreground mb-4">
              Calculate your burn rate, runway, and model what-if expense
              scenarios.
            </p>
            <Button asChild size="sm">
              <Link href="/tools/burn-rate">
                Open Burn Rate Calculator <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <p className="font-medium mb-2">Forecast 12 months</p>
            <p className="text-sm text-muted-foreground mb-4">
              Build a 12-month cash flow projection with DSO/DPO timing.
            </p>
            <Button asChild size="sm">
              <Link href="/tools/cash-flow-forecast">
                Open Cash Flow Forecaster <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </article>
  );
}

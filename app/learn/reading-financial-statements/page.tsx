import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function ReadingFinancialStatementsPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-2xl font-bold mb-2">Reading Financial Statements</h1>
      <p className="text-sm text-muted-foreground mb-6">6 min read</p>

      <p>
        Financial statements are the language of business. If you can&apos;t
        read them, you&apos;re flying blind. Kevin has seen founders walk into
        investor meetings unable to explain their own P&L — that meeting ends
        quickly.
      </p>
      <p>
        There are three core financial statements, and they&apos;re all
        connected. Understanding how they link together is what separates
        founders who manage by gut from those who manage by data.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">1. Profit & Loss Statement (Income Statement)</h2>
      <p>
        The P&L answers one question: <strong>is the business profitable?</strong> It
        covers a period of time (monthly, quarterly, annually).
      </p>
      <p>The flow is:</p>
      <ul className="space-y-1 text-sm">
        <li><strong>Revenue</strong> — what customers pay you</li>
        <li><strong>- COGS (Cost of Goods Sold)</strong> — direct costs to deliver your product</li>
        <li><strong>= Gross Profit</strong> — your margin after direct costs</li>
        <li><strong>- Operating Expenses</strong> — salaries, rent, marketing, etc.</li>
        <li><strong>= EBITDA</strong> — operating profit before depreciation and tax</li>
        <li><strong>- Depreciation & Tax</strong></li>
        <li><strong>= Net Income</strong> — the bottom line</li>
      </ul>
      <p>
        <strong>Gross margin</strong> is the first health check. SaaS companies
        should target 60-80%. Below 40% means the business model needs
        rethinking — you&apos;re spending too much to deliver the product.
      </p>
      <p>
        <strong>EBITDA</strong> is what investors focus on for operating
        profitability. It&apos;s okay to be EBITDA-negative in Year 1 if
        you&apos;re investing in growth, but you should show a path to positive
        EBITDA by Year 2-3.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">2. Balance Sheet</h2>
      <p>
        The Balance Sheet answers: <strong>what does the company own and
        owe?</strong> It&apos;s a snapshot at a specific point in time.
      </p>
      <p>
        The fundamental equation: <strong>Assets = Liabilities + Equity</strong>.
        This must always balance — hence the name.
      </p>
      <ul className="space-y-1 text-sm">
        <li><strong>Assets</strong> — cash, accounts receivable, equipment, inventory</li>
        <li><strong>Liabilities</strong> — accounts payable, loans, deferred revenue</li>
        <li><strong>Equity</strong> — owner&apos;s investment + retained earnings (accumulated profits)</li>
      </ul>
      <p>
        For startups, the most important Balance Sheet items are <strong>cash</strong>{" "}
        (your lifeline), <strong>accounts receivable</strong> (money customers
        owe you), and <strong>accounts payable</strong> (money you owe
        suppliers). The gap between AR and AP is your working capital.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">3. Cash Flow Statement</h2>
      <p>
        The Cash Flow Statement answers: <strong>where did cash actually come
        from and go?</strong> It reconciles the P&L (accrual accounting) with
        actual cash movements.
      </p>
      <p>Three sections:</p>
      <ul className="space-y-1 text-sm">
        <li><strong>Operating Activities</strong> — cash from running the business (net income + adjustments for non-cash items + working capital changes)</li>
        <li><strong>Investing Activities</strong> — cash spent on long-term assets (equipment, software, CapEx)</li>
        <li><strong>Financing Activities</strong> — cash from investors or loans, dividends paid</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">Why Cash Flow is Not Profit</h2>
      <p>
        This is the concept that trips up most founders. You can be{" "}
        <strong>profitable on paper and still run out of cash</strong>. How?
      </p>
      <ul className="space-y-1 text-sm">
        <li>You invoiced ₱500K in revenue (P&L shows profit) but the customer hasn&apos;t paid yet (cash didn&apos;t come in)</li>
        <li>You bought ₱1M in equipment (cash went out) but only ₱200K shows on the P&L as depreciation</li>
        <li>You collected customer deposits (cash came in) but can&apos;t recognize revenue yet</li>
      </ul>
      <p>
        Kevin&apos;s rule: <strong>cash flow is the #1 killer of startups</strong>.
        Not bad ideas, not competition — running out of cash. Watch your cash
        balance obsessively, not just your P&L.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">How the Three Statements Connect</h2>
      <p>
        Net income from the P&L flows into Retained Earnings on the Balance
        Sheet. Cash on the Balance Sheet should match the ending balance on the
        Cash Flow Statement. Depreciation from the P&L is added back in
        Operating Cash Flow. CapEx from Investing Activities creates assets on
        the Balance Sheet.
      </p>
      <p>
        An integrated financial model links all three, so when you change one
        assumption (like revenue growth), it cascades through all statements
        automatically.
      </p>

      <Card className="mt-8 border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <p className="font-medium mb-2">Try it yourself</p>
          <p className="text-sm text-muted-foreground mb-4">
            Use the Financial Model Builder to create a 3-year integrated
            financial model and see how the three statements connect in
            practice.
          </p>
          <Button asChild size="sm">
            <Link href="/tools/financial-model-builder">
              Open Financial Model Builder <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </article>
  );
}

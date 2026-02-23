import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function BreakEvenAnalysisPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-2xl font-bold mb-2">Break-Even Analysis</h1>
      <p className="text-sm text-muted-foreground mb-6">6 min read</p>

      <p>
        Every startup founder asks the same question: &quot;When will we stop
        losing money?&quot; Break-even analysis gives you the answer — not as
        a vague timeline, but as a specific number of units sold or revenue
        earned. It&apos;s the most practical financial tool a founder can use
        to connect pricing decisions to survival.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">The Break-Even Formula</h2>
      <p>
        The math is straightforward:
      </p>
      <p className="font-mono text-sm bg-muted/30 p-3 rounded-md">
        Break-Even Units = Fixed Costs / (Selling Price - Variable Cost per Unit)
      </p>
      <p>
        The denominator — selling price minus variable cost — is called
        your <strong>contribution margin</strong>. Each unit sold
        &quot;contributes&quot; this amount toward covering your fixed costs.
        Once you&apos;ve sold enough units to cover all fixed costs, every
        additional unit is profit.
      </p>
      <p>
        Example: Your SaaS startup has ₱200,000/month in fixed costs (salaries,
        office, servers). You charge ₱5,000/month per customer with ₱500 in
        variable costs (payment processing, support). Your contribution margin
        is ₱4,500. Break-even = ₱200,000 / ₱4,500 = 45 customers.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Fixed vs. Variable Costs</h2>
      <p>
        Getting this classification right is critical. Misclassify a cost and
        your break-even number will be wrong.
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">Fixed Costs</h3>
      <p>
        These stay the same regardless of how many units you sell: rent,
        salaries, insurance, software subscriptions, loan payments. For a
        Filipino startup, typical fixed costs include office rent (₱15,000-
        ₱50,000/month in Metro Manila), founder salaries, and core SaaS tools.
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">Variable Costs</h3>
      <p>
        These scale with each unit sold: raw materials, payment processing
        fees (typically 2.5-3.5% in the Philippines), shipping, sales
        commissions, and per-customer support costs. For SaaS, variable costs
        are often low — which is why SaaS has such attractive unit economics.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">The 3 Levers</h2>
      <p>
        There are only three ways to lower your break-even point. Kevin teaches
        founders to think about all three, not just the obvious one:
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">1. Raise Your Price</h3>
      <p>
        The most powerful lever. Increasing your price from ₱5,000 to ₱6,000
        in the example above changes the contribution margin from ₱4,500 to
        ₱5,500. Break-even drops from 45 to 37 customers — an 18% improvement
        from a 20% price increase. Price increases flow directly to contribution
        margin because variable costs don&apos;t change.
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">2. Reduce Variable Costs</h3>
      <p>
        Negotiate better supplier rates, optimize payment processing, automate
        customer support. Cutting variable costs from ₱500 to ₱300 moves
        break-even from 45 to 43 customers. The impact is real but smaller
        than pricing because variable costs are typically a smaller portion of
        the selling price.
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">3. Reduce Fixed Costs</h3>
      <p>
        Move to a cheaper office, defer hiring, negotiate software discounts.
        Cutting fixed costs from ₱200,000 to ₱150,000 drops break-even from
        45 to 34 customers. This lever is powerful but has limits — cut too
        deep and you hurt your ability to grow.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Contribution Margin Ratio</h2>
      <p>
        The contribution margin ratio tells you what percentage of each peso
        of revenue goes toward covering fixed costs:
      </p>
      <p className="font-mono text-sm bg-muted/30 p-3 rounded-md">
        Contribution Margin Ratio = Contribution Margin / Selling Price
      </p>
      <p>
        In our example: ₱4,500 / ₱5,000 = 90%. This means 90 centavos of
        every peso earned goes toward fixed costs and profit. High-margin
        businesses (SaaS, consulting) typically have 70-90% contribution
        margin ratios. Product businesses are usually 30-60%.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Margin of Safety</h2>
      <p>
        Once you know your break-even point, calculate how far above it you
        are (or how far you need to go):
      </p>
      <p className="font-mono text-sm bg-muted/30 p-3 rounded-md">
        Margin of Safety = (Current Volume - Break-Even Volume) / Current Volume
      </p>
      <p>
        If you have 60 customers and break-even is 45, your margin of safety
        is 25%. You could lose a quarter of your customers before you start
        losing money. Kevin recommends targeting at least a 20% margin of
        safety before taking on additional fixed costs like new hires.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Break-Even for SaaS</h2>
      <p>
        SaaS businesses have a unique break-even dynamic because of monthly
        recurring revenue (MRR). Your break-even isn&apos;t a one-time event —
        you need to maintain it every month. Factor in churn: if you lose 5%
        of customers monthly, you need to acquire new customers just to stay
        at break-even.
      </p>
      <p>
        The real SaaS break-even question is: &quot;At what MRR do my monthly
        revenues consistently exceed my monthly costs, accounting for
        churn?&quot; This is why SaaS founders obsess over net revenue retention
        — if existing customers expand enough to offset churn, break-even
        becomes much more achievable.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Philippine Context</h2>
      <p>
        Filipino startups should pay special attention to a few local factors:
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          Payment processing fees are higher in the Philippines (2.5-3.5% vs.
          1.5-2.5% in the US). This adds meaningfully to variable costs for
          low-ticket items.
        </li>
        <li>
          Office rent varies dramatically: co-working spaces in BGC or Makati
          run ₱8,000-₱15,000 per seat/month, while provincial offices can be
          ₱3,000-₱5,000.
        </li>
        <li>
          Labor costs are lower, which means Filipino startups often have lower
          fixed costs than US counterparts — but this advantage disappears if
          you over-hire early.
        </li>
        <li>
          Consider seasonal patterns: many Philippine businesses see revenue
          dips in January-February and spikes in November-December. Your
          break-even calculation should account for the lean months.
        </li>
      </ul>

      <Card className="mt-8 border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <p className="font-medium mb-2">Try it yourself</p>
          <p className="text-sm text-muted-foreground mb-4">
            Use the Break-Even Calculator to find your break-even point and
            experiment with the what-if sliders to see how price, cost, and
            volume changes affect your profitability.
          </p>
          <Button asChild size="sm">
            <Link href="/tools/break-even">
              Open Break-Even Calculator <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </article>
  );
}

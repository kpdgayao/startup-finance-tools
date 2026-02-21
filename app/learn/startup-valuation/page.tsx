import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function StartupValuationPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-2xl font-bold mb-2">Startup Valuation</h1>
      <p className="text-sm text-muted-foreground mb-6">5 min read</p>

      <p>
        Valuation determines how much of your company you give away for
        investment capital. Get it right, and you preserve ownership while
        getting the funding you need. Get it wrong, and you either scare away
        investors (too high) or give away too much of your company (too low).
      </p>
      <p>
        The uncomfortable truth: early-stage valuation is more art than science.
        There&apos;s no single &quot;correct&quot; number. Instead, founders
        should use multiple methods and present a range to investors.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">The 5 Valuation Methods</h2>

      <h3 className="text-lg font-medium mt-6 mb-2">1. DCF (Discounted Cash Flow)</h3>
      <p>
        Project future cash flows and discount them back to present value. The
        discount rate reflects risk — early-stage startups use 25-50% because
        the risk of failure is high. Mature companies use 10-15%.
      </p>
      <p>
        <strong>When to use:</strong> startups with predictable, recurring
        revenue. SaaS companies with 12+ months of data. Not useful for
        pre-revenue startups (you&apos;d be discounting guesses).
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">2. Berkus Method</h3>
      <p>
        Assigns up to ₱500,000 for each of 5 risk factors: Sound Idea,
        Prototype, Quality Management, Strategic Relationships, and Product
        Rollout/Sales. Maximum valuation: ₱2.5 million.
      </p>
      <p>
        <strong>When to use:</strong> pre-revenue startups. This method values
        the team and the idea, not financials. It&apos;s a quick way to anchor
        a conversation with early-stage angels.
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">3. Scorecard Method</h3>
      <p>
        Compare your startup against a regional median valuation using weighted
        factors: Management Team (30%), Market Size (25%), Product/Technology
        (15%), Competitive Environment (10%), Marketing Channels (10%), Need
        for Funding (5%), and Other (5%).
      </p>
      <p>
        <strong>When to use:</strong> early-stage startups in markets with
        comparable deals. Requires knowing the median angel deal valuation in
        your region (₱10-15M for Philippine seed rounds).
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">4. VC Method</h3>
      <p>
        Work backwards from a target exit value. If a VC expects 10x return on
        a ₱10M investment, they need ₱100M at exit. If they expect 30%
        dilution in future rounds, they need to own ~14% now. So
        post-money = ₱10M / 14% = ~₱71M.
      </p>
      <p>
        <strong>When to use:</strong> when talking to VCs. This is how they
        think — backwards from exit. You need defensible exit comparables
        (similar companies that were acquired or went public).
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">5. Revenue Multiple</h3>
      <p>
        Valuation = Annual Revenue x Industry Multiple. The multiple depends on
        your business model: SaaS companies get 5-10x due to recurring revenue
        and high margins. Marketplaces get 2-4x. E-commerce gets 1-3x.
        Service businesses get 1-2x.
      </p>
      <p>
        <strong>When to use:</strong> revenue-stage startups. The multiple
        reflects your growth rate, gross margin, retention, and market size.
        High growth + high margin = higher multiple.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Philippine Context</h2>
      <p>
        Typical Philippine startup valuations by stage:
      </p>
      <ul className="space-y-1 text-sm">
        <li><strong>Pre-seed:</strong> ₱2-5M (bootstrapping / friends & family)</li>
        <li><strong>Seed:</strong> ₱5-20M (angel investors, accelerators)</li>
        <li><strong>Series A:</strong> ₱50-150M (institutional VCs)</li>
        <li><strong>Series B+:</strong> ₱200M+ (growth equity, regional VCs)</li>
      </ul>
      <p>
        These are lower than Silicon Valley but align with SEA startup
        economics. Don&apos;t benchmark against US valuations — investors price
        based on local market opportunity and exit potential.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Kevin&apos;s Advice</h2>
      <p>
        No single method is &quot;correct.&quot; Run all relevant methods, present
        a range, and be prepared to defend your assumptions. Investors will push
        back on the high end; you should have data ready.
      </p>
      <p>
        The most common founder mistake: anchoring on a valuation number they
        want, then working backwards to justify it. Investors see through this
        immediately. Start with the data, not the desired outcome.
      </p>

      <Card className="mt-8 border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <p className="font-medium mb-2">Try it yourself</p>
          <p className="text-sm text-muted-foreground mb-4">
            Use the Valuation Calculator to run all 5 methods with your numbers
            and see how they compare side-by-side.
          </p>
          <Button asChild size="sm">
            <Link href="/tools/valuation-calculator">
              Open Valuation Calculator <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </article>
  );
}

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function PricingYourProductPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-2xl font-bold mb-2">Pricing Your Product</h1>
      <p className="text-sm text-muted-foreground mb-6">5 min read</p>

      <p>
        Pricing is the single most important decision a startup founder makes.
        It determines your revenue, your margins, your positioning in the
        market, and ultimately whether your business survives. Yet most Filipino
        founders spend more time on their logo than their pricing strategy.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Why Pricing Matters More Than You Think</h2>
      <p>
        A 1% improvement in pricing leads to an 11% improvement in profit on
        average. Compare that to a 1% improvement in volume (which only improves
        profit by 3-4%). Pricing is the highest-leverage growth tool you have.
      </p>
      <p>
        Kevin&apos;s key insight from his CPA practice: <strong>most Filipino
        startups underprice</strong>. They price based on cost or competitors,
        not based on the value they deliver. This leaves money on the table and
        signals low quality to the market.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">The 6 Pricing Strategies</h2>

      <h3 className="text-lg font-medium mt-6 mb-2">1. Cost-Plus Pricing</h3>
      <p>
        The baseline approach: calculate your total costs, add a profit margin,
        and divide by the number of units. Kevin&apos;s example: if your monthly
        costs are ₱130,000 and you want a 40% margin, your revenue target is
        ₱182,000. With 10 clients, that&apos;s ₱18,200 per month per client.
      </p>
      <p>
        <strong>Best for:</strong> service businesses, agencies, consulting.
        Simple to calculate, ensures profitability, but ignores customer
        willingness to pay.
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">2. Value-Based Pricing</h3>
      <p>
        Price based on the value your product creates for the customer, not what
        it costs you. If your SaaS tool saves a business ₱100,000/month in
        manual labor, charging ₱25,000/month gives them a 4x ROI. They&apos;re
        happy, and your margin is excellent.
      </p>
      <p>
        <strong>Best for:</strong> B2B SaaS, enterprise tools, anything with
        measurable customer impact. Requires understanding your customer&apos;s
        economics deeply.
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">3. Penetration Pricing</h3>
      <p>
        Start with low prices to capture market share quickly, then raise prices
        once you&apos;ve built a customer base. Grab, GCash, and other
        Philippine startups used this approach — subsidizing rides and
        transactions to build network effects.
      </p>
      <p>
        <strong>Best for:</strong> marketplace businesses, network-effect
        products, businesses where the cost to switch is high once customers are
        onboarded.
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">4. Competitive Pricing</h3>
      <p>
        Position your price relative to competitors: at parity, above (premium),
        or below (value). Research what competitors charge, then decide where you
        want to sit. Below-market works for commodities; above-market requires
        clear differentiation.
      </p>
      <p>
        <strong>Best for:</strong> markets with established pricing norms.
        Common in e-commerce and consumer products in the Philippines.
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">5. Bundle Pricing</h3>
      <p>
        Combine multiple products or features into packages at a discount
        compared to buying individually. This increases average transaction value
        by 15-30% typically. The customer perceives value; you increase revenue
        per sale.
      </p>
      <p>
        <strong>Best for:</strong> products with multiple tiers, add-ons, or
        complementary offerings. Common in SaaS (Basic/Pro/Enterprise plans).
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">6. Psychological Pricing</h3>
      <p>
        Leverage cognitive biases. The most common: charm pricing (₱999 vs
        ₱1,000) which exploits the left-digit effect. Anchoring works too — show
        a higher &quot;original price&quot; to make the actual price feel like a
        deal.
      </p>
      <p>
        <strong>Best for:</strong> consumer products, e-commerce, subscription
        services. Works in combination with any other strategy.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Which Strategy Fits Your Business?</h2>
      <p>
        Pre-revenue startups should start with <strong>cost-plus</strong> to
        ensure survival, then evolve toward <strong>value-based</strong> as they
        understand customer impact. Marketplace businesses should consider{" "}
        <strong>penetration</strong> pricing. B2B companies with measurable ROI
        should go straight to <strong>value-based</strong>.
      </p>
      <p>
        The worst approach? Guessing. Use data, talk to customers about
        willingness to pay, and test different price points. Pricing isn&apos;t
        set-it-and-forget-it — it&apos;s an ongoing optimization.
      </p>

      <Card className="mt-8 border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <p className="font-medium mb-2">Try it yourself</p>
          <p className="text-sm text-muted-foreground mb-4">
            Use the Pricing Calculator to model all 6 strategies with your own
            numbers and see which one maximizes your revenue.
          </p>
          <Button asChild size="sm">
            <Link href="/tools/pricing-calculator">
              Open Pricing Calculator <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </article>
  );
}

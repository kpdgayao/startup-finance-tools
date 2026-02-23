import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Callout } from "@/components/shared/callout";

export default function UnderstandingSafesPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-2xl font-bold mb-2">Understanding SAFEs</h1>
      <p className="text-sm text-muted-foreground mb-1">7 min read</p>
      <p className="text-sm text-muted-foreground mb-6">
        By Kevin — CPA, MBA, CEO of IOL Inc.
      </p>

      <p>
        If you&apos;re raising your first round of funding in the Philippines,
        you&apos;ll almost certainly encounter SAFEs or convertible notes. These
        instruments let investors put money into your startup without agreeing
        on a valuation today — the valuation gets decided later, at your first
        priced round. Understanding how they work is critical because the terms
        you agree to now determine how much of your company you give up later.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">What Is a SAFE?</h2>
      <p>
        A SAFE (Simple Agreement for Future Equity) was created by Y Combinator
        in 2013 to simplify early-stage fundraising. It&apos;s not a loan — there&apos;s
        no interest rate, no maturity date, and no repayment obligation. Instead,
        the investor gives you money now in exchange for the right to receive
        equity later when a &quot;trigger event&quot; happens (usually a priced
        funding round).
      </p>
      <p>
        The modern YC SAFE is &quot;post-money&quot; — meaning the valuation cap
        includes the SAFE itself. This is important: a ₱50M post-money SAFE with
        a ₱5M investment means the investor will own exactly 10% at conversion,
        regardless of how many other SAFEs you&apos;ve issued. Founders sometimes
        miss this distinction and are surprised by how much dilution stacks up.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">What Is a Convertible Note?</h2>
      <p>
        A convertible note is technically a loan that converts to equity. Unlike
        a SAFE, it has an interest rate (typically 4-8% annually) and a maturity
        date (usually 18-24 months). If the note hasn&apos;t converted by
        maturity, the investor can technically demand repayment — though in
        practice, most notes get extended or renegotiated.
      </p>
      <p>
        The interest accrues and adds to the principal before conversion. So a
        ₱5M note at 6% interest held for 18 months converts as if the investor
        put in ₱5,450,000. This extra amount comes out of the founder&apos;s
        ownership, not the investor&apos;s pocket.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Valuation Caps and Discount Rates</h2>
      <p>
        Both SAFEs and convertible notes typically include two protection
        mechanisms for investors. At conversion, the investor gets whichever
        gives them a <strong>lower price per share</strong> (meaning more shares
        for their money).
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">The Valuation Cap</h3>
      <p>
        A cap sets the maximum valuation at which the SAFE converts. If your
        priced round is at ₱200M pre-money but the SAFE has a ₱50M cap, the
        SAFE holder converts at the ₱50M valuation — getting 4x more shares
        than new investors per peso invested. The cap rewards early investors
        for taking risk when your startup was unproven.
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">The Discount Rate</h3>
      <p>
        A discount (typically 15-25%, with 20% being standard) lets the SAFE
        holder buy shares at a percentage below the priced round price. If new
        investors pay ₱100 per share and the SAFE has a 20% discount, the SAFE
        holder pays ₱80 per share. The discount is simpler than a cap but offers
        less upside protection if your valuation grows dramatically.
      </p>

      <h3 className="text-lg font-medium mt-6 mb-2">Cap vs. Discount: Which Wins?</h3>
      <Callout variant="formula">
        At conversion, compare: Price via Cap = Cap / Total Shares vs. Price
        via Discount = Round Price x (1 - Discount%). The investor gets
        whichever gives a lower price per share (more shares for their money).
      </Callout>
      <p>
        When a SAFE has both a cap and a discount, the investor converts at
        whichever gives them the <strong>lower effective price per share</strong>.
        If the company&apos;s valuation has grown significantly since the SAFE was
        issued, the cap usually wins. If growth was modest, the discount might
        give a better deal.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">The Stacking Problem</h2>
      <p>
        Here&apos;s where Filipino founders most often get surprised: if you
        issue multiple SAFEs before your priced round, each one converts
        independently, and the dilution stacks. Three SAFEs of ₱5M each with
        a ₱50M post-money cap means 30% of your company goes to SAFE holders
        before your Series A investors even get their shares.
      </p>
      <Callout variant="tip">
        Keep total SAFE dilution under 20-25%. Beyond that, Series A investors
        will see a messy cap table and may demand a higher ownership stake to
        compensate, further diluting founders.
      </Callout>

      <h2 className="text-xl font-semibold mt-8 mb-3">SAFEs in the Philippine Context</h2>
      <p>
        SAFEs are gaining traction in the Philippine startup ecosystem, but
        they&apos;re not as standardized as in Silicon Valley. A few things to
        watch for:
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          Philippine corporate law doesn&apos;t have a specific legal framework
          for SAFEs. They&apos;re typically structured as subscription agreements
          with conversion provisions. Get a startup-savvy lawyer.
        </li>
        <li>
          Local angel investors may be more familiar with convertible notes.
          If your investor prefers notes, the economics are similar — just
          account for the interest accrual.
        </li>
        <li>
          SEC registration requirements apply to equity issuance. Plan for the
          paperwork and costs when your SAFEs convert at the priced round.
        </li>
        <li>
          Some Philippine accelerators and VCs have their own SAFE templates.
          Compare them carefully against the standard YC SAFE — look for
          differences in conversion triggers, pro-rata rights, and MFN clauses.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">SAFE vs. Convertible Note: Which Should You Use?</h2>
      <p>
        For most early-stage Filipino startups, a SAFE is simpler and
        founder-friendlier: no interest, no maturity pressure, and cleaner
        legal documents. Use a convertible note when investors insist on it
        or when you need the psychological pressure of a maturity date to
        motivate reaching your next milestone.
      </p>
      <p>
        Either way, model the conversion before you sign. Know exactly how
        much dilution you&apos;re taking on under different priced-round
        scenarios.
      </p>

      <Card className="mt-8 border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <p className="font-medium mb-2">Try it yourself</p>
          <p className="text-sm text-muted-foreground mb-4">
            Use the SAFE Calculator to model how your SAFE or convertible note
            converts at different priced-round valuations, and see the cap vs.
            discount comparison side by side.
          </p>
          <Button asChild size="sm">
            <Link href="/tools/safe-calculator">
              Open SAFE Calculator <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </article>
  );
}

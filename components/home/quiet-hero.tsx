import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/constants";
import { QUIZ_QUESTIONS } from "@/lib/calculations/self-assessment";

export function QuietHero() {
  return (
    <section className="container mx-auto px-4 pt-12 pb-[38px]">
      {/* "calculations stay in your browser" rather than the mock's "nothing
          leaves your browser": every calculator runs client-side, but the
          optional AI Explain panel POSTs the inputs to /api/ai/explain.
          The stronger claim is disprovable from this very page, which is the
          opposite of the point. homepage-facts.test.ts pins the call sites
          that make the narrower claim true. */}
      <p className="eyebrow">
        Seventeen tools · free · calculations stay in your browser
      </p>

      {/* tracking is set here on purpose: the base layer gives h1-h4
          -0.015em, the hero wants -0.02em. text-wrap: balance is inherited
          from the base layer and left alone — it helps an 18ch headline. */}
      <h1 className="mt-[14px] max-w-[18ch] text-[clamp(34px,6vw,52px)] leading-[1.04] tracking-[-0.02em]">
        Run the{" "}
        <em className="italic text-ochre-deep dark:text-ochre">numbers</em> on
        your startup — properly.
      </h1>

      <p className="mt-[18px] max-w-[52ch] text-[17px] leading-[1.55] text-ink-2">
        Valuation, cap tables, SAFEs, burn rate, break-even, unit economics,
        PH&nbsp;compliance, MSME planning. Peso-native, built for how funding
        actually works in the&nbsp;Philippines.
      </p>

      <div className="mt-[26px] flex flex-wrap gap-[10px]">
        {/* The Button base sets `whitespace-nowrap` AND `shrink-0`, which held
            this label on one 323px line and pushed the page 19px past a 320px
            viewport — the narrowest phones still in use. Both have to go:
            allowing the wrap alone left the item at its max-content width,
            because a shrink-0 flex item never narrows below it. `max-w-full`
            caps it at the row instead. No effect above ~360px, where the label
            fits on one line anyway. */}
        <Button
          asChild
          size="lg"
          variant="ochre"
          className="h-auto max-w-full whitespace-normal py-2.5 text-left"
        >
          <Link href="/tools/self-assessment">
            Start with the {QUIZ_QUESTIONS.length}-question assessment
            <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/tools">Browse all {TOOLS.length} tools</Link>
        </Button>
      </div>

      {/* The base layer paints links inside a <p> with --link (teal). The
          design wants the name in --ink-2, so the colour is set explicitly;
          the class beats the :where() rule, which has zero specificity. The
          underline from that rule is kept deliberately — it is the only
          affordance marking this as a link. */}
      <p className="mt-[34px] max-w-[60ch] border-t pt-[14px] text-[13px] leading-[1.6] text-muted-foreground">
        Built by{" "}
        <Link href="/about" className="text-ink-2 hover:text-ochre-deep">
          Kevin Philip Gayao
        </Link>
        , derived from over a decade of fundraising experience and teaching.
      </p>
    </section>
  );
}

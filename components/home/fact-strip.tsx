import type { ReactNode } from "react";
import { TOOLS } from "@/lib/constants";
import { DATA_LAST_UPDATED } from "@/lib/calculations/compliance-checklist";
import { cn } from "@/lib/utils";

// Every fact is checkable by the visitor without leaving the site: the tool
// count is the grid below, the peso is every figure in every calculator,
// the year is what /tools/compliance-checklist prints as "As of", and the
// zero is verifiable in devtools. No biographical claims — that is the rule.
//
// Cell 4 says *calculations*, not "data". Every calculator computes in the
// browser, but the optional AI Explain panel POSTs its inputs to
// /api/ai/explain, so the unqualified claim would be disproved by the page
// carrying it. homepage-facts.test.ts pins the set of files allowed to call
// fetch(), so a new one breaks the test that licenses this cell rather than
// quietly making it false.
const FACTS: { numeral: ReactNode; label: string }[] = [
  { numeral: String(TOOLS.length), label: "Tools, no signup" },
  {
    numeral: <span className="text-ochre-deep">₱</span>,
    label: "Peso-native throughout",
  },
  {
    numeral: DATA_LAST_UPDATED.slice(0, 4),
    label: "SEC / DTI / BIR fees current",
  },
  { numeral: "0", label: "Calculations sent to a server" },
];

export function FactStrip() {
  return (
    <section className="container mx-auto px-4">
      <dl className="grid grid-cols-2 border-t border-b min-[820px]:grid-cols-4">
        {FACTS.map((fact, i) => (
          // flex-col-reverse: the label is the term and the numeral its
          // value, so <dt> must precede <dd> in the DOM for a screen reader
          // ("Tools, no signup: 16") while the numeral reads first visually.
          <div
            key={fact.label}
            className={cn(
              "flex flex-col-reverse px-6 py-5",
              // 2x2 below 820px: cells 2 and 4 take the vertical rule,
              // cells 3 and 4 take a horizontal one — reset at 820px, where
              // the strip becomes a single row with no interior horizontals.
              i % 2 === 1 && "border-l",
              i >= 2 && "border-t min-[820px]:border-t-0",
              // 1x4 at 820px and up: a vertical rule between every pair,
              // none to the left of cell 1.
              i > 0 && "min-[820px]:border-l"
            )}
          >
            <dt className="mt-2 font-mono text-[10px] uppercase leading-[1.5] tracking-[0.12em] text-muted-foreground">
              {fact.label}
            </dt>
            <dd className="tabular font-serif text-[30px] leading-none tracking-[-0.01em]">
              {fact.numeral}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RateQuestion } from "@/lib/speaking/questions";

/**
 * How the question's heading is wired to what it labels.
 *
 * - `label` (default): one control that takes `id={question.id}`, so the
 *   heading is a real <label htmlFor>.
 * - `group`: several controls (a checkbox list). A <label> pointing at a group
 *   is invalid, so the heading becomes a plain heading and the controls sit in
 *   a role="group" that references it.
 * - `child`: the control renders its own <label> — CurrencyInput does. A second
 *   <label> here would either duplicate the text on screen or leave an htmlFor
 *   pointing at nothing, which is what it did before this prop existed.
 */
type LabelMode = "label" | "group" | "child";

interface RateFactorFieldProps {
  question: RateQuestion;
  labelMode?: LabelMode;
  /**
   * What this answer is currently doing to the price, already formatted —
   * "+15% · ₱3,750" or "No change". Shown beside the label so the effect is
   * visible without opening anything.
   */
  impact?: string;
  /** True when the current answer is moving the number. */
  active?: boolean;
  children: ReactNode;
}

/**
 * One question on the intake form, wrapped in its own reasoning.
 *
 * The disclosure is collapsed by default and the live impact is not: an
 * organiser scanning the form sees WHAT each answer costs immediately, and can
 * open WHY when a number surprises them. Opening every rationale at once turns
 * the form into an essay nobody reads, which defeats the purpose.
 */
export function RateFactorField({
  question,
  labelMode = "label",
  impact,
  active = false,
  children,
}: RateFactorFieldProps) {
  const [open, setOpen] = useState(false);
  const panelId = `why-${question.id}`;
  const headingId = `label-${question.id}`;

  const heading = question.label;
  const hint = (
    <p className="text-xs text-muted-foreground">{question.hint}</p>
  );

  return (
    <div className="border-t border-rule pt-4 first:border-t-0 first:pt-0">
      {/* In `child` mode the control renders the heading itself, so this row
          carries only the impact chip — printing `heading` here as well is
          what put "Ticket price per participant" on the page twice. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {labelMode === "label" && (
          <label className="text-sm font-medium" htmlFor={question.id}>
            {heading}
          </label>
        )}
        {labelMode === "group" && (
          <p id={headingId} className="text-sm font-medium">
            {heading}
          </p>
        )}
        {labelMode === "child" && <span aria-hidden="true" />}
        {impact && (
          <span
            className={cn(
              "font-mono text-[11px] tabular",
              active ? "text-ochre-deep dark:text-ochre" : "text-muted-foreground"
            )}
          >
            {impact}
          </span>
        )}
      </div>

      {/* In `child` mode the control brings its own label, so the hint reads
          better under the control than wedged between two headings. */}
      {labelMode !== "child" && <div className="mt-0.5">{hint}</div>}

      {labelMode === "group" ? (
        <div role="group" aria-labelledby={headingId} className="mt-2.5">
          {children}
        </div>
      ) : (
        <div className="mt-2.5">{children}</div>
      )}

      {labelMode === "child" && <div className="mt-1.5">{hint}</div>}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        // py-2 -my-0.5: the label alone was a 15px-tall tap target, well under
        // what a thumb can hit reliably, on the one control this page most
        // wants people to press. The padding grows the hit area to ~31px while
        // the negative margin keeps the visual rhythm between fields.
        className="-my-0.5 mt-1.5 inline-flex items-center gap-1.5 py-2 pr-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <HelpCircle className="h-3 w-3" />
        Why we ask
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          id={panelId}
          className="mt-2 border-l-[2px] border-ochre pl-[15px] font-serif text-[14px] leading-[1.5] text-ink-2"
        >
          <p>{question.why}</p>
          <p className="mt-2 font-sans text-[12.5px] text-muted-foreground">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ochre-deep dark:text-ochre">
              Effect on the quote
            </span>
            <br />
            {question.impact}
          </p>
        </div>
      )}
    </div>
  );
}

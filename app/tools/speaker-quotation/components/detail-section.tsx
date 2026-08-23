"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailSectionProps {
  title: string;
  /** One line saying what is inside, and why it is safe to skip. */
  summary: string;
  children: ReactNode;
}

/**
 * A collapsed group of questions the quote does not need in order to be useful.
 *
 * The form asked eighteen questions before showing a number. Completion falls
 * measurably with each field past roughly eight, and the count that matters is
 * fields a person has to CONSIDER, not how many screens they are spread over —
 * so hiding these behind one control does real work, where splitting the same
 * eighteen across three pages would not.
 *
 * Everything in here has a sensible default and is answered on the quote either
 * way. The label says so, because a disclosure that hides something load-
 * bearing is worse than a long form: it makes people wonder what they missed.
 */
export function DetailSection({ title, summary, children }: DetailSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-rule">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && <div className="space-y-4 border-t border-rule p-4">{children}</div>}
    </div>
  );
}

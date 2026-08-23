"use client";

import { CalendarCheck, CalendarX, CalendarClock, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AvailabilityReport, DateStatus } from "@/lib/speaking/availability";

const STATUS_STYLE: Record<DateStatus, { icon: typeof CalendarCheck; className: string; label: string }> = {
  available: { icon: CalendarCheck, className: "text-good", label: "Open" },
  tentative: { icon: CalendarClock, className: "text-warn-deep dark:text-warn", label: "Check first" },
  booked: { icon: CalendarX, className: "text-bad", label: "Committed" },
  past: { icon: CalendarX, className: "text-muted-foreground", label: "Past" },
};

interface AvailabilityPanelProps {
  report: AvailabilityReport | null;
  isChecking: boolean;
  error: string | null;
  onCheck: () => void;
  disabled?: boolean;
}

/**
 * Shows what the calendar says about the requested dates.
 *
 * Reports status only — never an event title, a location or an attendee. The
 * API is written the same way; if a richer view is ever wanted, it belongs
 * behind an owner's login, not on a public quotation form.
 */
export function AvailabilityPanel({
  report,
  isChecking,
  error,
  onCheck,
  disabled,
}: AvailabilityPanelProps) {
  return (
    <div className="rounded-md border border-rule p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">Calendar check</p>
        <Button variant="ghost" size="sm" onClick={onCheck} disabled={disabled || isChecking}>
          {isChecking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5 text-xs">{report ? "Re-check" : "Check these dates"}</span>
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}

      {!report && !error && (
        <p className="mt-3 text-sm text-muted-foreground">
          Check the requested dates against the speaking calendar before you build the rest of
          the quote.
        </p>
      )}

      {report && (
        <>
          <ul className="mt-3 space-y-1.5">
            {report.dates.map((day) => {
              const style = STATUS_STYLE[day.status];
              const Icon = style.icon;
              return (
                <li key={day.date} className="flex items-start gap-2.5 text-sm">
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.className)} />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {day.weekday}, {day.date}{" "}
                      <span className={cn("font-mono text-[11px] uppercase tracking-[0.1em]", style.className)}>
                        {style.label}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{day.note}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 border-t border-rule pt-2.5 text-xs text-muted-foreground">
            {report.daysOfNotice} {report.daysOfNotice === 1 ? "day" : "days"} of notice —{" "}
            {report.leadTime.label.toLowerCase()}.{" "}
            {report.source === "calendar"
              ? "Checked against the live calendar."
              : report.degraded
                ? "The calendar could not be reached, so only manually held dates were checked. Confirm by email."
                : "Checked against manually held dates only."}{" "}
            Availability is confirmed on booking, not by this page.
          </p>
        </>
      )}
    </div>
  );
}

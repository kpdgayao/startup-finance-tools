"use client";

import { AlertTriangle, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultCard } from "@/components/shared/result-card";
import { cn, formatPHP, formatPercent } from "@/lib/utils";
import { formatEngagementDate } from "@/lib/speaking/availability";
import { HOME_BASE } from "@/lib/speaking/rate-card";
import type { Quotation } from "@/lib/speaking/quotation";

/** A factor line reads as "×1.15" rather than a peso figure it does not equal. */
function factorLabel(factor: number): string {
  return `×${factor.toFixed(2)}`;
}

interface QuotationSummaryProps {
  quote: Quotation;
}

export function QuotationSummary({ quote }: QuotationSummaryProps) {
  // No success/warning variant on the day-rate card. It compared the quote
  // against the speaker's own target, which is not the organiser's business and
  // put a warning triangle on their quotation whenever an engagement came in
  // under it — reading, to the person about to pay, as though something were
  // wrong with the number they had been handed.

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" id="quotation-results">
        <ResultCard
          label="Professional fee"
          value={formatPHP(quote.professionalFee)}
          // Naming the desk days here is the point of itemising them: a
          // facilitation fee covering five days of work should not sit under a
          // label saying "2 engagement days".
          sublabel={
            quote.deskDays > 0
              ? `${quote.dayEquivalents} in the room · ${quote.deskDays} preparing and writing up`
              : `${quote.dayEquivalents} engagement ${
                  quote.dayEquivalents === 1 ? "day" : "days"
                }`
          }
        />
        <ResultCard
          label="Cost per day"
          value={formatPHP(quote.effectiveDayRate)}
          sublabel={`Across ${quote.daysCommitted} ${
            quote.daysCommitted === 1 ? "day" : "days"
          } of work in total`}
        />
        <ResultCard
          label="Billed logistics"
          value={formatPHP(quote.reimbursablesBilled)}
          sublabel={
            quote.reimbursablesCovered > 0
              ? `${formatPHP(quote.reimbursablesCovered)} arranged by you`
              : "None"
          }
        />
        <ResultCard
          label="Total"
          value={formatPHP(quote.total)}
          sublabel={`Quote ${quote.reference}`}
          variant="success"
        />
      </div>

      {quote.flags.length > 0 && (
        <div className="rounded-md border-l-4 border-l-warn bg-warn/5 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" /> Worth knowing
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {quote.flags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How the fee was built</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left">
                  <th className="py-2 pr-2 font-mono sm:pr-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Line
                  </th>
                  <th className="py-2 px-2 text-right font-mono sm:px-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Effect
                  </th>
                  {/* Three columns do not fit a phone: the running total was
                      clipped mid-figure ("₱18,00") and only reachable by
                      swiping the table sideways. Below `sm` it moves under the
                      effect instead, so nothing is lost and nothing scrolls. */}
                  <th className="hidden py-2 pl-3 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:table-cell">
                    Running
                  </th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((line) => {
                  const neutral = line.amount === 0;
                  return (
                    <tr key={line.id} className="border-b border-rule/60 align-top">
                      <td className="py-2.5 pr-2 sm:pr-3">
                        <p className={cn("font-medium", neutral && "text-muted-foreground")}>
                          {line.label}
                          {line.factor !== undefined && line.factor !== 1 && (
                            <span className="ml-2 font-mono text-[11px] text-ochre-deep dark:text-ochre tabular">
                              {factorLabel(line.factor)}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{line.detail}</p>
                      </td>
                      <td
                        className={cn(
                          "py-2.5 px-2 text-right whitespace-nowrap tabular sm:px-3",
                          neutral && "text-muted-foreground",
                          line.amount < 0 && "text-good"
                        )}
                      >
                        {neutral ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Minus className="h-3 w-3" /> no change
                          </span>
                        ) : (
                          <>
                            {line.amount > 0 && line.kind !== "base" && (
                              <Plus className="mr-0.5 inline-block h-3 w-3" />
                            )}
                            {formatPHP(line.amount)}
                          </>
                        )}
                        {/* whitespace-normal: the cell is nowrap so the figures
                            never break mid-number, but this sub-line may wrap —
                            without it the column could not fit a 320px phone. */}
                        <span className="block whitespace-normal text-xs text-muted-foreground sm:hidden">
                          running {formatPHP(line.runningTotal)}
                        </span>
                      </td>
                      <td className="hidden py-2.5 pl-3 text-right whitespace-nowrap text-muted-foreground tabular sm:table-cell">
                        {formatPHP(line.runningTotal)}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="py-3 pr-2 font-medium sm:pr-3">Professional fee</td>
                  <td className="py-3 px-2 text-right font-medium whitespace-nowrap tabular sm:hidden">
                    {formatPHP(quote.professionalFee)}
                  </td>
                  <td className="hidden sm:table-cell" />
                  <td className="hidden py-3 pl-3 text-right font-medium whitespace-nowrap tabular sm:table-cell">
                    {formatPHP(quote.professionalFee)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {quote.reimbursables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Travel and logistics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Estimated from {HOME_BASE}. Anything you arrange directly is shown at zero — the
              estimate stays visible so you can budget for it.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {quote.reimbursables.map((item) => (
                    <tr key={item.id} className="border-b border-rule/60 align-top">
                      <td className="py-2.5 pr-2 sm:pr-3">
                        <p className="font-medium">{item.label}</p>
                        {item.detail && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                        )}
                      </td>
                      {/* Not struck through: a strikethrough beside a price
                          reads as a discount being given, when the point is the
                          opposite — this is a cost the organiser is absorbing
                          directly, shown so they can budget for it. */}
                      <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular">
                        {item.billed ? (
                          formatPHP(item.amount)
                        ) : (
                          <>
                            {formatPHP(0)}
                            <span className="block text-xs font-normal text-muted-foreground">
                              you arrange, about {formatPHP(item.amount)}
                            </span>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 pr-3 font-medium">Billed to you</td>
                    <td className="py-3 pl-3 text-right font-medium whitespace-nowrap tabular">
                      {formatPHP(quote.reimbursablesBilled)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* `quote.invoicing.percentageTax` is deliberately not rendered here. It is
          the firm's own cost on gross receipts, not anything the organiser owes,
          and putting a tax the reader is not being charged onto their quote
          invites exactly the argument the itemisation exists to avoid. It stays
          on the quotation object for working out net take-home. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="text-foreground">Total payable</span> {formatPHP(quote.total)} —{" "}
            {formatPHP(quote.professionalFee)} professional fee
            {quote.reimbursablesBilled > 0
              ? ` plus ${formatPHP(quote.reimbursablesBilled)} in reimbursable logistics at actual cost with receipts`
              : ", with travel and accommodation arranged by you"}
            .
          </p>
          {quote.projectedGate > 0 && (
            <p>
              <span className="text-foreground">Share of projected gate</span>{" "}
              {formatPercent(quote.gateShare, 1)} of {formatPHP(quote.projectedGate)} in expected
              ticket revenue.
            </p>
          )}
          {quote.invoicing.entity && (
            <p>
              {/* The entity name ends in a full stop, so the sentence is built
                  so it never lands sentence-final — "1Punch Inc.." otherwise. */}
              <span className="text-foreground">Invoicing</span> a formal invoice is issued by{" "}
              {quote.invoicing.entity}
              {quote.invoicing.vatRegistered
                ? `, which is VAT-registered — VAT of ${formatPHP(quote.invoicing.vat)} is added to the total above and is claimable as input VAT if you are VAT-registered too.`
                : ", which is not VAT-registered, so no VAT is added to the total above."}
            </p>
          )}
          {quote.withholding.applies && (
            <p>
              <span className="text-foreground">Withholding tax</span>{" "}
              {quote.withholding.basis === "firm" ? (
                <>
                  billing by a training firm is ordinarily withheld at{" "}
                  {formatPercent(quote.withholding.rate * 100, 0)} as a contractor —{" "}
                  {formatPHP(quote.withholding.amount)} here, leaving{" "}
                  {formatPHP(quote.withholding.net)} net. A payor that instead treats it as
                  professional fees of a juridical entity withholds 10%. Your own classification
                  governs; either way it is your obligation to remit, not a deduction from the
                  total above.
                </>
              ) : (
                <>
                  professional fees paid to an individual are subject to creditable withholding of{" "}
                  {formatPercent(quote.withholding.rate * 100, 0)} —{" "}
                  {formatPHP(quote.withholding.amount)} here, leaving{" "}
                  {formatPHP(quote.withholding.net)} net. The rate is 5% instead where a sworn
                  declaration of gross receipts under ₱3M is on file. This is your obligation to
                  remit, not a deduction from the total above.
                </>
              )}
            </p>
          )}
          <p>
            <span className="text-foreground">Payment</span> 50% on confirmation, 50% within 15 days
            of the engagement.
          </p>
          <p>
            <span className="text-foreground">Cancellation</span> inside 14 days, 50% of the
            professional fee; inside 7 days, 100%. Non-refundable travel already booked is billed at
            cost either way.
          </p>
          <p>
            <span className="text-foreground">Validity</span> this quote holds until{" "}
            {formatEngagementDate(quote.validUntil)}, and the{" "}
            {quote.dates.length === 1 ? "date is" : "dates are"} held provisionally until{" "}
            {formatEngagementDate(quote.holdUntil)}.
          </p>
          <p className="text-xs">
            An estimate generated from a published rate card, not a contract. Availability is
            confirmed on booking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

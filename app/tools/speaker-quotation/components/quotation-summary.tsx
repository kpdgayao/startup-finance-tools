"use client";

import { AlertTriangle, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultCard } from "@/components/shared/result-card";
import { cn, formatPHP, formatPercent } from "@/lib/utils";
import { formatEngagementDate } from "@/lib/speaking/availability";
import { HOME_BASE } from "@/lib/speaking/rate-card";
import type { BudgetFit, LineKind, Quotation } from "@/lib/speaking/quotation";

/**
 * How a line's `factor` is written.
 *
 * A multiplier reads as "×1.15". An add-on's factor is a SHARE of the fee, not
 * a multiplier, so the same rendering turned a +20% recording licence into
 * "×0.20" — a number that looks like an 80% discount.
 */
function factorLabel(factor: number, kind: LineKind): string {
  if (kind === "addon") return `+${Math.round(factor * 100)}%`;
  return `×${factor.toFixed(2)}`;
}

/**
 * How the quote sits against a budget the organiser already had.
 *
 * The rule this panel exists to hold: scope to the budget, never discount to
 * it. So there is no "we can do it for less" anywhere here — every line is a
 * change to WHAT is being bought, with the saving computed by re-pricing that
 * exact change rather than estimated. If nothing gets there, it says so
 * plainly, which is more useful to both sides than a number that quietly
 * pretends the work costs less than it does.
 */
function BudgetPanel({ fit }: { fit: BudgetFit }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {fit.withinBudget ? "This fits your budget" : "This is above your budget"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Your budget
            </p>
            <p className="mt-1 font-medium tabular">{formatPHP(fit.budget)}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              This quote
            </p>
            <p className="mt-1 font-medium tabular">{formatPHP(fit.total)}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {fit.withinBudget ? "To spare" : "Difference"}
            </p>
            <p
              className={cn(
                "mt-1 font-medium tabular",
                fit.withinBudget ? "text-good" : "text-ochre-deep dark:text-ochre"
              )}
            >
              {formatPHP(fit.difference)}
            </p>
          </div>
        </div>

        {/* The within-budget note points at the add-ons without listing them.
            The list lives in the rate card, and copy that enumerated it here
            would go stale the first time one was added or renamed. */}
        {fit.withinBudget ? (
          <p className="font-serif text-[15px] leading-[1.55] text-ink-2">
            Nothing needs to change. If you would rather spend the difference than keep it, the
            optional extras on the form are the things most often wanted afterwards — and they
            are cheaper to agree now than to arrange on the day.
          </p>
        ) : (
          <>
            <p className="font-serif text-[15px] leading-[1.55] text-ink-2">
              I would rather change the engagement than the rate. A rate that moves to meet a
              budget was never a real rate, and you would be right to wonder what the first number
              was for. What can genuinely move is how much work is in it — and each of these is
              priced by rebuilding the quote with that one change made, so the saving is exactly
              what you would see if you made it.
            </p>

            {fit.levers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {fit.levers.map((lever) => (
                      <tr key={lever.id} className="border-b border-rule/60 align-top">
                        <td className="py-2.5 pr-2 sm:pr-3">
                          <p className="font-medium">{lever.label}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{lever.detail}</p>
                        </td>
                        <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular text-good">
                          −{formatPHP(lever.saving)}
                          <span className="block whitespace-normal text-xs font-normal text-muted-foreground">
                            leaves {formatPHP(lever.total)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {fit.levers.length === 0 ? (
                <>
                  There is nothing left to take out of this one — it is already the smallest
                  version of what you described. Tell me what you are working with and I will say
                  honestly whether it can be done.
                </>
              ) : (
                <>
                  {/* Never "all of them": where two are alternatives — a
                      shorter session and an online one both rewrite the
                      format — only the better one is in this figure. Saying
                      otherwise would overstate what is reachable. */}
                  {fit.combined.length === 1
                    ? `${
                        fit.levers.length === 1 ? "That" : "The largest of these"
                      } on its own brings it to `
                    : null}
                  {fit.combined.length > 1 && fit.combined.length === fit.levers.length
                    ? "Taken together they bring it to "
                    : null}
                  {fit.combined.length > 1 && fit.combined.length < fit.levers.length
                    ? "Combined, counting only the better of the alternatives above, they bring it to "
                    : null}
                  {formatPHP(fit.floor)}
                  {fit.reachable ? (
                    <>
                      , inside your budget. Change the answers above to see where any of them
                      lands on its own — you may not need them all.
                    </>
                  ) : (
                    <>
                      , still above your budget. That is worth knowing now rather than after we
                      have both spent a week on it — send the enquiry anyway and say what you are
                      working with.
                    </>
                  )}
                </>
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
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
        {/* Per participant, not per day, wherever seats are what is being
            bought. A day rate is the most alarming way to state a fee and the
            least useful — nobody is buying a day, and the reader's real
            question is what this costs for the people they are responsible
            for. The day rate is still on the fee's base line below, where its
            reasoning is attached to it.

            Facilitation is the exception: nobody in a planning room is a seat,
            and dividing a strategy engagement by heads produces a number that
            means nothing. */}
        {quote.engagementType === "facilitation" ? (
          <ResultCard
            label="Cost per day"
            value={formatPHP(quote.effectiveDayRate)}
            sublabel={`Across ${quote.daysCommitted} ${
              quote.daysCommitted === 1 ? "day" : "days"
            } of work in total`}
          />
        ) : (
          <ResultCard
            label="Per participant"
            value={formatPHP(quote.perParticipant)}
            sublabel={`Everything below, across ${quote.audienceSize.toLocaleString(
              "en-PH"
            )} ${quote.audienceSize === 1 ? "person" : "people"}`}
          />
        )}
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

      {quote.budgetFit && <BudgetPanel fit={quote.budgetFit} />}

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
                              {factorLabel(line.factor, line.kind)}
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

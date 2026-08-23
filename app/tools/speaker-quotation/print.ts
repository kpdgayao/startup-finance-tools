import { section, summaryCard, table } from "@/components/shared/export-pdf-button";
import { formatPHP, formatPercent } from "@/lib/utils";
import { HOME_BASE } from "@/lib/speaking/rate-card";
import { formatEngagementDate } from "@/lib/speaking/availability";
import { NAME } from "@/lib/kevin";
import type { Quotation, QuotationInput } from "@/lib/speaking/quotation";

/**
 * Escape text before it reaches the print document.
 *
 * The shared print helpers interpolate their arguments into HTML unescaped.
 * Every other tool feeds them formatted numbers, so it has never mattered —
 * this one carries free text the organiser typed (event title, organisation,
 * venue), which would otherwise be able to inject markup into the quote they
 * then forward as a PDF.
 */
function esc(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Builds the printable quotation. Mirrors the on-screen breakdown exactly. */
export function buildQuotationPrint(quote: Quotation, input: QuotationInput): string {
  const parts: string[] = [];

  parts.push(
    section(
      "Engagement",
      table(
        ["Detail", "Value"],
        [
          ["Quotation reference", esc(quote.reference)],
          // A forwarded PDF lands on a desk that has never seen this page. It
          // has to name its own supplier, or finance cannot match it to
          // anything: the previous version identified the client but never the
          // party being paid.
          [
            "Quotation from",
            // Credentials without the second company name. ROLE_LINE ends in
            // "CEO, IOL Inc.", and an accounts-payable clerk reading that
            // above "Invoiced by 1Punch Inc." has two firms and no way to tell
            // which one to pay.
            `${esc(NAME)}, CPA · MBA${
              quote.invoicing.entity
                ? `<br>Invoice and official receipt issued by ${esc(quote.invoicing.entity)}`
                : "<br>Billed personally, not through a firm"
            }`,
          ],
          ["Prepared for", esc(input.organizationName) || "—"],
          ["Event", esc(input.eventTitle) || "—"],
          ["Venue", esc(input.venue) || "—"],
          [
            "Dates",
            quote.dates
              .map((d) => esc(formatEngagementDate(d.date, { weekday: true })))
              .join("<br>"),
          ],
          ["Participants", input.audienceSize.toLocaleString("en-PH")],
          [
            "Engagement days",
            `${quote.dayEquivalents} delivery${
              quote.daysCommitted > quote.dayEquivalents
                ? `, ${Number((quote.daysCommitted - quote.dayEquivalents).toFixed(3))} travel`
                : ""
            }`,
          ],
          ["Topic tier", `${esc(quote.topicTier)} — ${formatPHP(quote.dayRate)}/day`],
        ]
      )
    )
  );

  parts.push(
    section(
      "Summary",
      `<div class="summary-grid">
        ${summaryCard("Professional fee", formatPHP(quote.professionalFee))}
        ${summaryCard("Cost per day", formatPHP(quote.effectiveDayRate), {
          sublabel: `Across ${quote.daysCommitted} day(s) of delivery and travel`,
        })}
        ${summaryCard("Billed logistics", formatPHP(quote.reimbursablesBilled), {
          sublabel:
            quote.reimbursablesCovered > 0
              ? `${formatPHP(quote.reimbursablesCovered)} arranged by the organiser`
              : undefined,
        })}
        ${summaryCard("Total", formatPHP(quote.total), { variant: "highlight" })}
      </div>`
    )
  );

  parts.push(
    section(
      "How the fee was built",
      table(
        ["Line", "Effect", "Running total"],
        quote.lines.map((line) => [
          `<strong>${esc(line.label)}</strong>${
            line.factor !== undefined && line.factor !== 1
              ? ` (×${line.factor.toFixed(2)})`
              : ""
          }<br><span class="muted">${esc(line.detail)}</span>`,
          line.amount === 0 ? "no change" : formatPHP(line.amount),
          formatPHP(line.runningTotal),
        ])
      ) +
        `<p class="note">Professional fee: ${formatPHP(quote.professionalFee)}</p>`
    )
  );

  if (quote.reimbursables.length > 0) {
    parts.push(
      section(
        "Travel and logistics",
        table(
          ["Item", "Estimate", "Billed"],
          quote.reimbursables.map((item) => [
            `<strong>${esc(item.label)}</strong>${
              item.detail ? `<br><span class="muted">${esc(item.detail)}</span>` : ""
            }`,
            formatPHP(item.amount),
            item.billed ? formatPHP(item.amount) : formatPHP(0),
          ])
        ) +
          `<p class="note">Estimated from ${esc(
            HOME_BASE
          )}. Items the organiser arranges directly are shown at zero; billed items are charged at actual cost with receipts.</p>`
      )
    );
  }

  const terms: string[] = [];
  terms.push(
    `<strong>Total payable</strong> ${formatPHP(quote.total)} — ${formatPHP(
      quote.professionalFee
    )} professional fee${
      quote.reimbursablesBilled > 0
        ? ` plus ${formatPHP(quote.reimbursablesBilled)} in reimbursable logistics`
        : ", with travel and accommodation arranged by the organiser"
    }.`
  );
  if (quote.projectedGate > 0) {
    terms.push(
      `<strong>Share of projected gate</strong> ${formatPercent(
        quote.gateShare,
        1
      )} of ${formatPHP(quote.projectedGate)} in expected ticket revenue.`
    );
  }
  if (quote.invoicing.entity) {
    terms.push(
      `<strong>Invoicing</strong> a formal invoice is issued by ${esc(quote.invoicing.entity)}${
        quote.invoicing.vatRegistered
          ? `, which is VAT-registered — VAT of ${formatPHP(
              quote.invoicing.vat
            )} is added to the total above and is claimable as input VAT if you are VAT-registered too.`
          : ", which is not VAT-registered, so no VAT is added to the total above."
      }`
    );
  }
  if (quote.withholding.applies) {
    terms.push(
      quote.withholding.basis === "firm"
        ? `<strong>Withholding tax</strong> billing by a training firm is ordinarily withheld at ${formatPercent(
            quote.withholding.rate * 100,
            0
          )} as a contractor — ${formatPHP(quote.withholding.amount)} here, leaving ${formatPHP(
            quote.withholding.net
          )} net. A payor that instead treats it as professional fees of a juridical entity withholds 10%. Your own classification governs; either way remittance is the organiser's obligation and is not deducted from the total above.`
        : `<strong>Withholding tax</strong> professional fees paid to an individual are subject to creditable withholding of ${formatPercent(
            quote.withholding.rate * 100,
            0
          )} — ${formatPHP(quote.withholding.amount)} here, leaving ${formatPHP(
            quote.withholding.net
          )} net. The rate is 5% where a sworn declaration of gross receipts under P3M is on file. Remittance is the organiser's obligation and is not deducted from the total above.`
    );
  }
  terms.push(
    "<strong>Payment</strong> 50% on confirmation, 50% within 15 days of the engagement."
  );
  terms.push(
    "<strong>Cancellation</strong> inside 14 days, 50% of the professional fee; inside 7 days, 100%. Non-refundable travel already booked is billed at cost either way."
  );
  terms.push(
    `<strong>Validity</strong> this quotation holds until ${esc(
      formatEngagementDate(quote.validUntil)
    )}. The ${
      quote.dates.length === 1 ? "date is" : "dates are"
    } held provisionally until ${esc(formatEngagementDate(quote.holdUntil))}.`
  );

  parts.push(
    section(
      "Terms",
      terms.map((t) => `<p style="margin-bottom:6px">${t}</p>`).join("") +
        `<p class="note">An estimate generated from a published rate card, not a contract. Availability is confirmed on booking.</p>`
    )
  );

  if (quote.flags.length > 0) {
    parts.push(
      section(
        "Notes",
        `<ul style="padding-left:18px">${quote.flags
          .map((flag) => `<li style="margin-bottom:4px">${esc(flag)}</li>`)
          .join("")}</ul>`
      )
    );
  }

  return parts.join("");
}

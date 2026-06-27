"use client";

import { Button } from "@/components/ui/button";
import { ExportPDFButton, summaryCard, section, table } from "@/components/shared/export-pdf-button";
import { formatPHP } from "@/lib/utils";
import type { MonthlyProjection, CashFlowSummary } from "@/lib/calculations/cash-flow";
import { Download, RotateCcw } from "lucide-react";

interface CashFlowActionsProps {
  onReset: () => void;
  onExportCSV: () => void;
  startingBalance: number;
  mrr: number;
  fixedCosts: number;
  variableCostPercent: number;
  paymentTerms: number;
  payableTerms: number;
  projections: MonthlyProjection[];
  stats: CashFlowSummary;
}

export function CashFlowActions({
  onReset,
  onExportCSV,
  startingBalance,
  mrr,
  fixedCosts,
  variableCostPercent,
  paymentTerms,
  payableTerms,
  projections,
  stats,
}: CashFlowActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Cash Flow Forecaster</h1>
        <p className="text-muted-foreground mt-1">
          12-month cash flow projection with DSO/DPO timing adjustments.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onReset} title="Reset to defaults">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <ExportPDFButton
          filename="Cash Flow Forecast"
          enableEmailCapture
          buildPrintContent={() => {
            const parts: string[] = [];

            // Assumptions
            parts.push(section("Assumptions", `<div class="summary-grid">
              ${summaryCard("Starting Balance", formatPHP(startingBalance))}
              ${summaryCard("Monthly Revenue", formatPHP(mrr))}
              ${summaryCard("Fixed Costs", formatPHP(fixedCosts))}
              ${summaryCard("Variable Cost %", `${variableCostPercent}%`)}
              ${summaryCard("Payment Terms (DSO)", `${paymentTerms} days`)}
              ${summaryCard("Payable Terms (DPO)", `${payableTerms} days`)}
            </div>`));

            // Key Metrics
            const negMonthsVariant = stats.negativeMonths === 0 ? "success" as const : stats.negativeMonths <= 3 ? "warning" as const : "danger" as const;
            parts.push(section("Key Metrics", `<div class="summary-grid">
              ${summaryCard("Total 12-Month Inflow", formatPHP(stats.totalInflow))}
              ${summaryCard("Total Outflow", formatPHP(stats.totalOutflow))}
              ${summaryCard("Ending Cash Balance", formatPHP(stats.finalBalance), { variant: stats.finalBalance > 0 ? "success" : "danger" })}
              ${summaryCard("Negative Cash Flow Months", `${stats.negativeMonths} of 12`, { variant: negMonthsVariant })}
              ${summaryCard("Avg Monthly Net Flow", formatPHP(stats.avgNetFlow))}
              ${summaryCard("Cash Conversion Cycle", `${stats.cashConversionCycle} days`)}
            </div>`));

            // Monthly Projection Table
            const totalRevenue = projections.reduce((s, p) => s + p.revenue, 0);
            const totalExpenses = projections.reduce((s, p) => s + p.totalExpenses, 0);
            parts.push(section("Monthly Projection", table(
              ["Month", "Opening", "Revenue", "Cash In", "Expenses", "Cash Out", "Net Flow", "Closing"],
              [
                ...projections.map((p) => [
                  p.monthLabel,
                  formatPHP(p.openingBalance),
                  formatPHP(p.revenue),
                  formatPHP(p.cashInflow),
                  formatPHP(p.totalExpenses),
                  formatPHP(p.cashOutflow),
                  formatPHP(p.netCashFlow),
                  formatPHP(p.closingBalance),
                ]),
                [
                  "Total / Final",
                  "",
                  formatPHP(totalRevenue),
                  formatPHP(stats.totalInflow),
                  formatPHP(totalExpenses),
                  formatPHP(stats.totalOutflow),
                  formatPHP(stats.totalNetFlow),
                  formatPHP(stats.finalBalance),
                ],
              ]
            )));

            return parts.join("");
          }}
        />
      </div>
    </div>
  );
}
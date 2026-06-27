"use client";

import { Button } from "@/components/ui/button";
import { LearnLink } from "@/components/shared/learn-link";
import { ExportPDFButton, summaryCard, section, table } from "@/components/shared/export-pdf-button";
import { formatPHP } from "@/lib/utils";
import type { AnnualRow, BalanceSheetSeed, FinancialModelSummary } from "@/lib/calculations/financial-model";
import { Download, RotateCcw } from "lucide-react";

interface FinancialModelActionsProps {
  onReset: () => void;
  onExportCSV: () => void;
  startingRevenue: number;
  monthlyGrowthRate: number;
  cogsPercent: number;
  fixedOpEx: number;
  variableOpExPercent: number;
  startingCash: number;
  dso: number;
  dpo: number;
  taxRate: number;
  annualCapEx: number;
  depreciationYears: number;
  annual: AnnualRow[];
  seed: BalanceSheetSeed;
  summary: FinancialModelSummary;
}

export function FinancialModelActions({
  onReset,
  onExportCSV,
  startingRevenue,
  monthlyGrowthRate,
  cogsPercent,
  fixedOpEx,
  variableOpExPercent,
  startingCash,
  dso,
  dpo,
  taxRate,
  annualCapEx,
  depreciationYears,
  annual,
  seed,
  summary,
}: FinancialModelActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          Financial Model Builder
        </h1>
        <p className="text-muted-foreground mt-1">
          3-year integrated P&L, Balance Sheet, and Cash Flow model.
        </p>
        <LearnLink toolHref="/tools/financial-model-builder" />
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
          filename="Financial Model"
          enableEmailCapture
          buildPrintContent={() => {
            const parts: string[] = [];

            // Assumptions
            parts.push(section("Assumptions", `<div class="summary-grid">
              ${summaryCard("Starting Revenue", formatPHP(startingRevenue))}
              ${summaryCard("Monthly Growth", `${monthlyGrowthRate}%`)}
              ${summaryCard("COGS %", `${cogsPercent}%`)}
              ${summaryCard("Fixed OpEx", formatPHP(fixedOpEx))}
              ${summaryCard("Variable OpEx %", `${variableOpExPercent}%`)}
              ${summaryCard("Starting Cash", formatPHP(startingCash))}
              ${summaryCard("DSO", `${dso} days`)}
              ${summaryCard("DPO", `${dpo} days`)}
              ${summaryCard("Tax Rate", `${taxRate}%`)}
              ${summaryCard("CapEx", formatPHP(annualCapEx))}
              ${summaryCard("Depreciation Years", `${depreciationYears} yrs`)}
            </div>`));

            // Key Metrics
            const gmVariant = summary.avgGrossMargin >= 60 ? "success" as const : summary.avgGrossMargin >= 40 ? "warning" as const : "danger" as const;
            parts.push(section("Key Metrics", `<div class="summary-grid">
              ${summaryCard("3-Year Revenue", formatPHP(summary.threeYearRevenue))}
              ${summaryCard("Avg Gross Margin", `${summary.avgGrossMargin.toFixed(1)}%`, { variant: gmVariant })}
              ${summaryCard("Year 3 EBITDA", formatPHP(summary.year3Ebitda), { variant: summary.year3Ebitda > 0 ? "success" : "danger" })}
              ${summaryCard("Year 3 Net Income", formatPHP(summary.year3NetIncome), { variant: summary.year3NetIncome > 0 ? "success" : "danger" })}
            </div>`));

            // P&L Table
            parts.push(section("Profit & Loss", table(
              ["P&L Item", "Year 1", "Year 2", "Year 3"],
              [
                ["Revenue", ...annual.map((a) => formatPHP(a.revenue))],
                ["COGS", ...annual.map((a) => formatPHP(a.cogs))],
                ["Gross Profit", ...annual.map((a) => formatPHP(a.grossProfit))],
                ["Fixed OpEx", ...annual.map((a) => formatPHP(a.fixedOpEx))],
                ["Variable OpEx", ...annual.map((a) => formatPHP(a.variableOpEx))],
                ["Total OpEx", ...annual.map((a) => formatPHP(a.totalOpEx))],
                ["EBITDA", ...annual.map((a) => formatPHP(a.ebitda))],
                ["Depreciation", ...annual.map((a) => formatPHP(a.depreciation))],
                ["EBIT", ...annual.map((a) => formatPHP(a.ebit))],
                ["Tax", ...annual.map((a) => formatPHP(a.tax))],
                ["Net Income", ...annual.map((a) => formatPHP(a.netIncome))],
                ["Gross Margin %", ...annual.map((a) => `${a.grossMarginPercent.toFixed(1)}%`)],
                ["Net Margin %", ...annual.map((a) => `${a.netMarginPercent.toFixed(1)}%`)],
              ]
            )));

            // Balance Sheet Table
            parts.push(section("Balance Sheet", table(
              ["Item", "Year 0", "Year 1", "Year 2", "Year 3"],
              [
                ["Cash", formatPHP(seed.cash), ...annual.map((a) => formatPHP(a.cash))],
                ["Accounts Receivable", formatPHP(seed.accountsReceivable), ...annual.map((a) => formatPHP(a.accountsReceivable))],
                ["Net PP&E", formatPHP(seed.netPPE), ...annual.map((a) => formatPHP(a.netPPE))],
                ["Total Assets", formatPHP(seed.totalAssets), ...annual.map((a) => formatPHP(a.totalAssets))],
                ["Accounts Payable", formatPHP(seed.accountsPayable), ...annual.map((a) => formatPHP(a.accountsPayable))],
                ["Total Liabilities", formatPHP(seed.totalLiabilities), ...annual.map((a) => formatPHP(a.totalLiabilities))],
                ["Retained Earnings", formatPHP(seed.retainedEarnings), ...annual.map((a) => formatPHP(a.retainedEarnings))],
                ["Total Equity", formatPHP(seed.totalEquity), ...annual.map((a) => formatPHP(a.totalEquity))],
              ]
            )));

            // Cash Flow Table
            parts.push(section("Cash Flow", table(
              ["Item", "Year 1", "Year 2", "Year 3"],
              [
                ["Operating CF", ...annual.map((a) => formatPHP(a.operatingCF))],
                ["Investing CF", ...annual.map((a) => formatPHP(a.investingCF))],
                ["Net Cash Flow", ...annual.map((a) => formatPHP(a.netCashFlow))],
                ["Ending Cash", ...annual.map((a) => formatPHP(a.cash))],
              ]
            )));

            return parts.join("");
          }}
        />
      </div>
    </div>
  );
}
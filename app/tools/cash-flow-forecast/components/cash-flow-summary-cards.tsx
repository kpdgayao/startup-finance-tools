"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatPHP } from "@/lib/utils";
import type { CashFlowSummary } from "@/lib/calculations/cash-flow";
import { TrendingUp, TrendingDown, ArrowUpDown, RotateCcw, AlertTriangle } from "lucide-react";

interface CashFlowSummaryCardsProps {
  stats: CashFlowSummary;
  startingBalance: number;
  paymentTerms: number;
  payableTerms: number;
  hasWorkingCapitalImpact: boolean;
}

export function CashFlowSummaryCards({
  stats,
  startingBalance,
  paymentTerms,
  payableTerms,
  hasWorkingCapitalImpact,
}: CashFlowSummaryCardsProps) {
  return (
    <>
      {/* Working Capital Info — explains DSO > DPO impact */}
      {hasWorkingCapitalImpact && (
        <Card className="border-warn/30 bg-warn/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warn mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-warn">Working Capital Tied Up</p>
              <p className="text-muted-foreground mt-1">
                With DSO={paymentTerms} days and DPO={payableTerms} days, you have{" "}
                <span className="font-mono font-medium text-foreground">{formatPHP(stats.workingCapitalImpact)}</span>{" "}
                tied up in working capital (AR minus AP). You collect payments after ~{paymentTerms} days but
                pay expenses after ~{payableTerms} days, creating a {stats.cashConversionCycle}-day gap
                that needs to be funded from your cash reserves.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultCard label="Total 12-Month Inflow" value={formatPHP(stats.totalInflow)} sublabel="Cash collected from customers" />
        <ResultCard label="Total 12-Month Outflow" value={formatPHP(stats.totalOutflow)} sublabel="Cash paid to suppliers/ops" />
        <ResultCard
          label="Ending Cash Balance"
          value={formatPHP(stats.finalBalance)}
          variant={stats.finalBalance > 0 ? "success" : "danger"}
          sublabel={`Started at ${formatPHP(startingBalance)}`}
        />
        <ResultCard
          label="Negative Cash Flow Months"
          value={`${stats.negativeMonths} of 12`}
          variant={stats.negativeMonths === 0 ? "success" : stats.negativeMonths <= 3 ? "warning" : "danger"}
          sublabel={stats.negativeBalanceMonths > 0 ? `${stats.negativeBalanceMonths} month(s) end with negative balance` : undefined}
        />
      </div>

      {/* Key Insights Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-good/10">
              <TrendingUp className="h-5 w-5 text-good" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Best Month</p>
              <p className="font-semibold">{stats.bestMonth.monthLabel}: {formatPHP(stats.bestMonth.netCashFlow)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-bad/10">
              <TrendingDown className="h-5 w-5 text-bad" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Worst Month</p>
              <p className="font-semibold">{stats.worstMonth.monthLabel}: {formatPHP(stats.worstMonth.netCashFlow)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-3/10">
              <ArrowUpDown className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Monthly Net Flow</p>
              <p className="font-semibold">{formatPHP(stats.avgNetFlow)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-ochre/10">
              <RotateCcw className="h-5 w-5 text-ochre" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Cash Conversion Cycle
                <InfoTooltip content="CCC = DSO - DPO. Negative CCC means you collect from customers before paying suppliers (ideal). Positive CCC means you need working capital to bridge the gap." />
              </p>
              <p className={`font-semibold ${stats.cashConversionCycle < 0 ? "text-good" : stats.cashConversionCycle > 0 ? "text-warn" : ""}`}>
                {stats.cashConversionCycle} days {stats.cashConversionCycle < 0 ? "(favorable)" : stats.cashConversionCycle > 0 ? "(needs working capital)" : "(neutral)"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
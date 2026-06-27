"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPHP } from "@/lib/utils";
import type { MonthlyProjection, CashFlowSummary } from "@/lib/calculations/cash-flow";

interface CashFlowProjectionTableProps {
  projections: MonthlyProjection[];
  stats: CashFlowSummary;
}

export function CashFlowProjectionTable({
  projections,
  stats,
}: CashFlowProjectionTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Projection Detail</CardTitle>
        <CardDescription>
          Accrual columns show what you earned/incurred. Cash columns show when money actually moves (adjusted for DSO/DPO).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile card view */}
        <div className="lg:hidden space-y-3" id="cash-flow-detail-mobile">
          {projections.map((p) => (
            <div
              key={p.month}
              className={`rounded-lg border p-4 space-y-2 ${p.closingBalance < 0 ? "border-red-500/30 bg-red-500/5" : "border-border/50"}`}
            >
              <p className="font-semibold">{p.monthLabel}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Revenue</span>
                <span className="text-right font-mono text-blue-400/70">{formatPHP(p.revenue)}</span>
                <span className="text-muted-foreground">Cash In</span>
                <span className="text-right font-mono text-green-400">{formatPHP(p.cashInflow)}</span>
                <span className="text-muted-foreground">Expenses</span>
                <span className="text-right font-mono text-blue-400/70">{formatPHP(p.totalExpenses)}</span>
                <span className="text-muted-foreground">Cash Out</span>
                <span className="text-right font-mono text-red-400">{formatPHP(p.cashOutflow)}</span>
                <span className="text-muted-foreground">Net Flow</span>
                <span className={`text-right font-mono font-medium ${p.netCashFlow < 0 ? "text-red-400" : "text-green-400"}`}>
                  {formatPHP(p.netCashFlow)}
                </span>
                <span className="text-muted-foreground">Closing Balance</span>
                <span className={`text-right font-mono font-semibold ${p.closingBalance < 0 ? "text-red-400" : ""}`}>
                  {formatPHP(p.closingBalance)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table view */}
        <div className="overflow-x-auto hidden lg:block" id="cash-flow-detail">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Month</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Opening</th>
                <th className="text-right py-3 px-2 font-medium text-blue-400/70">Revenue</th>
                <th className="text-right py-3 px-2 font-medium text-green-400/70">Cash In</th>
                <th className="text-right py-3 px-2 font-medium text-blue-400/70">Expenses</th>
                <th className="text-right py-3 px-2 font-medium text-red-400/70">Cash Out</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Net Flow</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Closing</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">AR</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">AP</th>
              </tr>
              <tr className="border-b border-border/30">
                <th className="text-left py-1 px-2 text-[10px] text-muted-foreground/50 font-normal"></th>
                <th className="text-right py-1 px-2 text-[10px] text-muted-foreground/50 font-normal">cash</th>
                <th className="text-right py-1 px-2 text-[10px] text-blue-400/40 font-normal">accrual</th>
                <th className="text-right py-1 px-2 text-[10px] text-green-400/40 font-normal">cash</th>
                <th className="text-right py-1 px-2 text-[10px] text-blue-400/40 font-normal">accrual</th>
                <th className="text-right py-1 px-2 text-[10px] text-red-400/40 font-normal">cash</th>
                <th className="text-right py-1 px-2 text-[10px] text-muted-foreground/50 font-normal">cash</th>
                <th className="text-right py-1 px-2 text-[10px] text-muted-foreground/50 font-normal">cash</th>
                <th className="text-right py-1 px-2 text-[10px] text-muted-foreground/50 font-normal">owed</th>
                <th className="text-right py-1 px-2 text-[10px] text-muted-foreground/50 font-normal">owed</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((p) => (
                <tr
                  key={p.month}
                  className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${p.closingBalance < 0 ? "bg-red-500/5" : ""}`}
                >
                  <td className="py-3 px-2 font-medium">{p.monthLabel}</td>
                  <td className="py-3 px-2 text-right font-mono text-muted-foreground">{formatPHP(p.openingBalance)}</td>
                  <td className="py-3 px-2 text-right font-mono text-blue-400/70">{formatPHP(p.revenue)}</td>
                  <td className="py-3 px-2 text-right font-mono text-green-400">{formatPHP(p.cashInflow)}</td>
                  <td className="py-3 px-2 text-right font-mono text-blue-400/70">{formatPHP(p.totalExpenses)}</td>
                  <td className="py-3 px-2 text-right font-mono text-red-400">{formatPHP(p.cashOutflow)}</td>
                  <td className={`py-3 px-2 text-right font-mono font-medium ${p.netCashFlow < 0 ? "text-red-400" : "text-green-400"}`}>
                    {formatPHP(p.netCashFlow)}
                  </td>
                  <td className={`py-3 px-2 text-right font-mono font-semibold ${p.closingBalance < 0 ? "text-red-400" : ""}`}>
                    {formatPHP(p.closingBalance)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-muted-foreground text-xs">{formatPHP(p.accountsReceivable)}</td>
                  <td className="py-3 px-2 text-right font-mono text-muted-foreground text-xs">{formatPHP(p.accountsPayable)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold">
                <td className="py-3 px-2">Total / Final</td>
                <td className="py-3 px-2"></td>
                <td className="py-3 px-2 text-right font-mono text-blue-400/70">
                  {formatPHP(projections.reduce((s, p) => s + p.revenue, 0))}
                </td>
                <td className="py-3 px-2 text-right font-mono text-green-400">{formatPHP(stats.totalInflow)}</td>
                <td className="py-3 px-2 text-right font-mono text-blue-400/70">
                  {formatPHP(projections.reduce((s, p) => s + p.totalExpenses, 0))}
                </td>
                <td className="py-3 px-2 text-right font-mono text-red-400">{formatPHP(stats.totalOutflow)}</td>
                <td className={`py-3 px-2 text-right font-mono ${stats.totalNetFlow < 0 ? "text-red-400" : "text-green-400"}`}>
                  {formatPHP(stats.totalNetFlow)}
                </td>
                <td className={`py-3 px-2 text-right font-mono ${stats.finalBalance < 0 ? "text-red-400" : ""}`}>
                  {formatPHP(stats.finalBalance)}
                </td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
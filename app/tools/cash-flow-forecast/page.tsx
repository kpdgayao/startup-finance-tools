"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatPHP } from "@/lib/utils";
import {
  projectMonthlyCashFlow,
  exportToCSV,
  type CashFlowInputs,
} from "@/lib/calculations/cash-flow";
import { Download } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function CashFlowForecastPage() {
  const [startingBalance, setStartingBalance] = useState(3000000);
  const [mrr, setMrr] = useState(500000);
  const [fixedCosts, setFixedCosts] = useState(400000);
  const [variableCostPercent, setVariableCostPercent] = useState(20);
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [payableTerms, setPayableTerms] = useState(15);
  const [oneTimeIncome, setOneTimeIncome] = useState<number[]>(Array(12).fill(0));

  const inputs: CashFlowInputs = {
    monthlyRecurringRevenue: mrr,
    monthlyOneTimeIncome: oneTimeIncome,
    fixedCosts,
    variableCostPercent,
    paymentTermsDays: paymentTerms,
    payableTermsDays: payableTerms,
  };

  const projections = projectMonthlyCashFlow(inputs, startingBalance);

  const totalInflow = projections.reduce((s, p) => s + p.cashInflow, 0);
  const totalOutflow = projections.reduce((s, p) => s + p.cashOutflow, 0);
  const negativeMonths = projections.filter((p) => p.netCashFlow < 0).length;
  const finalBalance = projections[projections.length - 1]?.cumulativeBalance ?? startingBalance;

  const chartData = projections.map((p) => ({
    month: p.monthLabel,
    Inflow: p.cashInflow,
    Outflow: -p.cashOutflow,
    "Cumulative Balance": p.cumulativeBalance,
  }));

  const handleExportCSV = () => {
    const csv = exportToCSV(projections);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cash-flow-forecast.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cash Flow Forecaster</h1>
          <p className="text-muted-foreground mt-1">
            12-month cash flow projection with DSO/DPO tracking.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Revenue & Cost Inputs
            <InfoTooltip content="DSO (Days Sales Outstanding) = how long before you collect payments. DPO (Days Payable Outstanding) = how long before you pay your bills. From Kevin's deck on cash management." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CurrencyInput label="Starting Cash Balance" value={startingBalance} onChange={setStartingBalance} />
            <CurrencyInput label="Monthly Recurring Revenue" value={mrr} onChange={setMrr} />
            <CurrencyInput label="Fixed Costs (monthly)" value={fixedCosts} onChange={setFixedCosts} />
            <PercentageInput label="Variable Cost (% of revenue)" value={variableCostPercent} onChange={setVariableCostPercent} />
            <div className="space-y-2">
              <Label>
                Payment Terms (DSO)
                <InfoTooltip content="Days Sales Outstanding — average days to collect payment from customers." />
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(parseInt(e.target.value) || 0)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">days</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Payable Terms (DPO)
                <InfoTooltip content="Days Payable Outstanding — average days before you pay your suppliers." />
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={payableTerms}
                  onChange={(e) => setPayableTerms(parseInt(e.target.value) || 0)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* One-Time Income */}
      <Card>
        <CardHeader>
          <CardTitle>One-Time Income by Month</CardTitle>
          <CardDescription>Add any one-time income (grants, contract payments, etc.) per month.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {oneTimeIncome.map((val, i) => (
              <div key={i} className="space-y-1">
                <Label className="text-xs">{projections[i]?.monthLabel || `M${i + 1}`}</Label>
                <Input
                  type="number"
                  min={0}
                  className="text-sm"
                  value={val || ""}
                  onChange={(e) => {
                    const next = [...oneTimeIncome];
                    next[i] = parseFloat(e.target.value) || 0;
                    setOneTimeIncome(next);
                  }}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ResultCard label="Total 12-Month Inflow" value={formatPHP(totalInflow)} />
        <ResultCard label="Total 12-Month Outflow" value={formatPHP(totalOutflow)} />
        <ResultCard
          label="Ending Balance"
          value={formatPHP(finalBalance)}
          variant={finalBalance > 0 ? "success" : "danger"}
        />
        <ResultCard
          label="Negative Cash Flow Months"
          value={`${negativeMonths} of 12`}
          variant={negativeMonths === 0 ? "success" : negativeMonths <= 3 ? "warning" : "danger"}
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Visualization</CardTitle>
          <CardDescription>Monthly inflows vs outflows with cumulative balance line.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                yAxisId="bars"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`}
              />
              <YAxis
                yAxisId="line"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(v) => `₱${(v / 1000000).toFixed(1)}M`}
              />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                formatter={(value) => formatPHP(Math.abs(Number(value)))}
              />
              <Legend />
              <Bar yAxisId="bars" dataKey="Inflow" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="bars" dataKey="Outflow" fill="hsl(var(--chart-5))" radius={[2, 2, 0, 0]} />
              <Line yAxisId="line" type="monotone" dataKey="Cumulative Balance" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Projection Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto" id="cash-flow-detail">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Month</th>
                  <th className="text-right py-2 px-2">Cash In</th>
                  <th className="text-right py-2 px-2">Cash Out</th>
                  <th className="text-right py-2 px-2">Net Flow</th>
                  <th className="text-right py-2 px-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p) => (
                  <tr
                    key={p.month}
                    className={`border-b border-border/50 ${p.netCashFlow < 0 ? "bg-red-500/5" : ""}`}
                  >
                    <td className="py-2 px-2 font-medium">{p.monthLabel}</td>
                    <td className="py-2 px-2 text-right font-mono text-green-400">{formatPHP(p.cashInflow)}</td>
                    <td className="py-2 px-2 text-right font-mono text-red-400">{formatPHP(p.cashOutflow)}</td>
                    <td className={`py-2 px-2 text-right font-mono ${p.netCashFlow < 0 ? "text-red-400" : "text-green-400"}`}>
                      {formatPHP(p.netCashFlow)}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono font-medium ${p.cumulativeBalance < 0 ? "text-red-400" : ""}`}>
                      {formatPHP(p.cumulativeBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

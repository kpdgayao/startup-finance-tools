"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatPHP } from "@/lib/utils";
import {
  projectMonthlyCashFlow,
  calculateSummary,
  exportToCSV,
  type CashFlowInputs,
} from "@/lib/calculations/cash-flow";
import { Download, TrendingUp, TrendingDown, ArrowUpDown, RotateCcw } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  AreaChart,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-medium text-sm mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono font-medium">
            {formatPHP(Math.abs(entry.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

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
  const stats = useMemo(
    () => calculateSummary(projections, startingBalance),
    [projections, startingBalance]
  );

  const cashConversionCycle = paymentTerms - payableTerms;

  // Chart data
  const netFlowChartData = projections.map((p) => ({
    month: p.monthLabel,
    "Net Cash Flow": p.netCashFlow,
    isPositive: p.netCashFlow >= 0,
  }));

  const balanceChartData = projections.map((p) => ({
    month: p.monthLabel,
    Balance: p.closingBalance,
  }));

  const breakdownChartData = projections.map((p) => ({
    month: p.monthLabel,
    "Fixed Costs": p.fixedCosts,
    "Variable Costs": p.variableCosts,
    Revenue: p.revenue,
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
            12-month cash flow projection using the AR/AP balance method.
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
            <InfoTooltip content="Uses the Wall Street standard AR/AP balance method: Ending AR = (DSO/30) × Revenue, Cash Collected = Beginning AR + Revenue - Ending AR. Same logic for DPO. This properly handles fractional month delays (e.g., DSO=15 → 50% collected same month)." />
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
                <InfoTooltip content="Days Sales Outstanding — average days to collect payment from customers. Determines accounts receivable balance: AR = (DSO/30) × monthly revenue." />
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
                <InfoTooltip content="Days Payable Outstanding — average days before you pay your suppliers. Determines accounts payable balance: AP = (DPO/30) × monthly expenses." />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ResultCard label="Total 12-Month Inflow" value={formatPHP(stats.totalInflow)} sublabel="Cash collected from customers" />
        <ResultCard label="Total 12-Month Outflow" value={formatPHP(stats.totalOutflow)} sublabel="Cash paid to suppliers/ops" />
        <ResultCard
          label="Ending Balance"
          value={formatPHP(stats.finalBalance)}
          variant={stats.finalBalance > 0 ? "success" : "danger"}
          sublabel={`Started at ${formatPHP(startingBalance)}`}
        />
        <ResultCard
          label="Negative Cash Flow Months"
          value={`${stats.negativeMonths} of 12`}
          variant={stats.negativeMonths === 0 ? "success" : stats.negativeMonths <= 3 ? "warning" : "danger"}
        />
      </div>

      {/* Key Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Best Month</p>
              <p className="font-semibold">{stats.bestMonth.monthLabel}: {formatPHP(stats.bestMonth.netCashFlow)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Worst Month</p>
              <p className="font-semibold">{stats.worstMonth.monthLabel}: {formatPHP(stats.worstMonth.netCashFlow)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <ArrowUpDown className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Monthly Net Flow</p>
              <p className="font-semibold">{formatPHP(stats.avgNetFlow)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <RotateCcw className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Cash Conversion Cycle
                <InfoTooltip content="CCC = DSO - DPO. Negative means you collect before you pay (ideal). Positive means you need working capital to bridge the gap." />
              </p>
              <p className={`font-semibold ${cashConversionCycle < 0 ? "text-green-400" : cashConversionCycle > 0 ? "text-yellow-400" : ""}`}>
                {cashConversionCycle} days {cashConversionCycle < 0 ? "(favorable)" : cashConversionCycle > 0 ? "(needs working capital)" : "(neutral)"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Chart Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Visualization</CardTitle>
          <CardDescription>Multiple views of your 12-month cash flow forecast.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="net-flow">Net Flow</TabsTrigger>
              <TabsTrigger value="balance">Balance</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            </TabsList>

            {/* Overview: Combined inflow/outflow bars + balance line */}
            <TabsContent value="overview">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={projections.map((p) => ({
                  month: p.monthLabel,
                  Inflow: p.cashInflow,
                  Outflow: -p.cashOutflow,
                  "Closing Balance": p.closingBalance,
                }))}>
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
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="bars" dataKey="Inflow" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Bar yAxisId="bars" dataKey="Outflow" fill="#ef4444" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Line yAxisId="line" type="monotone" dataKey="Closing Balance" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* Net Flow: Waterfall-style bar chart */}
            <TabsContent value="net-flow">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={netFlowChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" />
                  <Bar dataKey="Net Cash Flow" radius={[4, 4, 0, 0]}>
                    {netFlowChartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.isPositive ? "#22c55e" : "#ef4444"}
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Positive cash flow
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Negative cash flow
                </span>
              </div>
            </TabsContent>

            {/* Balance: Area chart with gradient */}
            <TabsContent value="balance">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={balanceChartData}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `₱${(v / 1000000).toFixed(1)}M`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Zero", fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <ReferenceLine
                    y={startingBalance}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="8 4"
                    opacity={0.4}
                    label={{ value: "Starting", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Balance"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#balanceGradient)"
                    dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#1d4ed8" }}
                    activeDot={{ r: 6, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Peak Balance</span>
                  <span className="font-mono font-semibold text-green-400">{formatPHP(stats.peakBalance)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Lowest Balance</span>
                  <span className={`font-mono font-semibold ${stats.lowestBalance < 0 ? "text-red-400" : "text-foreground"}`}>
                    {formatPHP(stats.lowestBalance)}
                  </span>
                </div>
              </div>
            </TabsContent>

            {/* Breakdown: Revenue vs cost components */}
            <TabsContent value="breakdown">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={breakdownChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Fixed Costs" stackId="costs" fill="#ef4444" opacity={0.7} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Variable Costs" stackId="costs" fill="#f97316" opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="Revenue" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: "#22c55e" }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Fixed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Variable
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Revenue (accrual)
                </span>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Monthly Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Projection Detail</CardTitle>
          <CardDescription>
            Opening → +Inflow → -Outflow → Closing. AR/AP balances show working capital tied up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto" id="cash-flow-detail">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Month</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Opening</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Cash In</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Cash Out</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Net Flow</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Closing</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">AR</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">AP</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p) => (
                  <tr
                    key={p.month}
                    className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${p.netCashFlow < 0 ? "bg-red-500/5" : ""}`}
                  >
                    <td className="py-3 px-2 font-medium">{p.monthLabel}</td>
                    <td className="py-3 px-2 text-right font-mono text-muted-foreground">{formatPHP(p.openingBalance)}</td>
                    <td className="py-3 px-2 text-right font-mono text-green-400">{formatPHP(p.cashInflow)}</td>
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
                  <td className="py-3 px-2">Total</td>
                  <td className="py-3 px-2"></td>
                  <td className="py-3 px-2 text-right font-mono text-green-400">{formatPHP(stats.totalInflow)}</td>
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
    </div>
  );
}

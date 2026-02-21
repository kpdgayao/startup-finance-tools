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
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import {
  projectMonthlyCashFlow,
  calculateSummary,
  exportToCSV,
  type CashFlowInputs,
} from "@/lib/calculations/cash-flow";
import { Download, TrendingUp, TrendingDown, ArrowUpDown, RotateCcw, AlertTriangle } from "lucide-react";
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
            {formatPHP(entry.value)}
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

  const inputs: CashFlowInputs = useMemo(() => ({
    monthlyRecurringRevenue: mrr,
    monthlyOneTimeIncome: oneTimeIncome,
    fixedCosts,
    variableCostPercent,
    paymentTermsDays: paymentTerms,
    payableTermsDays: payableTerms,
  }), [mrr, oneTimeIncome, fixedCosts, variableCostPercent, paymentTerms, payableTerms]);

  const projections = useMemo(
    () => projectMonthlyCashFlow(inputs, startingBalance),
    [inputs, startingBalance]
  );

  const stats = useMemo(
    () => calculateSummary(projections, startingBalance, paymentTerms, payableTerms),
    [projections, startingBalance, paymentTerms, payableTerms]
  );

  // Overview chart: inflow and outflow as POSITIVE bars side by side + balance line
  const overviewChartData = useMemo(() => [
    { month: "Start", "Cash Inflow": 0, "Cash Outflow": 0, "Cash Balance": startingBalance },
    ...projections.map((p) => ({
      month: p.monthLabel,
      "Cash Inflow": p.cashInflow,
      "Cash Outflow": p.cashOutflow,
      "Cash Balance": p.closingBalance,
    })),
  ], [projections, startingBalance]);

  // Net flow chart data
  const netFlowChartData = useMemo(() => projections.map((p) => ({
    month: p.monthLabel,
    "Net Cash Flow": p.netCashFlow,
    isPositive: p.netCashFlow >= 0,
  })), [projections]);

  // Balance chart includes Month 0 (starting balance)
  const balanceChartData = useMemo(() => [
    { month: "Start", Balance: startingBalance },
    ...projections.map((p) => ({ month: p.monthLabel, Balance: p.closingBalance })),
  ], [projections, startingBalance]);

  // Breakdown chart — clearly labeled as accrual basis
  const breakdownChartData = useMemo(() => projections.map((p) => ({
    month: p.monthLabel,
    "Fixed Costs": p.fixedCosts,
    "Variable Costs": p.variableCosts,
    "Revenue (Accrual)": p.revenue,
  })), [projections]);

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

  const ai = useAiExplain("cash-flow-forecast");

  const hasWorkingCapitalImpact = stats.workingCapitalImpact > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Cash Flow Forecaster</h1>
          <p className="text-muted-foreground mt-1">
            12-month cash flow projection with DSO/DPO timing adjustments.
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
            <InfoTooltip content="DSO (Days Sales Outstanding) = average days to collect payment from customers. DPO (Days Payable Outstanding) = average days before you pay suppliers. Higher DSO means slower cash collection; higher DPO means you hold cash longer." />
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
                <InfoTooltip content="Days Sales Outstanding — average days to collect payment from customers. DSO=0 means immediate collection. DSO=30 means ~1 month delay. DSO=60 means ~2 month delay." />
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
                <InfoTooltip content="Days Payable Outstanding — average days before you pay your suppliers. DPO=0 means you pay immediately. DPO=30 means you hold cash ~1 month before paying." />
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
          <CardDescription>Add any one-time income (grants, contract payments, etc.) per month. Subject to same DSO collection delay.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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

      {/* Working Capital Info — explains DSO > DPO impact */}
      {hasWorkingCapitalImpact && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-400">Working Capital Tied Up</p>
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
                <InfoTooltip content="CCC = DSO - DPO. Negative CCC means you collect from customers before paying suppliers (ideal). Positive CCC means you need working capital to bridge the gap." />
              </p>
              <p className={`font-semibold ${stats.cashConversionCycle < 0 ? "text-green-400" : stats.cashConversionCycle > 0 ? "text-yellow-400" : ""}`}>
                {stats.cashConversionCycle} days {stats.cashConversionCycle < 0 ? "(favorable)" : stats.cashConversionCycle > 0 ? "(needs working capital)" : "(neutral)"}
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
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="net-flow">Net Flow</TabsTrigger>
              <TabsTrigger value="balance">Balance</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            </TabsList>

            {/* Overview: Inflow/Outflow bars (both positive) + Balance line */}
            <TabsContent value="overview">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={overviewChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v) => {
                      const abs = Math.abs(v);
                      if (abs >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
                      if (abs >= 1_000) return `₱${(v / 1_000).toFixed(0)}K`;
                      return `₱${v}`;
                    }}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Bar dataKey="Cash Inflow" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Bar dataKey="Cash Outflow" fill="#ef4444" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Line type="monotone" dataKey="Cash Balance" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Bars show cash-basis inflows and outflows. Blue line shows running cash balance.
              </p>
            </TabsContent>

            {/* Net Flow: Color-coded bar chart */}
            <TabsContent value="net-flow">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={netFlowChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 4" />
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
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Positive net cash flow
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Negative net cash flow
                </span>
              </div>
            </TabsContent>

            {/* Balance: Area chart starting from Month 0 */}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v) => `₱${(v / 1000000).toFixed(1)}M`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="var(--destructive)" strokeDasharray="4 4" label={{ value: "Zero", fill: "var(--muted-foreground)", fontSize: 11 }} />
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

            {/* Breakdown: Revenue vs cost components (ACCRUAL basis — clearly labeled) */}
            <TabsContent value="breakdown">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={breakdownChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Bar dataKey="Fixed Costs" stackId="costs" fill="#ef4444" opacity={0.7} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Variable Costs" stackId="costs" fill="#f97316" opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="Revenue (Accrual)" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: "#22c55e" }} />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Accrual basis — shows revenue earned and costs incurred, regardless of when cash moves.
                See the Overview tab for actual cash timing.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Monthly Grid — shows both accrual and cash columns */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Projection Detail</CardTitle>
          <CardDescription>
            Accrual columns show what you earned/owed. Cash columns show actual money movement after DSO/DPO timing.
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

      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
            startingBalance,
            monthlyRecurringRevenue: mrr,
            fixedCosts,
            variableCostPercent,
            paymentTermsDSO: paymentTerms,
            payableTermsDPO: payableTerms,
            totalInflow: stats.totalInflow,
            totalOutflow: stats.totalOutflow,
            finalBalance: stats.finalBalance,
            negativeMonths: stats.negativeMonths,
            avgNetFlow: stats.avgNetFlow,
            cashConversionCycle: stats.cashConversionCycle,
            peakBalance: stats.peakBalance,
            lowestBalance: stats.lowestBalance,
          })
        }
        onDismiss={ai.reset}
      />

      <RelatedTools currentToolId="cash-flow-forecast" />
    </div>
  );
}

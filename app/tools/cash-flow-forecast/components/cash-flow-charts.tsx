"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPHP } from "@/lib/utils";
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

interface OverviewChartDatum {
  month: string;
  "Cash Inflow": number;
  "Cash Outflow": number;
  "Cash Balance": number;
}

interface NetFlowChartDatum {
  month: string;
  "Net Cash Flow": number;
  isPositive: boolean;
}

interface BalanceChartDatum {
  month: string;
  Balance: number;
}

interface BreakdownChartDatum {
  month: string;
  "Fixed Costs": number;
  "Variable Costs": number;
  "Revenue (Accrual)": number;
}

interface CashFlowChartsProps {
  overviewChartData: OverviewChartDatum[];
  netFlowChartData: NetFlowChartDatum[];
  balanceChartData: BalanceChartDatum[];
  breakdownChartData: BreakdownChartDatum[];
  peakBalance: number;
  lowestBalance: number;
}

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

export function CashFlowCharts({
  overviewChartData,
  netFlowChartData,
  balanceChartData,
  breakdownChartData,
  peakBalance,
  lowestBalance,
}: CashFlowChartsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Visualization</CardTitle>
        <CardDescription>Multiple views of your 12-month projection</CardDescription>
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
                  activeDot={{ r: 6, fill: "#3b82f6", strokeWidth: 2, stroke: "#1d4ed8" }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Peak Balance</span>
                <span className="font-mono font-semibold text-green-400">{formatPHP(peakBalance)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Lowest Balance</span>
                <span className={`font-mono font-semibold ${lowestBalance < 0 ? "text-red-400" : "text-foreground"}`}>
                  {formatPHP(lowestBalance)}
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
  );
}
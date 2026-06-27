"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResultCard } from "@/components/shared/result-card";
import { formatPHP } from "@/lib/utils";
import type { AnnualRow, BalanceSheetSeed, FinancialModelSummary } from "@/lib/calculations/financial-model";
import { PLTable, BSTable, CFTable, CustomTooltip } from "./financial-model-tables";
import {
  ComposedChart,
  Bar,
  Line,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PLChartDatum {
  name: string;
  Revenue: number;
  "Gross Profit": number;
  "Net Income": number;
}

interface BSChartDatum {
  name: string;
  Cash: number;
  "Accounts Receivable": number;
  "Net PP&E": number;
}

interface CFChartDatum {
  name: string;
  "Operating CF": number;
  "CapEx": number;
  "Net CF": number;
}

interface FinancialModelResultsProps {
  summary: FinancialModelSummary;
  annual: AnnualRow[];
  seed: BalanceSheetSeed;
  plChartData: PLChartDatum[];
  bsChartData: BSChartDatum[];
  cfChartData: CFChartDatum[];
}

export function FinancialModelResults({
  summary,
  annual,
  seed,
  plChartData,
  bsChartData,
  cfChartData,
}: FinancialModelResultsProps) {
  const tickFormatter = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `₱${(v / 1_000).toFixed(0)}K`;
    return `₱${v}`;
  };

  return (
    <>
      {/* Result Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultCard
          label="3-Year Revenue"
          value={formatPHP(summary.threeYearRevenue)}
          sublabel="Total across 36 months"
        />
        <ResultCard
          label="Avg Gross Margin"
          value={`${summary.avgGrossMargin.toFixed(1)}%`}
          sublabel="Average across 3 years"
          variant={
            summary.avgGrossMargin >= 60
              ? "success"
              : summary.avgGrossMargin >= 40
                ? "warning"
                : "danger"
          }
        />
        <ResultCard
          label="Year 3 EBITDA"
          value={formatPHP(summary.year3Ebitda)}
          sublabel="Earnings before interest, tax, D&A"
          variant={summary.year3Ebitda > 0 ? "success" : "danger"}
        />
        <ResultCard
          label="Year 3 Net Income"
          value={formatPHP(summary.year3NetIncome)}
          sublabel="Bottom line profitability"
          variant={summary.year3NetIncome > 0 ? "success" : "danger"}
        />
      </div>

      {/* Tabs: P&L, Balance Sheet, Cash Flow */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="pnl">
            <TabsList className="grid grid-cols-3 w-full mb-4">
              <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
              <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
              <TabsTrigger value="cf">Cash Flow</TabsTrigger>
            </TabsList>

            <TabsContent value="pnl" className="space-y-4">
              <PLTable annual={annual} />
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={plChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={tickFormatter}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="Revenue"
                    fill="#3b82f6"
                    radius={[3, 3, 0, 0]}
                    opacity={0.85}
                  />
                  <Bar
                    dataKey="Gross Profit"
                    fill="#22c55e"
                    radius={[3, 3, 0, 0]}
                    opacity={0.85}
                  />
                  <Line
                    type="monotone"
                    dataKey="Net Income"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: "#f59e0b" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center">
                Bars show Revenue and Gross Profit. Line shows Net Income
                trajectory.
              </p>
            </TabsContent>

            <TabsContent value="bs" className="space-y-4">
              <BSTable annual={annual} seed={seed} />
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={bsChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={tickFormatter}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="Cash"
                    stackId="assets"
                    fill="#3b82f6"
                    opacity={0.85}
                  />
                  <Bar
                    dataKey="Accounts Receivable"
                    stackId="assets"
                    fill="#22c55e"
                    opacity={0.85}
                  />
                  <Bar
                    dataKey="Net PP&E"
                    stackId="assets"
                    fill="#8b5cf6"
                    opacity={0.85}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center">
                Stacked bar shows total asset composition over time.
              </p>
            </TabsContent>

            <TabsContent value="cf" className="space-y-4">
              <CFTable annual={annual} />
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={cfChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={tickFormatter}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="Operating CF"
                    fill="#22c55e"
                    radius={[3, 3, 0, 0]}
                    opacity={0.85}
                  />
                  <Bar
                    dataKey="CapEx"
                    fill="#ef4444"
                    radius={[3, 3, 0, 0]}
                    opacity={0.85}
                  />
                  <Bar
                    dataKey="Net CF"
                    fill="#3b82f6"
                    radius={[3, 3, 0, 0]}
                    opacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center">
                Operating Cash Flow, CapEx (investing), and Net Cash Flow by
                year.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { EcosystemBanner } from "@/components/shared/ecosystem-banner";
import { formatPHP } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import {
  buildFinancialModel,
  exportFinancialModelCSV,
  type AnnualRow,
  type BalanceSheetSeed,
} from "@/lib/calculations/financial-model";
import { Download } from "lucide-react";
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

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-medium text-sm mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 text-sm"
        >
          <span className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
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

function PLTable({ annual }: { annual: AnnualRow[] }) {
  const rows = [
    { label: "Revenue", key: "revenue" as const, bold: false },
    { label: "COGS", key: "cogs" as const, bold: false },
    { label: "Gross Profit", key: "grossProfit" as const, bold: true },
    { label: "Fixed OpEx", key: "fixedOpEx" as const, bold: false },
    { label: "Variable OpEx", key: "variableOpEx" as const, bold: false },
    { label: "Total OpEx", key: "totalOpEx" as const, bold: false },
    { label: "EBITDA", key: "ebitda" as const, bold: true },
    { label: "Depreciation", key: "depreciation" as const, bold: false },
    { label: "EBIT", key: "ebit" as const, bold: true },
    { label: "Tax", key: "tax" as const, bold: false },
    { label: "Net Income", key: "netIncome" as const, bold: true },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">
              P&L Item
            </th>
            {annual.map((a) => (
              <th
                key={a.year}
                className="text-right py-3 px-2 font-medium text-muted-foreground"
              >
                Year {a.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={`border-b border-border/50 ${row.bold ? "bg-muted/20" : ""}`}
            >
              <td
                className={`py-2.5 px-2 ${row.bold ? "font-semibold" : ""}`}
              >
                {row.label}
              </td>
              {annual.map((a) => (
                <td
                  key={a.year}
                  className={`py-2.5 px-2 text-right font-mono ${row.bold ? "font-semibold" : ""} ${a[row.key] < 0 ? "text-red-400" : ""}`}
                >
                  {formatPHP(a[row.key])}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2 text-muted-foreground italic">
              Gross Margin %
            </td>
            {annual.map((a) => (
              <td
                key={a.year}
                className="py-2.5 px-2 text-right font-mono text-muted-foreground"
              >
                {a.grossMarginPercent.toFixed(1)}%
              </td>
            ))}
          </tr>
          <tr>
            <td className="py-2.5 px-2 text-muted-foreground italic">
              Net Margin %
            </td>
            {annual.map((a) => (
              <td
                key={a.year}
                className={`py-2.5 px-2 text-right font-mono ${a.netMarginPercent < 0 ? "text-red-400" : "text-muted-foreground"}`}
              >
                {a.netMarginPercent.toFixed(1)}%
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BSTable({
  annual,
  seed,
}: {
  annual: AnnualRow[];
  seed: BalanceSheetSeed;
}) {
  type BSKey = keyof BalanceSheetSeed;
  const sections: {
    heading: string;
    rows: { label: string; key: BSKey; bold?: boolean }[];
  }[] = [
    {
      heading: "Assets",
      rows: [
        { label: "Cash", key: "cash" },
        { label: "Accounts Receivable", key: "accountsReceivable" },
        { label: "Net PP&E", key: "netPPE" },
        { label: "Total Assets", key: "totalAssets", bold: true },
      ],
    },
    {
      heading: "Liabilities",
      rows: [
        { label: "Accounts Payable", key: "accountsPayable" },
        { label: "Total Liabilities", key: "totalLiabilities", bold: true },
      ],
    },
    {
      heading: "Equity",
      rows: [
        { label: "Retained Earnings", key: "retainedEarnings" },
        { label: "Total Equity", key: "totalEquity", bold: true },
      ],
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">
              Balance Sheet
            </th>
            <th className="text-right py-3 px-2 font-medium text-muted-foreground">
              Year 0
            </th>
            {annual.map((a) => (
              <th
                key={a.year}
                className="text-right py-3 px-2 font-medium text-muted-foreground"
              >
                Year {a.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.heading}>
              <tr>
                <td
                  colSpan={5}
                  className="pt-3 pb-1 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {section.heading}
                </td>
              </tr>
              {section.rows.map((row) => (
                <tr
                  key={row.key}
                  className={`border-b border-border/50 ${row.bold ? "bg-muted/20" : ""}`}
                >
                  <td
                    className={`py-2.5 px-2 ${row.bold ? "font-semibold" : ""}`}
                  >
                    {row.label}
                  </td>
                  <td
                    className={`py-2.5 px-2 text-right font-mono ${row.bold ? "font-semibold" : ""}`}
                  >
                    {formatPHP(seed[row.key])}
                  </td>
                  {annual.map((a) => (
                    <td
                      key={a.year}
                      className={`py-2.5 px-2 text-right font-mono ${row.bold ? "font-semibold" : ""} ${a[row.key] < 0 ? "text-red-400" : ""}`}
                    >
                      {formatPHP(a[row.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CFTable({ annual }: { annual: AnnualRow[] }) {
  const rows: { label: string; key: keyof AnnualRow; bold?: boolean }[] = [
    { label: "Operating Cash Flow", key: "operatingCF", bold: true },
    { label: "Investing Cash Flow (CapEx)", key: "investingCF" },
    { label: "Net Cash Flow", key: "netCashFlow", bold: true },
    { label: "Ending Cash", key: "cash", bold: true },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">
              Cash Flow
            </th>
            {annual.map((a) => (
              <th
                key={a.year}
                className="text-right py-3 px-2 font-medium text-muted-foreground"
              >
                Year {a.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={`border-b border-border/50 ${row.bold ? "bg-muted/20" : ""}`}
            >
              <td
                className={`py-2.5 px-2 ${row.bold ? "font-semibold" : ""}`}
              >
                {row.label}
              </td>
              {annual.map((a) => {
                const val = a[row.key] as number;
                return (
                  <td
                    key={a.year}
                    className={`py-2.5 px-2 text-right font-mono ${row.bold ? "font-semibold" : ""} ${val < 0 ? "text-red-400" : ""}`}
                  >
                    {formatPHP(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { Fragment } from "react";

export default function FinancialModelBuilderPage() {
  // Revenue
  const [startingRevenue, setStartingRevenue] = useState(200_000);
  const [monthlyGrowthRate, setMonthlyGrowthRate] = useState(8);
  // Costs
  const [cogsPercent, setCogsPercent] = useState(25);
  const [fixedOpEx, setFixedOpEx] = useState(500_000);
  const [variableOpExPercent, setVariableOpExPercent] = useState(10);
  // Balance Sheet
  const [startingCash, setStartingCash] = useState(5_000_000);
  const [dso, setDso] = useState(30);
  const [dpo, setDpo] = useState(15);
  const [taxRate, setTaxRate] = useState(25);
  const [annualCapEx, setAnnualCapEx] = useState(500_000);
  const [depreciationYears, setDepreciationYears] = useState(5);

  const inputs = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  const { annual, seed, summary } = useMemo(
    () => buildFinancialModel(inputs),
    [inputs]
  );

  const ai = useAiExplain("financial-model-builder");

  const handleExportCSV = () => {
    const csv = exportFinancialModelCSV(annual, seed);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "financial-model.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart data
  const plChartData = annual.map((a) => ({
    name: `Year ${a.year}`,
    Revenue: a.revenue,
    "Gross Profit": a.grossProfit,
    "Net Income": a.netIncome,
  }));

  const bsChartData = [
    {
      name: "Year 0",
      Cash: seed.cash,
      "Accounts Receivable": seed.accountsReceivable,
      "Net PP&E": seed.netPPE,
    },
    ...annual.map((a) => ({
      name: `Year ${a.year}`,
      Cash: a.cash,
      "Accounts Receivable": a.accountsReceivable,
      "Net PP&E": a.netPPE,
    })),
  ];

  const cfChartData = annual.map((a) => ({
    name: `Year ${a.year}`,
    "Operating CF": a.operatingCF,
    "CapEx": a.investingCF,
    "Net CF": a.netCashFlow,
  }));

  const tickFormatter = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `₱${(v / 1_000).toFixed(0)}K`;
    return `₱${v}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Financial Model Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            3-year integrated P&L, Balance Sheet, and Cash Flow model.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle>
            Assumptions
            <InfoTooltip content="Enter your startup's financial assumptions. The model calculates 36 months internally and displays annual summaries." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Revenue */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Revenue
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyInput
                label="Starting Monthly Revenue"
                value={startingRevenue}
                onChange={setStartingRevenue}
              />
              <PercentageInput
                label="Monthly Growth Rate"
                value={monthlyGrowthRate}
                onChange={setMonthlyGrowthRate}
                max={50}
              />
            </div>
          </div>

          <div className="border-t border-border/50" />

          {/* Costs */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Costs
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PercentageInput
                label="COGS %"
                value={cogsPercent}
                onChange={setCogsPercent}
              />
              <CurrencyInput
                label="Fixed OpEx (monthly)"
                value={fixedOpEx}
                onChange={setFixedOpEx}
              />
              <PercentageInput
                label="Variable OpEx %"
                value={variableOpExPercent}
                onChange={setVariableOpExPercent}
              />
            </div>
          </div>

          <div className="border-t border-border/50" />

          {/* Balance Sheet */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Balance Sheet & Capital
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CurrencyInput
                label="Starting Cash"
                value={startingCash}
                onChange={setStartingCash}
              />
              <div className="space-y-2">
                <Label>
                  DSO (Days Sales Outstanding)
                  <InfoTooltip content="Average days to collect payment from customers. DSO=30 means ~1 month delay." />
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={dso}
                    onChange={(e) => setDso(parseInt(e.target.value) || 0)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    days
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  DPO (Days Payable Outstanding)
                  <InfoTooltip content="Average days before you pay suppliers. Higher DPO preserves cash." />
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={dpo}
                    onChange={(e) => setDpo(parseInt(e.target.value) || 0)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    days
                  </span>
                </div>
              </div>
              <PercentageInput
                label="Tax Rate"
                value={taxRate}
                onChange={setTaxRate}
                max={50}
              />
              <CurrencyInput
                label="Annual CapEx"
                value={annualCapEx}
                onChange={setAnnualCapEx}
              />
              <div className="space-y-2">
                <Label>
                  Depreciation (years)
                  <InfoTooltip content="Useful life of assets for straight-line depreciation." />
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={depreciationYears}
                  onChange={(e) =>
                    setDepreciationYears(
                      Math.max(1, parseInt(e.target.value) || 1)
                    )
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
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
            threeYearRevenue: summary.threeYearRevenue,
            avgGrossMargin: summary.avgGrossMargin.toFixed(1),
            year1NetIncome: annual[0].netIncome,
            year2NetIncome: annual[1].netIncome,
            year3NetIncome: annual[2].netIncome,
            year3Ebitda: summary.year3Ebitda,
            year3Cash: annual[2].cash,
            year1OperatingCF: annual[0].operatingCF,
            year3OperatingCF: annual[2].operatingCF,
          })
        }
        onDismiss={ai.reset}
      />

      <EcosystemBanner toolId="financial-model-builder" />

      <RelatedTools currentToolId="financial-model-builder" />
    </div>
  );
}

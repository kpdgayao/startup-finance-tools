"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { formatPHP } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import {
  calculateTopDown,
  calculateBottomUp,
  projectRevenue,
} from "@/lib/calculations/market-sizing";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function MarketSizingPage() {
  const [approach, setApproach] = useState("top-down");

  // Top-Down inputs (CreditMatchPH defaults)
  const [totalMarketSize, setTotalMarketSize] = useState(10_000_000_000);
  const [samPercent, setSamPercent] = useState(15);
  const [somPercent, setSomPercent] = useState(1);

  // Bottom-Up inputs
  const [totalCustomers, setTotalCustomers] = useState(15_000_000);
  const [targetPercent, setTargetPercent] = useState(10);
  const [revenuePerCustomer, setRevenuePerCustomer] = useState(1000);

  // Revenue projection inputs
  const [year1Share, setYear1Share] = useState(1);
  const [year2Share, setYear2Share] = useState(2);
  const [year3Share, setYear3Share] = useState(4);
  const [grossMarginPct, setGrossMarginPct] = useState(55);
  const [opexPct, setOpexPct] = useState(40);

  const ai = useAiExplain("market-sizing");

  const marketSize =
    approach === "top-down"
      ? calculateTopDown({ totalMarketSize, samPercent, somPercent })
      : calculateBottomUp({ totalCustomers, targetPercent, revenuePerCustomer });

  const projections = projectRevenue(
    marketSize.som,
    [year1Share, year2Share, year3Share],
    grossMarginPct,
    opexPct
  );

  const funnelData = [
    { name: "TAM", value: marketSize.tam, fill: "#3b82f6" },
    { name: "SAM", value: marketSize.sam, fill: "#8b5cf6" },
    { name: "SOM", value: marketSize.som, fill: "#22c55e" },
  ];

  const revenueChartData = projections.map((p) => ({
    name: `Year ${p.year}`,
    Revenue: p.revenue,
    "Gross Margin": p.grossMargin,
    Profit: p.profit,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Market Sizing Calculator</h1>
        <p className="text-muted-foreground mt-1">
          Estimate TAM, SAM, SOM using top-down and bottom-up methods.
        </p>
      </div>

      <Tabs value={approach} onValueChange={setApproach}>
        <TabsList>
          <TabsTrigger value="top-down">Top-Down</TabsTrigger>
          <TabsTrigger value="bottom-up">Bottom-Up</TabsTrigger>
        </TabsList>

        <TabsContent value="top-down" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Total Market
                <InfoTooltip content="TAM = Total Addressable Market. Start with the broadest estimate of industry revenue." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CurrencyInput
                label="Total Market Size (TAM)"
                value={totalMarketSize}
                onChange={setTotalMarketSize}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Market Filters
                <InfoTooltip content="SAM is the segment you can serve. SOM is the share you can realistically capture in the near term." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PercentageInput
                  label="SAM (% of TAM)"
                  value={samPercent}
                  onChange={setSamPercent}
                />
                <PercentageInput
                  label="SOM (% of SAM)"
                  value={somPercent}
                  onChange={setSomPercent}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bottom-up" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Customer Base
                <InfoTooltip content="Bottom-up starts from individual customers and builds up to market size." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Total Potential Customers
                  </label>
                  <input
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={totalCustomers.toLocaleString("en-PH")}
                    onChange={(e) => {
                      const val = parseInt(
                        e.target.value.replace(/[^0-9]/g, ""),
                        10
                      );
                      setTotalCustomers(isNaN(val) ? 0 : val);
                    }}
                  />
                </div>
                <PercentageInput
                  label="Target Segment (%)"
                  value={targetPercent}
                  onChange={setTargetPercent}
                />
                <CurrencyInput
                  label="Revenue per Customer/Year"
                  value={revenuePerCustomer}
                  onChange={setRevenuePerCustomer}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ResultCard
          label="TAM (Total Addressable Market)"
          value={formatPHP(marketSize.tam)}
          sublabel="Total industry revenue"
        />
        <ResultCard
          label="SAM (Serviceable Available Market)"
          value={formatPHP(marketSize.sam)}
          sublabel="Segment you can reach"
          variant="warning"
        />
        <ResultCard
          label="SOM (Serviceable Obtainable Market)"
          value={formatPHP(marketSize.som)}
          sublabel="Realistic capture"
          variant="success"
        />
      </div>

      {/* Funnel Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Market Funnel</CardTitle>
          <CardDescription>TAM → SAM → SOM visualization</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => {
                  if (v >= 1_000_000_000) return `₱${(v / 1_000_000_000).toFixed(1)}B`;
                  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
                  if (v >= 1_000) return `₱${(v / 1_000).toFixed(0)}K`;
                  return `₱${v}`;
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={12}
                width={50}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                }}
                labelStyle={{ color: "var(--foreground)" }}
                formatter={(value) => formatPHP(Number(value))}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 3-Year Revenue Projection */}
      <Card>
        <CardHeader>
          <CardTitle>
            3-Year Revenue Projection
            <InfoTooltip content="Based on your SOM and assumed market share growth over 3 years." />
          </CardTitle>
          <CardDescription>
            Revenue based on capturing a growing share of your SOM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <PercentageInput
              label="Year 1 Market Share"
              value={year1Share}
              onChange={setYear1Share}
            />
            <PercentageInput
              label="Year 2 Market Share"
              value={year2Share}
              onChange={setYear2Share}
            />
            <PercentageInput
              label="Year 3 Market Share"
              value={year3Share}
              onChange={setYear3Share}
            />
            <PercentageInput
              label="Gross Margin %"
              value={grossMarginPct}
              onChange={setGrossMarginPct}
            />
            <PercentageInput
              label="OpEx % of Gross Margin"
              value={opexPct}
              onChange={setOpexPct}
            />
          </div>

          {/* Projection Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    Year
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                    Market Share
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                    Revenue
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                    Gross Margin
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                    OpEx
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p) => (
                  <tr key={p.year} className="border-b border-border/50">
                    <td className="py-2 px-3">Year {p.year}</td>
                    <td className="text-right py-2 px-3">
                      {p.marketShare.toFixed(1)}%
                    </td>
                    <td className="text-right py-2 px-3">
                      {formatPHP(p.revenue)}
                    </td>
                    <td className="text-right py-2 px-3">
                      {formatPHP(p.grossMargin)}
                    </td>
                    <td className="text-right py-2 px-3">
                      {formatPHP(p.opex)}
                    </td>
                    <td className="text-right py-2 px-3 font-medium">
                      <span
                        className={
                          p.profit >= 0 ? "text-green-400" : "text-red-400"
                        }
                      >
                        {formatPHP(p.profit)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Revenue Bar Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => {
                  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
                  if (v >= 1_000) return `₱${(v / 1_000).toFixed(0)}K`;
                  return `₱${v}`;
                }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                }}
                labelStyle={{ color: "var(--foreground)" }}
                formatter={(value) => formatPHP(Number(value))}
              />
              <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="Gross Margin"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
              <Bar dataKey="Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
            approach,
            tam: marketSize.tam,
            sam: marketSize.sam,
            som: marketSize.som,
            projections: projections.map((p) => ({
              year: p.year,
              marketShare: `${p.marketShare}%`,
              revenue: p.revenue,
              grossMargin: p.grossMargin,
              profit: p.profit,
            })),
            grossMarginPct,
            opexPct,
          })
        }
        onDismiss={ai.reset}
      />
    </div>
  );
}

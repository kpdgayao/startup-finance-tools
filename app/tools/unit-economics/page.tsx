"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { Button } from "@/components/ui/button";
import { formatPHP } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import { RotateCcw } from "lucide-react";
import {
  calculateUnitEconomics,
  generateSensitivity,
} from "@/lib/calculations/unit-economics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";

export default function UnitEconomicsPage() {
  const [monthlyMarketingSpend, setMonthlyMarketingSpend] = useState(100_000);
  const [newCustomersPerMonth, setNewCustomersPerMonth] = useState(20);
  const [revenuePerCustomer, setRevenuePerCustomer] = useState(5_000);
  const [grossMarginPercent, setGrossMarginPercent] = useState(70);
  const [monthlyChurnRate, setMonthlyChurnRate] = useState(5);

  const handleReset = () => {
    setMonthlyMarketingSpend(100_000);
    setNewCustomersPerMonth(20);
    setRevenuePerCustomer(5_000);
    setGrossMarginPercent(70);
    setMonthlyChurnRate(5);
  };

  const ai = useAiExplain("unit-economics");

  const inputs = {
    monthlyMarketingSpend,
    newCustomersPerMonth,
    revenuePerCustomer,
    grossMarginPercent,
    monthlyChurnRate,
  };

  const result = calculateUnitEconomics(inputs);

  const churnRange = useMemo(
    () => Array.from({ length: 15 }, (_, i) => i + 1),
    []
  );
  const sensitivityData = generateSensitivity(inputs, churnRange);

  const chartData = sensitivityData.map((p) => ({
    churn: `${p.churnRate}%`,
    churnNum: p.churnRate,
    "LTV:CAC": parseFloat(p.ltvCacRatio.toFixed(2)),
  }));

  const healthVariant =
    result.ltvCacRatio === Infinity || result.ltvCacRatio >= 3
      ? "success"
      : result.ltvCacRatio >= 1
        ? "warning"
        : "danger";

  const healthLabel =
    result.ltvCacRatio === Infinity || result.ltvCacRatio >= 3
      ? "Healthy — strong unit economics"
      : result.ltvCacRatio >= 1
        ? "Warning — aim for 3:1 or higher"
        : "Unhealthy — losing money per customer";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Unit Economics Calculator</h1>
          <p className="text-muted-foreground mt-1">
            Calculate CAC, LTV, and the metrics investors care about most.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} title="Reset to defaults">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              Customer Acquisition
              <InfoTooltip content="How much you spend to acquire each new customer." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CurrencyInput
              label="Monthly Marketing Spend"
              value={monthlyMarketingSpend}
              onChange={setMonthlyMarketingSpend}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">
                New Customers per Month
              </label>
              <input
                type="number"
                min={0}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newCustomersPerMonth || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setNewCustomersPerMonth(isNaN(val) ? 0 : Math.max(0, val));
                }}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Revenue & Retention
              <InfoTooltip content="Monthly revenue per customer and how long they stay." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CurrencyInput
              label="Monthly Revenue per Customer (ARPU)"
              value={revenuePerCustomer}
              onChange={setRevenuePerCustomer}
            />
            <PercentageInput
              label="Gross Margin %"
              value={grossMarginPercent}
              onChange={setGrossMarginPercent}
            />
            <PercentageInput
              label="Monthly Churn Rate"
              value={monthlyChurnRate}
              onChange={setMonthlyChurnRate}
              max={50}
            />
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultCard
          label="CAC"
          value={formatPHP(result.cac)}
          sublabel="Customer Acquisition Cost"
        />
        <ResultCard
          label="LTV"
          value={result.ltv === Infinity ? "∞" : formatPHP(result.ltv)}
          sublabel="Lifetime Value"
        />
        <ResultCard
          label="LTV:CAC Ratio"
          value={
            result.ltvCacRatio === Infinity
              ? "∞"
              : `${result.ltvCacRatio.toFixed(1)}x`
          }
          sublabel={healthLabel}
          variant={healthVariant}
        />
        <ResultCard
          label="Payback Period"
          value={
            result.paybackMonths === Infinity
              ? "N/A"
              : `${result.paybackMonths.toFixed(1)} months`
          }
          sublabel="Time to recover CAC"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultCard
          label="Avg Customer Lifetime"
          value={
            result.avgLifetimeMonths === Infinity
              ? "∞"
              : `${result.avgLifetimeMonths.toFixed(1)} months`
          }
          sublabel="1 / monthly churn rate"
        />
        <ResultCard
          label="Monthly Gross Profit"
          value={formatPHP(result.monthlyGrossProfit)}
          sublabel="Per customer per month"
        />
        <ResultCard
          label="Break-even Customers"
          value={
            result.breakEvenCustomers === Infinity
              ? "N/A"
              : `${result.breakEvenCustomers}`
          }
          sublabel="To cover marketing spend"
        />
        <ResultCard
          label="Monthly Churn"
          value={`${monthlyChurnRate}%`}
          sublabel={
            monthlyChurnRate <= 3
              ? "Good for SaaS"
              : monthlyChurnRate <= 7
                ? "Typical range"
                : "High — address retention"
          }
          variant={
            monthlyChurnRate <= 3
              ? "success"
              : monthlyChurnRate <= 7
                ? "warning"
                : "danger"
          }
        />
      </div>

      {/* Health Check */}
      <Card>
        <CardHeader>
          <CardTitle>Health Check</CardTitle>
          <CardDescription>
            How your unit economics compare to benchmarks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full shrink-0 ${
                  healthVariant === "success"
                    ? "bg-green-500"
                    : healthVariant === "warning"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              />
              <div>
                <p className="font-medium">
                  LTV:CAC ={" "}
                  {result.ltvCacRatio === Infinity
                    ? "∞"
                    : `${result.ltvCacRatio.toFixed(1)}x`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.ltvCacRatio === Infinity || result.ltvCacRatio >= 3
                    ? "Your customers generate significantly more value than they cost to acquire. This is the sweet spot investors look for."
                    : result.ltvCacRatio >= 1
                      ? "You're making money per customer, but the margin is thin. Focus on improving retention or reducing acquisition costs."
                      : "You're spending more to acquire customers than they're worth. This is unsustainable — reduce CAC or increase LTV urgently."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full shrink-0 ${
                  result.paybackMonths <= 12
                    ? "bg-green-500"
                    : result.paybackMonths <= 18
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              />
              <div>
                <p className="font-medium">
                  Payback ={" "}
                  {result.paybackMonths === Infinity
                    ? "N/A"
                    : `${result.paybackMonths.toFixed(1)} months`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.paybackMonths <= 12
                    ? "You recover acquisition costs within a year. This supports faster growth."
                    : result.paybackMonths <= 18
                      ? "Payback is acceptable but longer payback means more working capital needed."
                      : "Long payback period. You'll need significant cash reserves to fund growth."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sensitivity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            Sensitivity Analysis
            <InfoTooltip content="See how LTV:CAC changes at different churn rates. The dashed line marks the 3:1 healthy threshold." />
          </CardTitle>
          <CardDescription>
            LTV:CAC ratio across different monthly churn rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="churn"
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => `${v}x`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                }}
                labelStyle={{ color: "var(--foreground)" }}
                formatter={(value) => [`${Number(value).toFixed(1)}x`, "LTV:CAC"]}
              />
              <ReferenceLine
                y={3}
                stroke="#22c55e"
                strokeDasharray="5 5"
                label={{
                  value: "3:1 Healthy",
                  position: "right",
                  fill: "#22c55e",
                  fontSize: 12,
                }}
              />
              <ReferenceLine
                y={1}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{
                  value: "1:1 Break-even",
                  position: "right",
                  fill: "#ef4444",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="LTV:CAC"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#8b5cf6" }}
                activeDot={{ r: 5 }}
              />
              {result.ltvCacRatio !== Infinity && (
                <ReferenceDot
                  x={`${monthlyChurnRate}%`}
                  y={parseFloat(result.ltvCacRatio.toFixed(2))}
                  r={7}
                  fill="#f59e0b"
                  stroke="#f59e0b"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-2">
            The orange dot shows your current position at {monthlyChurnRate}%
            monthly churn
          </p>
        </CardContent>
      </Card>

      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
            cac: result.cac,
            ltv: result.ltv === Infinity ? "Infinity" : result.ltv,
            ltvCacRatio:
              result.ltvCacRatio === Infinity
                ? "Infinity"
                : result.ltvCacRatio.toFixed(1),
            paybackMonths:
              result.paybackMonths === Infinity
                ? "N/A"
                : result.paybackMonths.toFixed(1),
            avgLifetimeMonths:
              result.avgLifetimeMonths === Infinity
                ? "Infinity"
                : result.avgLifetimeMonths.toFixed(1),
            monthlyGrossProfit: result.monthlyGrossProfit,
            breakEvenCustomers: result.breakEvenCustomers,
            monthlyChurnRate,
            monthlyMarketingSpend,
            newCustomersPerMonth,
            revenuePerCustomer,
            grossMarginPercent,
          })
        }
        onDismiss={ai.reset}
      />

      <RelatedTools currentToolId="unit-economics" />
    </div>
  );
}

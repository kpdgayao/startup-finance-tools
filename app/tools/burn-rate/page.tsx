"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/shared/currency-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatPHP } from "@/lib/utils";
import {
  calculateBurnRate,
  projectCashBalance,
  projectWithAdjustments,
  getRunwayZone,
} from "@/lib/calculations/burn-rate";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function BurnRatePage() {
  const [cashBalance, setCashBalance] = useState(5000000);
  const [monthlyRevenue, setMonthlyRevenue] = useState(200000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(800000);
  const [expenseCut, setExpenseCut] = useState(0);
  const [revenueIncrease, setRevenueIncrease] = useState(0);

  const burnResult = calculateBurnRate({ cashBalance, monthlyRevenue, monthlyExpenses });
  const baseProjection = projectCashBalance(cashBalance, monthlyRevenue, monthlyExpenses, 18);
  const adjustedProjection = projectWithAdjustments(
    cashBalance,
    monthlyRevenue,
    monthlyExpenses,
    expenseCut,
    revenueIncrease,
    18
  );

  const adjustedBurn = calculateBurnRate({
    cashBalance,
    monthlyRevenue: monthlyRevenue * (1 + revenueIncrease / 100),
    monthlyExpenses: monthlyExpenses * (1 - expenseCut / 100),
  });

  const zone = getRunwayZone(burnResult.runway);
  const adjustedZone = getRunwayZone(adjustedBurn.runway);

  const chartData = baseProjection.map((base, i) => ({
    month: `M${base.month}`,
    "Current Path": Math.max(0, base.balance),
    ...(expenseCut > 0 || revenueIncrease > 0
      ? { "Adjusted Path": Math.max(0, adjustedProjection[i]?.balance ?? 0) }
      : {}),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Burn Rate & Runway Calculator</h1>
        <p className="text-muted-foreground mt-1">
          Calculate how long your cash will last and model cost-cutting scenarios.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Monthly Financials
            <InfoTooltip content="Kevin recommends maintaining 3-6 months of cash reserves. Less than 3 months is a critical zone." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CurrencyInput label="Current Cash Balance" value={cashBalance} onChange={setCashBalance} />
            <CurrencyInput label="Monthly Revenue" value={monthlyRevenue} onChange={setMonthlyRevenue} />
            <CurrencyInput label="Monthly Expenses" value={monthlyExpenses} onChange={setMonthlyExpenses} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ResultCard label="Gross Burn" value={formatPHP(burnResult.grossBurn)} sublabel="Total monthly expenses" />
        <ResultCard
          label="Net Burn"
          value={formatPHP(burnResult.netBurn)}
          sublabel={burnResult.netBurn < 0 ? "Net surplus (revenue > expenses)" : "Expenses minus revenue"}
          variant={burnResult.netBurn < 0 ? "success" : burnResult.netBurn === 0 ? "warning" : "default"}
        />
        <ResultCard
          label="Runway"
          value={burnResult.runway === Infinity ? "Sustainable" : `${burnResult.runway.toFixed(1)} months`}
          variant={zone === "red" ? "danger" : zone === "yellow" ? "warning" : "success"}
          sublabel={
            zone === "red"
              ? "Critical — less than 3 months"
              : zone === "yellow"
                ? "Caution — 3 to 6 months"
                : "Healthy — 6+ months"
          }
        />
        <ResultCard
          label="Monthly Cash Flow"
          value={formatPHP(monthlyRevenue - monthlyExpenses)}
          variant={monthlyRevenue >= monthlyExpenses ? "success" : "danger"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Balance Projection</CardTitle>
          <CardDescription>18-month cash balance forecast</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="currentPathGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="adjustedPathGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="50%" stopColor="#22c55e" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(v) => `₱${(v / 1000000).toFixed(1)}M`}
              />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value) => formatPHP(Number(value))}
              />
              <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="Current Path"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#currentPathGradient)"
                dot={{ r: 2, fill: "#3b82f6" }}
              />
              {(expenseCut > 0 || revenueIncrease > 0) && (
                <Area
                  type="monotone"
                  dataKey="Adjusted Path"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  fill="url(#adjustedPathGradient)"
                  dot={{ r: 2, fill: "#22c55e" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What-If Scenarios</CardTitle>
          <CardDescription>Adjust sliders to see how changes affect your runway.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Cut Expenses by {expenseCut}%</Label>
              <span className="text-sm text-muted-foreground">
                {formatPHP(monthlyExpenses * (1 - expenseCut / 100))}/mo
              </span>
            </div>
            <Slider
              value={[expenseCut]}
              onValueChange={([v]) => setExpenseCut(v)}
              min={0}
              max={50}
              step={5}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Increase Revenue by {revenueIncrease}%</Label>
              <span className="text-sm text-muted-foreground">
                {formatPHP(monthlyRevenue * (1 + revenueIncrease / 100))}/mo
              </span>
            </div>
            <Slider
              value={[revenueIncrease]}
              onValueChange={([v]) => setRevenueIncrease(v)}
              min={0}
              max={100}
              step={10}
            />
          </div>

          {(expenseCut > 0 || revenueIncrease > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <ResultCard
                label="Adjusted Net Burn"
                value={formatPHP(adjustedBurn.netBurn)}
              />
              <ResultCard
                label="Adjusted Runway"
                value={adjustedBurn.runway === Infinity ? "Sustainable" : `${adjustedBurn.runway.toFixed(1)} months`}
                variant={adjustedZone === "red" ? "danger" : adjustedZone === "yellow" ? "warning" : "success"}
              />
              <ResultCard
                label="Runway Change"
                value={
                  burnResult.runway === Infinity && adjustedBurn.runway === Infinity
                    ? "No change"
                    : burnResult.runway !== Infinity && adjustedBurn.runway === Infinity
                      ? "Now sustainable"
                      : (() => {
                          const delta = adjustedBurn.runway - burnResult.runway;
                          return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} months`;
                        })()
                }
                variant={
                  adjustedBurn.runway === Infinity
                    ? "success"
                    : adjustedBurn.runway > burnResult.runway
                      ? "success"
                      : "danger"
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

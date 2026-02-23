"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Button } from "@/components/ui/button";
import { formatPHP, formatPercent } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import { RotateCcw } from "lucide-react";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";

type SolveFor = "equity" | "preMoney" | "investment";

export default function PrePostMoneyPage() {
  const [solveFor, setSolveFor] = useState<SolveFor>("equity");
  const [preMoney, setPreMoney] = useState(12500000);
  const [investment, setInvestment] = useState(3250000);
  const [equityPercent, setEquityPercent] = useState(20.63);

  const calculate = () => {
    switch (solveFor) {
      case "equity": {
        const postMoney = preMoney + investment;
        const equity = postMoney > 0 ? (investment / postMoney) * 100 : 0;
        return { preMoney, investment, postMoney, equityPercent: equity };
      }
      case "preMoney": {
        if (equityPercent <= 0 || equityPercent >= 100) return null;
        const postMoney = investment / (equityPercent / 100);
        return { preMoney: postMoney - investment, investment, postMoney, equityPercent };
      }
      case "investment": {
        if (equityPercent <= 0 || equityPercent >= 100) return null;
        const postMoney = preMoney / (1 - equityPercent / 100);
        return { preMoney, investment: postMoney - preMoney, postMoney, equityPercent };
      }
    }
  };

  const handleReset = () => {
    setSolveFor("equity");
    setPreMoney(12500000);
    setInvestment(3250000);
    setEquityPercent(20.63);
  };

  const ai = useAiExplain("pre-post-money");

  const result = calculate();

  const pieData = result
    ? [
        { name: "Existing Shareholders", value: 100 - result.equityPercent },
        { name: "New Investor", value: result.equityPercent },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pre-Money / Post-Money Calculator</h1>
          <p className="text-muted-foreground mt-1">
            Calculate pre-money valuation, investment amount, or investor equity percentage.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} title="Reset to defaults">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Calculator
            <InfoTooltip content="Post-money = Pre-money + Capital raised. Investor equity = Investment / Post-money. Enter any 2 values to calculate the third." />
          </CardTitle>
          <CardDescription>
            Choose what to calculate, then fill in the other two values.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Solve for</Label>
            <Select value={solveFor} onValueChange={(v) => setSolveFor(v as SolveFor)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equity">Investor Equity %</SelectItem>
                <SelectItem value="preMoney">Pre-Money Valuation</SelectItem>
                <SelectItem value="investment">Investment Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {solveFor !== "preMoney" && (
              <CurrencyInput
                label="Pre-Money Valuation"
                value={preMoney}
                onChange={setPreMoney}
              />
            )}
            {solveFor !== "investment" && (
              <CurrencyInput
                label="Investment Amount"
                value={investment}
                onChange={setInvestment}
              />
            )}
            {solveFor !== "equity" && (
              <PercentageInput
                label="Investor Equity %"
                value={equityPercent}
                onChange={setEquityPercent}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {result && result.postMoney > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="pre-post-results">
            <ResultCard
              label="Pre-Money Valuation"
              value={formatPHP(result.preMoney)}
            />
            <ResultCard
              label="Investment"
              value={formatPHP(result.investment)}
            />
            <ResultCard
              label="Post-Money Valuation"
              value={formatPHP(result.postMoney)}
              variant="success"
            />
            <ResultCard
              label="Investor Equity"
              value={formatPercent(result.equityPercent)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ownership After Investment</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={(props) => {
                        const { value, cx, cy, midAngle, outerRadius: or } = props as { value: number; cx: number; cy: number; midAngle: number; outerRadius: number };
                        const RADIAN = Math.PI / 180;
                        const radius = or + 20;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} fill="#e5e7eb" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={13} fontWeight={600}>
                            {`${value.toFixed(1)}%`}
                          </text>
                        );
                      }}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                      formatter={(value) => `${Number(value).toFixed(2)}%`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Formula Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm font-mono">
                <p>Post-money = Pre-money + Investment</p>
                <p className="text-muted-foreground">
                  {formatPHP(result.postMoney)} = {formatPHP(result.preMoney)} + {formatPHP(result.investment)}
                </p>
                <p className="mt-4">Existing Shareholders % = Pre-money / Post-money</p>
                <p className="text-muted-foreground">
                  {formatPercent(100 - result.equityPercent)} = {formatPHP(result.preMoney)} / {formatPHP(result.postMoney)}
                </p>
                <p className="mt-4">New Shareholders % = Investment / Post-money</p>
                <p className="text-muted-foreground">
                  {formatPercent(result.equityPercent)} = {formatPHP(result.investment)} / {formatPHP(result.postMoney)}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {result && result.postMoney > 0 && (
        <AiInsightsPanel
          explanation={ai.explanation}
          isLoading={ai.isLoading}
          error={ai.error}
          onExplain={() =>
            ai.explain({
              preMoney: result.preMoney,
              investment: result.investment,
              postMoney: result.postMoney,
              investorEquityPercent: result.equityPercent,
              existingShareholdersPercent: 100 - result.equityPercent,
            })
          }
          onDismiss={ai.reset}
        />
      )}

      <RelatedTools currentToolId="pre-post-money" />
    </div>
  );
}

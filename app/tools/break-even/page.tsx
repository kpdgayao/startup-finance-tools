"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { EcosystemBanner } from "@/components/shared/ecosystem-banner";
import { LearnLink } from "@/components/shared/learn-link";
import { formatPHP } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import {
  calculateBreakEven,
  generateBreakEvenChartData,
} from "@/lib/calculations/break-even";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { CHART_COLORS } from "@/lib/constants";
import { RotateCcw } from "lucide-react";

export default function BreakEvenPage() {
  const [fixedCosts, setFixedCosts] = useState(150000);
  const [variableCost, setVariableCost] = useState(200);
  const [sellingPrice, setSellingPrice] = useState(500);
  const [currentVolume, setCurrentVolume] = useState(600);
  const [targetMargin, setTargetMargin] = useState(20);

  // What-if adjustments
  const [priceAdj, setPriceAdj] = useState(0);
  const [variableAdj, setVariableAdj] = useState(0);
  const [fixedAdj, setFixedAdj] = useState(0);

  const handleReset = () => {
    setFixedCosts(150000);
    setVariableCost(200);
    setSellingPrice(500);
    setCurrentVolume(600);
    setTargetMargin(20);
    setPriceAdj(0);
    setVariableAdj(0);
    setFixedAdj(0);
  };

  const adjustedInputs = useMemo(
    () => ({
      fixedCostsMonthly: fixedCosts * (1 + fixedAdj / 100),
      variableCostPerUnit: variableCost * (1 + variableAdj / 100),
      sellingPricePerUnit: sellingPrice * (1 + priceAdj / 100),
      currentMonthlyVolume: currentVolume,
      targetProfitMargin: targetMargin,
    }),
    [fixedCosts, variableCost, sellingPrice, currentVolume, targetMargin, priceAdj, variableAdj, fixedAdj]
  );

  const ai = useAiExplain("break-even");

  const result = calculateBreakEven(adjustedInputs);

  const chartData = useMemo(() => {
    if (!result) return [];
    const maxUnits = Math.max(result.breakEvenUnits * 2, currentVolume * 1.5);
    return generateBreakEvenChartData(adjustedInputs, Math.ceil(maxUnits));
  }, [adjustedInputs, result, currentVolume]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Break-Even Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Calculate your break-even point and model what-if scenarios to find the
            fastest path to profitability.
          </p>
          <LearnLink toolHref="/tools/break-even" />
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} title="Reset to defaults">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Cost & Revenue Inputs
            <InfoTooltip content="Break-even = Fixed Costs / (Selling Price - Variable Cost per Unit). This is the minimum volume to cover all costs." />
          </CardTitle>
          <CardDescription>
            Enter your monthly fixed costs and per-unit economics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CurrencyInput
              label="Monthly Fixed Costs"
              value={fixedCosts}
              onChange={setFixedCosts}
            />
            <CurrencyInput
              label="Variable Cost per Unit"
              value={variableCost}
              onChange={setVariableCost}
            />
            <CurrencyInput
              label="Selling Price per Unit"
              value={sellingPrice}
              onChange={setSellingPrice}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Current Monthly Volume (optional)"
              value={currentVolume}
              onChange={setCurrentVolume}
            />
            <PercentageInput
              label="Target Profit Margin (optional)"
              value={targetMargin}
              onChange={setTargetMargin}
            />
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="Break-Even Units"
              value={result.breakEvenUnits.toLocaleString()}
              variant="success"
            />
            <ResultCard
              label="Break-Even Revenue"
              value={formatPHP(result.breakEvenRevenue)}
            />
            <ResultCard
              label="Contribution Margin"
              value={formatPHP(result.contributionMarginPerUnit)}
            />
            <ResultCard
              label="CM Ratio"
              value={`${(result.contributionMarginRatio * 100).toFixed(1)}%`}
            />
          </div>

          {result.marginOfSafety !== null && (
            <div className="grid grid-cols-2 gap-4">
              <ResultCard
                label="Margin of Safety (units)"
                value={result.marginOfSafety.toLocaleString()}
                variant={result.marginOfSafety > 0 ? "success" : "danger"}
              />
              <ResultCard
                label="Margin of Safety %"
                value={`${result.marginOfSafetyPercent!.toFixed(1)}%`}
                variant={result.marginOfSafetyPercent! > 0 ? "success" : "danger"}
              />
            </div>
          )}

          {result.targetProfitUnits !== null && (
            <div className="grid grid-cols-2 gap-4">
              <ResultCard
                label={`Units for ${targetMargin}% Profit`}
                value={result.targetProfitUnits.toLocaleString()}
              />
              <ResultCard
                label={`Revenue for ${targetMargin}% Profit`}
                value={formatPHP(result.targetProfitRevenue!)}
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Revenue vs. Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="units"
                    label={{ value: "Units Sold", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => formatPHP(Number(value))}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                    formatter={(value) => formatPHP(Number(value))}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_COLORS[0]}
                    name="Revenue"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalCost"
                    stroke={CHART_COLORS[4]}
                    name="Total Cost"
                    strokeWidth={2}
                    dot={false}
                  />
                  <ReferenceLine
                    x={result.breakEvenUnits}
                    stroke={CHART_COLORS[1]}
                    strokeDasharray="5 5"
                    label={{ value: "Break-Even", fill: CHART_COLORS[1], fontSize: 12 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What-If Scenarios</CardTitle>
              <CardDescription>
                Adjust sliders to see how changes affect your break-even point.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <Label>Price adjustment</Label>
                  <span className="text-muted-foreground">
                    {priceAdj > 0 ? "+" : ""}{priceAdj}%
                  </span>
                </div>
                <Slider
                  value={[priceAdj]}
                  onValueChange={([v]) => setPriceAdj(v)}
                  min={-50}
                  max={50}
                  step={5}
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <Label>Variable cost adjustment</Label>
                  <span className="text-muted-foreground">
                    {variableAdj > 0 ? "+" : ""}{variableAdj}%
                  </span>
                </div>
                <Slider
                  value={[variableAdj]}
                  onValueChange={([v]) => setVariableAdj(v)}
                  min={-50}
                  max={50}
                  step={5}
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <Label>Fixed cost adjustment</Label>
                  <span className="text-muted-foreground">
                    {fixedAdj > 0 ? "+" : ""}{fixedAdj}%
                  </span>
                </div>
                <Slider
                  value={[fixedAdj]}
                  onValueChange={([v]) => setFixedAdj(v)}
                  min={-50}
                  max={50}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!result && sellingPrice > 0 && variableCost >= sellingPrice && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              Your variable cost per unit ({formatPHP(variableCost)}) is equal to
              or greater than your selling price ({formatPHP(sellingPrice)}). You
              cannot break even — every unit sold loses money. Increase your price
              or reduce variable costs.
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <AiInsightsPanel
          explanation={ai.explanation}
          isLoading={ai.isLoading}
          error={ai.error}
          onExplain={() =>
            ai.explain({
              fixedCostsMonthly: adjustedInputs.fixedCostsMonthly,
              variableCostPerUnit: adjustedInputs.variableCostPerUnit,
              sellingPricePerUnit: adjustedInputs.sellingPricePerUnit,
              breakEvenUnits: result.breakEvenUnits,
              breakEvenRevenue: result.breakEvenRevenue,
              contributionMarginPerUnit: result.contributionMarginPerUnit,
              contributionMarginRatio: result.contributionMarginRatio,
              marginOfSafety: result.marginOfSafety,
              marginOfSafetyPercent: result.marginOfSafetyPercent,
              currentVolume,
            })
          }
          onDismiss={ai.reset}
        />
      )}

      <EcosystemBanner toolId="break-even" />

      <RelatedTools currentToolId="break-even" />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatPHP } from "@/lib/utils";
import {
  calculateDCF,
  calculateBerkus,
  calculateScorecard,
  calculateVCMethod,
  calculateValuationSummary,
  type BerkusFactor,
  type ScorecardFactor,
} from "@/lib/calculations/valuation";
import { BERKUS_FACTORS, SCORECARD_FACTORS, DEFAULT_DISCOUNT_RATE, CHART_COLORS } from "@/lib/constants";
import { Trash2, Plus } from "lucide-react";
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

export default function ValuationCalculatorPage() {
  // DCF state
  const [cashFlows, setCashFlows] = useState<number[]>([500000, 800000, 1200000, 1800000, 2500000]);
  const [discountRate, setDiscountRate] = useState(DEFAULT_DISCOUNT_RATE);
  const [terminalGrowth, setTerminalGrowth] = useState(3);

  // Berkus state
  const [berkusFactors, setBerkusFactors] = useState<BerkusFactor[]>(
    BERKUS_FACTORS.map((f) => ({ ...f, value: 250000 }))
  );

  // Scorecard state
  const [medianValuation, setMedianValuation] = useState(10000000);
  const [scorecardFactors, setScorecardFactors] = useState<ScorecardFactor[]>(
    SCORECARD_FACTORS.map((f) => ({
      id: f.id,
      label: f.label,
      weight: f.defaultWeight,
      score: 1.0,
    }))
  );

  // VC Method state
  const [exitValue, setExitValue] = useState(100000000);
  const [targetReturn, setTargetReturn] = useState(10);
  const [expectedDilution, setExpectedDilution] = useState(30);

  // Calculate all methods
  const dcfValue = calculateDCF({ cashFlows, discountRate, terminalGrowthRate: terminalGrowth });
  const berkusValue = calculateBerkus(berkusFactors);
  const scorecardValue = calculateScorecard(scorecardFactors, medianValuation);
  const vcValue = calculateVCMethod({ expectedExitValue: exitValue, targetReturnMultiple: targetReturn, expectedDilution: expectedDilution });

  const summary = calculateValuationSummary({
    dcf: dcfValue,
    berkus: berkusValue,
    scorecard: scorecardValue,
    vcMethod: vcValue,
  });

  const comparisonData = [
    { method: "DCF", value: dcfValue },
    { method: "Berkus", value: berkusValue },
    { method: "Scorecard", value: scorecardValue },
    { method: "VC Method", value: vcValue },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Startup Valuation Calculator</h1>
        <p className="text-muted-foreground mt-1">
          Estimate your startup&apos;s value using 4 industry-standard methods.
        </p>
      </div>

      {/* Summary Panel */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>Valuation Summary</CardTitle>
          <CardDescription>Comparison across all 4 methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <ResultCard label="Suggested Range" value={`${formatPHP(summary.range.min)} — ${formatPHP(summary.range.max)}`} variant="success" />
            <ResultCard label="Average Valuation" value={formatPHP(summary.average)} />
            <ResultCard label="Methods Used" value={String([summary.dcf, summary.berkus, summary.scorecard, summary.vcMethod].filter((v) => v !== null && v > 0).length)} sublabel="DCF, Berkus, Scorecard, VC" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="method" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `₱${(v / 1000000).toFixed(1)}M`} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                formatter={(value) => formatPHP(Number(value))}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {comparisonData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="dcf">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="dcf">DCF</TabsTrigger>
          <TabsTrigger value="berkus">Berkus</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="vc-method">VC Method</TabsTrigger>
        </TabsList>

        {/* DCF Tab */}
        <TabsContent value="dcf" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Discounted Cash Flow (DCF)
                <InfoTooltip content="Project future cash flows and discount them to present value using a required rate of return. Includes terminal value using the Gordon Growth Model." />
              </CardTitle>
              <CardDescription>Enter projected annual cash flows for 5 years.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {cashFlows.map((cf, i) => (
                  <CurrencyInput
                    key={i}
                    label={`Year ${i + 1}`}
                    value={cf}
                    onChange={(v) => {
                      const next = [...cashFlows];
                      next[i] = v;
                      setCashFlows(next);
                    }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PercentageInput label="Discount Rate %" value={discountRate} onChange={setDiscountRate} max={50} />
                <PercentageInput label="Terminal Growth Rate %" value={terminalGrowth} onChange={setTerminalGrowth} max={10} />
              </div>
            </CardContent>
          </Card>
          <ResultCard label="DCF Valuation" value={formatPHP(dcfValue)} variant="success" />
        </TabsContent>

        {/* Berkus Tab */}
        <TabsContent value="berkus" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Berkus Method
                <InfoTooltip content="Assigns up to ₱500K for each of 5 risk factors, for a max pre-revenue valuation of ₱2.5M. Best for early-stage startups without revenue." />
              </CardTitle>
              <CardDescription>Score each factor from ₱0 to ₱500,000. Maximum valuation: ₱2,500,000.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {berkusFactors.map((factor, i) => (
                <div key={factor.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{factor.label}</Label>
                    <span className="text-sm font-medium">{formatPHP(factor.value)}</span>
                  </div>
                  <Slider
                    value={[factor.value]}
                    onValueChange={([v]) => {
                      const next = [...berkusFactors];
                      next[i] = { ...factor, value: v };
                      setBerkusFactors(next);
                    }}
                    min={0}
                    max={factor.maxValue}
                    step={50000}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
          <ResultCard label="Berkus Valuation" value={formatPHP(berkusValue)} variant="success" sublabel="Pre-revenue valuation (max ₱2.5M)" />
        </TabsContent>

        {/* Scorecard Tab */}
        <TabsContent value="scorecard" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Scorecard Method
                <InfoTooltip content="Compare your startup against the industry median. Each factor gets a weight and a score (0.5x = much worse, 1.0x = average, 1.5x = much better). The weighted score adjusts the median valuation." />
              </CardTitle>
              <CardDescription>Set the industry median valuation, then score each factor relative to average.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <CurrencyInput label="Industry Median Pre-Money Valuation" value={medianValuation} onChange={setMedianValuation} />
              {scorecardFactors.map((factor, i) => (
                <div key={factor.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      {factor.label} (Weight: {factor.weight}%)
                    </Label>
                    <span className="text-sm font-medium">
                      {factor.score.toFixed(1)}x {factor.score < 1 ? "below avg" : factor.score > 1 ? "above avg" : "average"}
                    </span>
                  </div>
                  <Slider
                    value={[factor.score * 100]}
                    onValueChange={([v]) => {
                      const next = [...scorecardFactors];
                      next[i] = { ...factor, score: v / 100 };
                      setScorecardFactors(next);
                    }}
                    min={50}
                    max={150}
                    step={10}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
          <ResultCard label="Scorecard Valuation" value={formatPHP(scorecardValue)} variant="success" sublabel={`Based on ${formatPHP(medianValuation)} median`} />
        </TabsContent>

        {/* VC Method Tab */}
        <TabsContent value="vc-method" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                VC Method
                <InfoTooltip content="Work backwards from an expected exit value. VCs target a specific return multiple (e.g., 10x). Post-money = Exit Value / Target Return, adjusted for future dilution." />
              </CardTitle>
              <CardDescription>Estimate valuation based on expected exit and investor return requirements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CurrencyInput label="Expected Exit Value" value={exitValue} onChange={setExitValue} />
              <div className="space-y-2">
                <Label>Target Return Multiple ({targetReturn}x)</Label>
                <Slider value={[targetReturn]} onValueChange={([v]) => setTargetReturn(v)} min={2} max={30} step={1} />
              </div>
              <PercentageInput label="Expected Future Dilution %" value={expectedDilution} onChange={setExpectedDilution} />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResultCard label="Unadjusted Post-Money" value={formatPHP(exitValue / targetReturn)} sublabel="Exit Value / Target Return" />
            <ResultCard label="VC Method Valuation" value={formatPHP(vcValue)} variant="success" sublabel="Grossed up for future dilution" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { EcosystemBanner } from "@/components/shared/ecosystem-banner";
import { LearnLink } from "@/components/shared/learn-link";
import { Button } from "@/components/ui/button";
import { formatPHP, formatPercent } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import {
  calculateSafeConversion,
  calculateNoteConversion,
} from "@/lib/calculations/safe-calculator";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import { RotateCcw } from "lucide-react";

type InstrumentType = "safe" | "convertible-note";

export default function SafeCalculatorPage() {
  const [instrumentType, setInstrumentType] =
    useState<InstrumentType>("safe");
  const [investmentAmount, setInvestmentAmount] = useState(1000000);
  const [valuationCap, setValuationCap] = useState(20000000);
  const [discountRate, setDiscountRate] = useState(20);
  const [interestRate, setInterestRate] = useState(5);
  const [termMonths, setTermMonths] = useState(18);
  const [preMoneyValuation, setPreMoneyValuation] = useState(40000000);
  const [roundSize, setRoundSize] = useState(10000000);

  const handleReset = () => {
    setInstrumentType("safe");
    setInvestmentAmount(1000000);
    setValuationCap(20000000);
    setDiscountRate(20);
    setInterestRate(5);
    setTermMonths(18);
    setPreMoneyValuation(40000000);
    setRoundSize(10000000);
  };

  const ai = useAiExplain("safe-calculator");

  const result =
    instrumentType === "safe"
      ? calculateSafeConversion(
          { investmentAmount, valuationCap, discountRate },
          { preMoneyValuation, roundSize }
        )
      : calculateNoteConversion(
          {
            investmentAmount,
            valuationCap,
            discountRate,
            interestRate,
            termMonths,
          },
          { preMoneyValuation, roundSize }
        );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            SAFE & Convertible Note Calculator
          </h1>
          <p className="text-muted-foreground mt-1">
            Model how SAFEs and convertible notes convert to equity at a priced
            round.
          </p>
          <LearnLink toolHref="/tools/safe-calculator" />
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} title="Reset to defaults">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Instrument Details
            <InfoTooltip content="A SAFE (Simple Agreement for Future Equity) converts to equity at a future priced round. The investor gets the better deal between the valuation cap and discount rate." />
          </CardTitle>
          <CardDescription>
            Choose your instrument type and enter the terms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Instrument Type</Label>
            <Select
              value={instrumentType}
              onValueChange={(v) =>
                setInstrumentType(v as InstrumentType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="safe">
                  SAFE (Post-Money, YC Standard)
                </SelectItem>
                <SelectItem value="convertible-note">
                  Convertible Note
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CurrencyInput
              label="Investment Amount"
              value={investmentAmount}
              onChange={setInvestmentAmount}
            />
            <CurrencyInput
              label="Valuation Cap"
              value={valuationCap}
              onChange={setValuationCap}
            />
            <PercentageInput
              label="Discount Rate"
              value={discountRate}
              onChange={setDiscountRate}
            />
          </div>

          {instrumentType === "convertible-note" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PercentageInput
                label="Annual Interest Rate"
                value={interestRate}
                onChange={setInterestRate}
              />
              <div className="space-y-2">
                <Label htmlFor="term-months">Term (months)</Label>
                <Input
                  id="term-months"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={120}
                  value={termMonths}
                  onChange={(e) =>
                    setTermMonths(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Priced Round (Conversion Trigger)
            <InfoTooltip content="Enter the terms of the future priced round that triggers SAFE/note conversion." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Pre-Money Valuation"
              value={preMoneyValuation}
              onChange={setPreMoneyValuation}
            />
            <CurrencyInput
              label="Round Size"
              value={roundSize}
              onChange={setRoundSize}
            />
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="Conversion Method"
              value={result.conversionMethod === "cap" ? "Cap" : "Discount"}
            />
            <ResultCard
              label="Effective Price/Share"
              value={formatPHP(result.effectivePrice)}
            />
            <ResultCard
              label="Shares Issued"
              value={Math.round(result.sharesIssued).toLocaleString()}
            />
            <ResultCard
              label="SAFE Holder Ownership"
              value={formatPercent(result.ownershipPercent)}
              variant="success"
            />
          </div>

          {result.scenarios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Scenario Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-medium">
                          Scenario
                        </th>
                        <th className="text-right py-2 px-4 font-medium">
                          Price/Share
                        </th>
                        <th className="text-right py-2 px-4 font-medium">
                          Shares
                        </th>
                        <th className="text-right py-2 pl-4 font-medium">
                          Ownership
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.scenarios.map((s) => (
                        <tr
                          key={s.label}
                          className="border-b border-border/50"
                        >
                          <td className="py-2 pr-4">{s.label}</td>
                          <td className="text-right py-2 px-4">
                            {formatPHP(s.effectivePricePerShare)}
                          </td>
                          <td className="text-right py-2 px-4">
                            {Math.round(s.sharesIssued).toLocaleString()}
                          </td>
                          <td className="text-right py-2 pl-4">
                            {formatPercent(s.ownershipPercent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Post-Conversion Cap Table
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={result.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={(props) => {
                      const {
                        value,
                        cx,
                        cy,
                        midAngle,
                        outerRadius: or,
                      } = props as {
                        value: number;
                        cx: number;
                        cy: number;
                        midAngle: number;
                        outerRadius: number;
                      };
                      const RADIAN = Math.PI / 180;
                      const radius = or + 20;
                      const x =
                        cx + radius * Math.cos(-midAngle * RADIAN);
                      const y =
                        cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#e5e7eb"
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                          fontSize={13}
                          fontWeight={600}
                        >
                          {`${value.toFixed(1)}%`}
                        </text>
                      );
                    }}
                  >
                    {result.pieData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                    formatter={(value) =>
                      `${Number(value).toFixed(2)}%`
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {result && (
        <AiInsightsPanel
          explanation={ai.explanation}
          isLoading={ai.isLoading}
          error={ai.error}
          onExplain={() =>
            ai.explain({
              instrumentType,
              investmentAmount,
              valuationCap,
              discountRate,
              ...(instrumentType === "convertible-note"
                ? { interestRate, termMonths }
                : {}),
              preMoneyValuation,
              roundSize,
              conversionMethod: result.conversionMethod,
              effectivePrice: result.effectivePrice,
              ownershipPercent: result.ownershipPercent,
              capPrice: result.capPrice,
              discountPrice: result.discountPrice,
            })
          }
          onDismiss={ai.reset}
        />
      )}

      <EcosystemBanner toolId="safe-calculator" />

      <RelatedTools currentToolId="safe-calculator" />
    </div>
  );
}

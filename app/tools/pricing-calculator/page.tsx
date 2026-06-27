"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatPHP, formatNumber } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import { validateFinancialAmount, validatePercentage, validatePositiveInteger, sanitizeFinancialAmount, sanitizePercentage, sanitizePositiveInteger } from "@/lib/validation";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import {
  calculateCostPlus,
  calculatePenetrationPrice,
  calculateCompetitivePosition,
  calculateBundlePrice,
  suggestPsychologicalPrice,
  calculateBreakeven,
} from "@/lib/calculations/pricing";
import { LearnLink } from "@/components/shared/learn-link";
import { Trash2, Plus, RotateCcw } from "lucide-react";

export default function PricingCalculatorPage() {
  // Cost-Plus state
  const [fixedCosts, setFixedCosts] = useState(130000);
  const [variableCost, setVariableCost] = useState(0);
  const [expectedUnits, setExpectedUnits] = useState(10);
  const [marginPercent, setMarginPercent] = useState(40);

  // Value-Based state
  const [perceivedValue, setPerceivedValue] = useState(25000);
  const [valueDiscount, setValueDiscount] = useState(20);

  // Penetration state
  const [marketPrice, setMarketPrice] = useState(20000);
  const [penetrationDiscount, setPenetrationDiscount] = useState(25);

  // Competitive state
  const [competitorPrices, setCompetitorPrices] = useState<number[]>([15000, 18000, 22000, 25000]);

  // Bundle state
  const [bundleItems, setBundleItems] = useState<number[]>([10000, 8000, 5000]);
  const [bundleDiscount, setBundleDiscount] = useState(15);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const fixedCostsError = touched.fixedCosts ? validateFinancialAmount(fixedCosts).error : undefined;
  const variableCostError = touched.variableCost ? validateFinancialAmount(variableCost).error : undefined;
  const expectedUnitsError = touched.expectedUnits ? validatePositiveInteger(expectedUnits).error : undefined;
  const marginPercentError = touched.marginPercent ? validatePercentage(marginPercent, { max: 500 }).error : undefined;
  const perceivedValueError = touched.perceivedValue ? validateFinancialAmount(perceivedValue).error : undefined;
  const valueDiscountError = touched.valueDiscount ? validatePercentage(valueDiscount).error : undefined;
  const marketPriceError = touched.marketPrice ? validateFinancialAmount(marketPrice).error : undefined;
  const penetrationDiscountError = touched.penetrationDiscount ? validatePercentage(penetrationDiscount).error : undefined;
  const bundleDiscountError = touched.bundleDiscount ? validatePercentage(bundleDiscount).error : undefined;

  const hasErrors = !!(fixedCostsError || variableCostError || expectedUnitsError || marginPercentError || perceivedValueError || valueDiscountError || marketPriceError || penetrationDiscountError || bundleDiscountError);

  const safeFixedCosts = sanitizeFinancialAmount(fixedCosts);
  const safeVariableCost = sanitizeFinancialAmount(variableCost);
  const safeExpectedUnits = sanitizePositiveInteger(expectedUnits);
  const safeMarginPercent = sanitizePercentage(marginPercent, { max: 500 });
  const safePerceivedValue = sanitizeFinancialAmount(perceivedValue);
  const safeValueDiscount = sanitizePercentage(valueDiscount);
  const safeMarketPrice = sanitizeFinancialAmount(marketPrice);
  const safePenetrationDiscount = sanitizePercentage(penetrationDiscount);
  const safeBundleDiscount = sanitizePercentage(bundleDiscount);

  const handleReset = () => {
    setFixedCosts(130000);
    setVariableCost(0);
    setExpectedUnits(10);
    setMarginPercent(40);
    setPerceivedValue(25000);
    setValueDiscount(20);
    setMarketPrice(20000);
    setPenetrationDiscount(25);
    setCompetitorPrices([15000, 18000, 22000, 25000]);
    setBundleItems([10000, 8000, 5000]);
    setBundleDiscount(15);
    setTouched({});
  };

  const ai = useAiExplain("pricing-calculator");

  const costPlusResult = calculateCostPlus(
    { fixedCosts: safeFixedCosts, variableCostPerUnit: safeVariableCost, expectedUnits: safeExpectedUnits },
    safeMarginPercent
  );

  const valueBased = safePerceivedValue * (1 - safeValueDiscount / 100);
  const penetrationPrice = calculatePenetrationPrice(safeMarketPrice, safePenetrationDiscount);
const competitive = calculateCompetitivePosition(competitorPrices.map((v) => sanitizeFinancialAmount(v)));
const bundle = calculateBundlePrice(bundleItems.map((v) => sanitizeFinancialAmount(v)), safeBundleDiscount);
  const psychologicalPrice = suggestPsychologicalPrice(costPlusResult.price);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Product Pricing Calculator</h1>
          <p className="text-muted-foreground mt-1">
            Explore 6 pricing strategies and find the optimal price for your product.
          </p>
          <LearnLink toolHref="/tools/pricing-calculator" />
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} title="Reset to defaults">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="cost-plus">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="cost-plus">Cost-Plus</TabsTrigger>
          <TabsTrigger value="value-based">Value-Based</TabsTrigger>
          <TabsTrigger value="penetration">Penetration</TabsTrigger>
          <TabsTrigger value="competitive">Competitive</TabsTrigger>
          <TabsTrigger value="bundle">Bundle</TabsTrigger>
          <TabsTrigger value="psychological">Psychological</TabsTrigger>
        </TabsList>

        <TabsContent value="cost-plus" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Cost-Plus Pricing
                <InfoTooltip content="From Kevin's deck: Add your target margin to total costs. Example: ₱130K total costs × 1.4 margin / 10 clients = ₱18,200/month per client." />
              </CardTitle>
              <CardDescription>
                Calculate price by adding a markup to your costs. Pre-loaded with Kevin&apos;s cloud software exercise.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CurrencyInput label="Total Fixed Costs (monthly)" value={fixedCosts} onChange={setFixedCosts} onBlur={() => markTouched("fixedCosts")} error={fixedCostsError} />
                <CurrencyInput label="Variable Cost per Unit" value={variableCost} onChange={setVariableCost} onBlur={() => markTouched("variableCost")} error={variableCostError} />
                <div className="space-y-2">
                  <Label>Expected Units / Clients</Label>
                  <Input
                    type="number"
                    min={1}
                    value={expectedUnits || ""}
                    onChange={(e) => setExpectedUnits(parseInt(e.target.value) || 0)}
                    onBlur={() => markTouched("expectedUnits")}
                  />
                  {expectedUnitsError && <p className="text-xs text-red-500 mt-1">{expectedUnitsError}</p>}
                </div>
                <PercentageInput label="Target Margin %" value={marginPercent} onChange={setMarginPercent} max={500} onBlur={() => markTouched("marginPercent")} error={marginPercentError} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ResultCard label="Price per Unit" value={formatPHP(costPlusResult.price)} variant="success" />
            <ResultCard label="Margin per Unit" value={formatPHP(costPlusResult.margin)} />
            <ResultCard label="Breakeven Units" value={costPlusResult.breakeven === Infinity ? "N/A" : formatNumber(costPlusResult.breakeven)} />
            <ResultCard label="Contribution / Unit" value={formatPHP(costPlusResult.contributionPerUnit)} />
          </div>
        </TabsContent>

        <TabsContent value="value-based" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Value-Based Pricing
                <InfoTooltip content="Price based on the perceived value to the customer, not your costs. Typically priced below perceived value to ensure a positive ROI for the buyer." />
              </CardTitle>
              <CardDescription>Set price based on how much value the customer perceives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CurrencyInput label="Customer Perceived Value" value={perceivedValue} onChange={setPerceivedValue} onBlur={() => markTouched("perceivedValue")} error={perceivedValueError} />
                <PercentageInput label="Discount from Value %" value={valueDiscount} onChange={setValueDiscount} onBlur={() => markTouched("valueDiscount")} error={valueDiscountError} />
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResultCard label="Perceived Value" value={formatPHP(perceivedValue)} />
            <ResultCard label="Suggested Price" value={formatPHP(valueBased)} variant="success" />
            <ResultCard label="Customer Surplus" value={formatPHP(perceivedValue - valueBased)} sublabel="Value the customer keeps" />
          </div>
        </TabsContent>

        <TabsContent value="penetration" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Penetration Pricing
                <InfoTooltip content="Enter the market at a lower price to gain market share quickly, then gradually increase price over time." />
              </CardTitle>
              <CardDescription>Set a below-market price to capture market share quickly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CurrencyInput label="Market Price" value={marketPrice} onChange={setMarketPrice} onBlur={() => markTouched("marketPrice")} error={marketPriceError} />
                <PercentageInput label="Entry Discount %" value={penetrationDiscount} onChange={setPenetrationDiscount} onBlur={() => markTouched("penetrationDiscount")} error={penetrationDiscountError} />
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResultCard label="Market Price" value={formatPHP(marketPrice)} />
            <ResultCard label="Entry Price" value={formatPHP(penetrationPrice)} variant="success" />
            <ResultCard label="Discount Amount" value={formatPHP(marketPrice - penetrationPrice)} sublabel="Below-market positioning" />
          </div>
        </TabsContent>

        <TabsContent value="competitive" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Competitive Pricing
                <InfoTooltip content="Analyze competitor prices to position your product. Price at, above, or below the market average." />
              </CardTitle>
              <CardDescription>Enter competitor prices to find your positioning.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {competitorPrices.map((price, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <CurrencyInput
                      label={`Competitor ${i + 1}`}
                      value={price}
                      onChange={(v) => {
                        const next = [...competitorPrices];
                        next[i] = v;
                        setCompetitorPrices(next);
                      }}
                    />
                  </div>
                  {competitorPrices.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mb-0.5"
                      onClick={() => setCompetitorPrices(competitorPrices.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {competitorPrices.length < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompetitorPrices([...competitorPrices, 0])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Competitor
                </Button>
              )}
            </CardContent>
          </Card>
          {competitorPrices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ResultCard label="Lowest Price" value={formatPHP(competitive.min)} />
              <ResultCard label="Highest Price" value={formatPHP(competitive.max)} />
              <ResultCard label="Average Price" value={formatPHP(competitive.average)} variant="success" />
              <ResultCard label="Median Price" value={formatPHP(competitive.median)} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="bundle" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Bundle Pricing
                <InfoTooltip content="Combine multiple products/services at a discount to increase perceived value and average transaction size." />
              </CardTitle>
              <CardDescription>Calculate bundle discounts for grouped products.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bundleItems.map((price, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <CurrencyInput
                      label={`Item ${i + 1}`}
                      value={price}
                      onChange={(v) => {
                        const next = [...bundleItems];
                        next[i] = v;
                        setBundleItems(next);
                      }}
                    />
                  </div>
                  {bundleItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mb-0.5"
                      onClick={() => setBundleItems(bundleItems.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {bundleItems.length < 10 && (
                <Button variant="outline" size="sm" onClick={() => setBundleItems([...bundleItems, 0])}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
              <PercentageInput label="Bundle Discount %" value={bundleDiscount} onChange={setBundleDiscount} onBlur={() => markTouched("bundleDiscount")} error={bundleDiscountError} />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResultCard label="Individual Total" value={formatPHP(bundle.totalIndividual)} />
            <ResultCard label="Bundle Price" value={formatPHP(bundle.bundlePrice)} variant="success" />
            <ResultCard label="Customer Savings" value={formatPHP(bundle.savings)} />
          </div>
        </TabsContent>

        <TabsContent value="psychological" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Psychological Pricing
                <InfoTooltip content="Prices ending in 9 or 99 feel significantly cheaper. ₱999 vs ₱1,000 — the left-digit effect makes customers perceive a bigger gap." />
              </CardTitle>
              <CardDescription>
                Auto-suggest charm prices that feel more affordable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CurrencyInput label="Your Calculated Price" value={costPlusResult.price} onChange={() => {}} />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResultCard label="Original Price" value={formatPHP(Math.round(costPlusResult.price))} />
            <ResultCard
              label="Psychological Price"
              value={formatPHP(psychologicalPrice)}
              variant="success"
              sublabel={`Ends in 9 — feels cheaper than ${formatPHP(psychologicalPrice + 1)}`}
            />
          </div>
        </TabsContent>
      </Tabs>

      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        disabled={hasErrors}
        onExplain={() =>
          ai.explain({
            costPlus: {
              fixedCosts: safeFixedCosts,
              variableCost: safeVariableCost,
              expectedUnits: safeExpectedUnits,
              marginPercent: safeMarginPercent,
              price: costPlusResult.price,
              breakeven: costPlusResult.breakeven,
            },
            valueBased: { perceivedValue: safePerceivedValue, valueDiscount: safeValueDiscount, suggestedPrice: valueBased },
            penetration: { marketPrice: safeMarketPrice, penetrationDiscount: safePenetrationDiscount, entryPrice: penetrationPrice },
            competitive: { competitorPrices: competitorPrices.map((v) => sanitizeFinancialAmount(v)), ...competitive },
            bundle: { bundleItems: bundleItems.map((v) => sanitizeFinancialAmount(v)), bundleDiscount: safeBundleDiscount, ...bundle },
            psychologicalPrice,
          })
        }
        onDismiss={ai.reset}
      />

      <RelatedTools currentToolId="pricing-calculator" />
    </div>
  );
}

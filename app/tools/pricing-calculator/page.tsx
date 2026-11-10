"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegerInput } from "@/components/shared/integer-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatPHP, formatPHPDetailed, formatNumber } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import { validateFinancialAmount, validatePercentage, validatePositiveInteger, sanitizeFinancialAmount, sanitizePercentage, sanitizePositiveInteger } from "@/lib/validation";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { EcosystemBanner } from "@/components/shared/ecosystem-banner";
import {
  calculateCostPlus,
  calculatePenetrationPrice,
  calculateBundlePrice,
  convertBasisPercent,
  suggestCharmPrices,
  calculateBreakeven,
  comparePerMeasure,
  buildPriceLadder,
  formatShareLine,
  compareTwoPrices,
  sumSavings,
  type PricingBasis,
  type CompetitorOffer,
  type SavingsItem,
  type PricePoint,
} from "@/lib/calculations/pricing";
import {
  summarizeCosts,
  calculateMonthlyOutcome,
  REFILL_STATION_EXAMPLE,
  type CostLine,
} from "@/lib/calculations/pricing-costs";
import { CostLinesEditor } from "./components/cost-lines-editor";
import { CompetitiveTab } from "./components/competitive-tab";
import { PriceDecision } from "./components/price-decision";
import { TwoPriceTest } from "./components/two-price-test";
import { LearnLink } from "@/components/shared/learn-link";
import { Trash2, Plus, RotateCcw } from "lucide-react";

// The deck's slide 25 benchmark: the sachet pack and the refill hub.
const DEFAULT_OFFERS: CompetitorOffer[] = [
  { id: "c-1", name: "Single-use pack, 100.5 ml", price: 31.2, size: 100.5 },
  { id: "c-2", name: "Refill hub, 30 ml", price: 4, size: 30 },
];

// A B2B refill example in the shape of Sangkap Hub: what the customer stops
// spending once they buy from you.
const DEFAULT_SAVINGS: SavingsItem[] = [
  { id: "s-1", name: "Fewer stock-outs (lost sales avoided)", amount: 6000 },
  { id: "s-2", name: "No emergency purchases", amount: 2500 },
  { id: "s-3", name: "Less staff time reordering", amount: 1500 },
];

export default function PricingCalculatorPage() {
  // Cost-Plus state
  const [costLines, setCostLines] = useState<CostLine[]>(REFILL_STATION_EXAMPLE);
  const [unitName, setUnitName] = useState("liter");
  const [isReuseModel, setIsReuseModel] = useState(true);
  const [expectedUnits, setExpectedUnits] = useState(600);
  const [targetPercent, setTargetPercent] = useState(30);
  const [pricingBasis, setPricingBasis] = useState<PricingBasis>("markup");
  const percentMax = pricingBasis === "margin" ? 99 : 500;

  // Value-Based state
  const [perceivedValue, setPerceivedValue] = useState(25000);
  const [valueDiscount, setValueDiscount] = useState(20);
  const [useSavings, setUseSavings] = useState(false);
  const [savingsItems, setSavingsItems] = useState<SavingsItem[]>(DEFAULT_SAVINGS);

  // Penetration state
  const [marketPrice, setMarketPrice] = useState(20000);
  const [penetrationDiscount, setPenetrationDiscount] = useState(25);

  // Competitive state
  const [offers, setOffers] = useState<CompetitorOffer[]>(DEFAULT_OFFERS);
  const [measure, setMeasure] = useState("ml");
  const [yourSize, setYourSize] = useState(1000);

  // Bundle state
  const [bundleItems, setBundleItems] = useState<number[]>([10000, 8000, 5000]);
  const [bundleDiscount, setBundleDiscount] = useState(15);

  // Psychological state
  const [charmBase, setCharmBase] = useState<number | null>(null);

  // Decision state
  const [chosenPrice, setChosenPrice] = useState<number | null>(null);
  const [startupName, setStartupName] = useState("");
  const [productName, setProductName] = useState("");
  const [shareStrategy, setShareStrategy] = useState("Cost-Plus");

  // Two-price test state (null follows the defaults derived below)
  const [twoPriceA, setTwoPriceA] = useState<PricePoint | null>(null);
  const [twoPriceB, setTwoPriceB] = useState<PricePoint | null>(null);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const expectedUnitsError = touched.expectedUnits ? validatePositiveInteger(expectedUnits).error : undefined;
  const targetPercentError = touched.targetPercent ? validatePercentage(targetPercent, { max: percentMax }).error : undefined;
  // The perceived-value input is hidden while savings build the value, so its
  // error must not block the AI explainer then.
  const perceivedValueError = touched.perceivedValue && !useSavings ?validateFinancialAmount(perceivedValue).error : undefined;
  const valueDiscountError = touched.valueDiscount ? validatePercentage(valueDiscount).error : undefined;
  const marketPriceError = touched.marketPrice ? validateFinancialAmount(marketPrice).error : undefined;
  const penetrationDiscountError = touched.penetrationDiscount ? validatePercentage(penetrationDiscount).error : undefined;
  const bundleDiscountError = touched.bundleDiscount ? validatePercentage(bundleDiscount).error : undefined;

  const hasErrors = !!(expectedUnitsError || targetPercentError || perceivedValueError || valueDiscountError || marketPriceError || penetrationDiscountError || bundleDiscountError);

  const safeCostLines = costLines.map((l) => ({
    ...l,
    amount: sanitizeFinancialAmount(l.amount),
    lifeMonths: l.lifeMonths === undefined ? undefined : sanitizePositiveInteger(l.lifeMonths),
    uses: l.uses === undefined ? undefined : sanitizePositiveInteger(l.uses),
  }));
  const costSummary = summarizeCosts(safeCostLines);
  const safeExpectedUnits = sanitizePositiveInteger(expectedUnits);
  const safeTargetPercent = sanitizePercentage(targetPercent, { max: percentMax });
  const safePerceivedValue = sanitizeFinancialAmount(perceivedValue);
  const safeValueDiscount = sanitizePercentage(valueDiscount);
  const safeSavingsItems = savingsItems.map((s) => ({ ...s, amount: sanitizeFinancialAmount(s.amount) }));
  const savingsValue = sumSavings(safeSavingsItems);
  const effectiveValue = useSavings ? savingsValue : safePerceivedValue;
  const safeMarketPrice = sanitizeFinancialAmount(marketPrice);
  const safePenetrationDiscount = sanitizePercentage(penetrationDiscount);
  const safeBundleDiscount = sanitizePercentage(bundleDiscount);

  const handleReset = () => {
    setCostLines(REFILL_STATION_EXAMPLE);
    setUnitName("liter");
    setIsReuseModel(true);
    setExpectedUnits(600);
    setTargetPercent(30);
    setPricingBasis("markup");
    setPerceivedValue(25000);
    setValueDiscount(20);
    setMarketPrice(20000);
    setPenetrationDiscount(25);
    setOffers(DEFAULT_OFFERS);
    setMeasure("ml");
    setYourSize(1000);
    setBundleItems([10000, 8000, 5000]);
    setBundleDiscount(15);
    setCharmBase(null);
    setChosenPrice(null);
    setStartupName("");
    setProductName("");
    setShareStrategy("Cost-Plus");
    setUseSavings(false);
    setSavingsItems(DEFAULT_SAVINGS);
    setTwoPriceA(null);
    setTwoPriceB(null);
    setTouched({});
  };

  const ai = useAiExplain("pricing-calculator");

  const costPlusResult = calculateCostPlus(
    { fixedCosts: costSummary.fixedMonthly, variableCostPerUnit: costSummary.variablePerUnit, expectedUnits: safeExpectedUnits },
    safeTargetPercent,
    pricingBasis
  );
  const outcome = calculateMonthlyOutcome(
    costSummary.fixedMonthly,
    costSummary.variablePerUnit,
    safeExpectedUnits,
    costPlusResult.price
  );

  const valueBased = effectiveValue * (1 - safeValueDiscount / 100);
  const penetrationPrice = calculatePenetrationPrice(safeMarketPrice, safePenetrationDiscount);

  const effectivePrice = sanitizeFinancialAmount(chosenPrice ?? Math.round(costPlusResult.price));

  const safeOffers = offers.map((o) => ({
    ...o,
    price: sanitizeFinancialAmount(o.price),
    size: Math.max(0, Number.isFinite(o.size) ? o.size : 0),
  }));
  const safeYourSize = Math.max(0, Number.isFinite(yourSize) ? yourSize : 0);
  const comparison = comparePerMeasure(safeOffers, effectivePrice, safeYourSize);
  const bundle = calculateBundlePrice(bundleItems.map((v) => sanitizeFinancialAmount(v)), safeBundleDiscount);
  const charmInput = charmBase ?? Math.round(costPlusResult.price);
  const safeCharmInput = sanitizeFinancialAmount(charmInput);
  const charm = suggestCharmPrices(safeCharmInput);

  const ladder = buildPriceLadder({
    unitCost: costPlusResult.unitCost,
    costPlusPrice: costPlusResult.price,
    chosen: effectivePrice,
    // Per-measure prices only scale back to a pack price when your pack has a
    // size; with size 0 the market range would collapse to ₱0 and every price
    // would read "above market".
    ...(comparison.rows.length > 0 && safeYourSize > 0
      ? {
          marketLow: comparison.position.min * safeYourSize,
          marketHigh: comparison.position.max * safeYourSize,
        }
      : {}),
  });
  const decisionCharm = suggestCharmPrices(effectivePrice);
  const chosenBreakeven = calculateBreakeven(
    costSummary.fixedMonthly,
    effectivePrice,
    costSummary.variablePerUnit
  );
  const shareLine = formatShareLine({
    startup: startupName,
    product: productName,
    price: effectivePrice,
    unitName,
    strategy: shareStrategy,
    breakeven: chosenBreakeven,
  });

  const twoPriceResolvedA: PricePoint = {
    price: sanitizeFinancialAmount(twoPriceA?.price ?? effectivePrice),
    volume: twoPriceA?.volume ?? safeExpectedUnits,
  };
  const twoPriceResolvedB: PricePoint = {
    price: sanitizeFinancialAmount(twoPriceB?.price ?? effectivePrice + 5),
    volume: twoPriceB?.volume ?? safeExpectedUnits,
  };
  const twoPriceResult = compareTwoPrices(
    costSummary.fixedMonthly,
    costSummary.variablePerUnit,
    twoPriceResolvedA,
    twoPriceResolvedB
  );

  const addSaving = () => {
    const used = savingsItems
      .map((s) => /^s-(\d+)$/.exec(s.id)?.[1])
      .filter((n): n is string => n !== undefined)
      .map(Number);
    const nextId = `s-${(used.length ? Math.max(...used) : 0) + 1}`;
    setSavingsItems([...savingsItems, { id: nextId, name: "", amount: 0 }]);
  };
  const updateSaving = (id: string, patch: Partial<SavingsItem>) =>
    setSavingsItems(savingsItems.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSaving = (id: string) =>
    setSavingsItems(savingsItems.filter((s) => s.id !== id));

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
                <InfoTooltip content="Pre-loaded with the refill-station practice case from Kevin's CircleWorks talk: ₱30,000 fixed, ₱60 per liter, 600 liters, 30% markup → ₱143 per liter. Markup is profit ÷ cost; margin is profit ÷ price." />
              </CardTitle>
              <CardDescription>
                List every cost, including take-back: containers, collection and cleaning. Then add your markup or margin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={pricingBasis === "markup" ? "default" : "outline"}
                  aria-pressed={pricingBasis === "markup"}
                  onClick={() => {
                    if (pricingBasis !== "markup") {
                      setTargetPercent(convertBasisPercent(targetPercent, pricingBasis, "markup"));
                      setPricingBasis("markup");
                    }
                  }}
                >
                  Markup on cost
                </Button>
                <Button
                  size="sm"
                  variant={pricingBasis === "margin" ? "default" : "outline"}
                  aria-pressed={pricingBasis === "margin"}
                  onClick={() => {
                    if (pricingBasis !== "margin") {
                      setTargetPercent(convertBasisPercent(targetPercent, pricingBasis, "margin"));
                      setPricingBasis("margin");
                    }
                  }}
                >
                  Margin on price
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="selling-unit">Selling unit</Label>
                  <Input id="selling-unit" value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="liter" />
                </div>
                <div className="space-y-2">
                  <Label>Expected units a month</Label>
                  {/* min={0}, not 1: the page validates this field itself with
                      validatePositiveInteger and shows an error at zero.
                      Clamping to 1 here settles a cleared field silently at 1,
                      makes that error unreachable, and prices one unit instead
                      of telling anyone the field is empty. */}
                  <IntegerInput
                    min={0}
                    value={expectedUnits}
                    onChange={setExpectedUnits}
                    onBlur={() => markTouched("expectedUnits")}
                  />
                  {expectedUnitsError && <p className="text-xs text-bad mt-1">{expectedUnitsError}</p>}
                </div>
                <PercentageInput label={pricingBasis === "markup" ? "Markup % (of cost)" : "Margin % (of price)"} value={targetPercent} onChange={setTargetPercent} max={percentMax} onBlur={() => markTouched("targetPercent")} error={targetPercentError} />
              </div>
              <div className="flex items-center gap-3">
                <Switch id="reuse-model" checked={isReuseModel} onCheckedChange={setIsReuseModel} />
                <Label htmlFor="reuse-model">My product is reused, refilled or taken back</Label>
              </div>
              <CostLinesEditor
                lines={costLines}
                onChange={setCostLines}
                isReuseModel={isReuseModel}
                hasTakeBackCosts={costSummary.hasTakeBackCosts}
              />
              <p className="text-sm text-muted-foreground">
                Fixed {formatPHP(costSummary.fixedMonthly)} a month · Variable {formatPHPDetailed(costSummary.variablePerUnit)} per {unitName || "unit"}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ResultCard label={`Price per ${unitName || "unit"}`} value={formatPHP(costPlusResult.price)} variant="success" />
            <ResultCard label="Unit Cost" value={formatPHP(costPlusResult.unitCost)} sublabel="Your price floor at this volume" />
            <ResultCard
              label="Profit per Unit"
              value={formatPHP(costPlusResult.profitPerUnit)}
              sublabel={`${costPlusResult.markupPercent.toFixed(1)}% markup · ${costPlusResult.marginPercent.toFixed(1)}% margin · Each sale adds ${formatPHP(costPlusResult.contributionPerUnit)} toward fixed costs`}
            />
            <ResultCard
              label="Break-even Volume"
              value={costPlusResult.breakeven === Infinity ? "N/A" : formatNumber(costPlusResult.breakeven)}
              sublabel={`${unitName || "unit"}s a month`}
            />
            <ResultCard label="Total Monthly Cost" value={formatPHP(outcome.totalCost)} />
            <ResultCard
              label="Monthly Profit"
              value={formatPHP(outcome.profit)}
              variant={outcome.profit < 0 ? "danger" : "success"}
              sublabel={`at ${formatNumber(safeExpectedUnits)} ${unitName || "unit"}s`}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            A {costPlusResult.markupPercent.toFixed(1)}% markup is a {costPlusResult.marginPercent.toFixed(1)}% margin. When someone says &quot;30% margin&quot;, ask: of cost, or of price?
          </p>
          {costSummary.grantFixedMonthly > 0 || costSummary.grantVariablePerUnit > 0 ? (
            <p className="text-sm text-muted-foreground">
              The grant pays {formatPHP(costSummary.grantFixedMonthly)} a month and {formatPHPDetailed(costSummary.grantVariablePerUnit)} per {unitName || "unit"} today. Your price already covers these, so it still works after the grant ends. While the grant pays, your monthly profit is {formatPHP(outcome.profit + costSummary.grantFixedMonthly + costSummary.grantVariablePerUnit * safeExpectedUnits)}.
            </p>
          ) : null}
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
              <div className="flex items-center gap-3">
                <Switch id="use-savings" checked={useSavings} onCheckedChange={setUseSavings} />
                <Label htmlFor="use-savings">Build it from what the customer saves</Label>
              </div>
              {useSavings ? (
                <>
                  <div className="space-y-3">
                    {savingsItems.map((s) => (
                      <div key={s.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end border-b border-rule pb-3">
                        <div className="sm:col-span-7">
                          <Input
                            aria-label="Saving name"
                            value={s.name}
                            onChange={(e) => updateSaving(s.id, { name: e.target.value })}
                            placeholder="What the customer saves"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <CurrencyInput
                            label="₱ saved a month"
                            value={s.amount}
                            onChange={(v) => updateSaving(s.id, { amount: v })}
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end pb-1">
                          <Button variant="ghost" size="icon" aria-label="Remove saving" onClick={() => removeSaving(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {savingsItems.length < 10 && (
                      <Button variant="outline" size="sm" onClick={addSaving}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add saving
                      </Button>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Total saved: {formatPHP(savingsValue)} a month
                    </p>
                  </div>
                  <PercentageInput label="Discount from Value %" value={valueDiscount} onChange={setValueDiscount} onBlur={() => markTouched("valueDiscount")} error={valueDiscountError} />
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CurrencyInput label="Customer Perceived Value" value={perceivedValue} onChange={setPerceivedValue} onBlur={() => markTouched("perceivedValue")} error={perceivedValueError} />
                  <PercentageInput label="Discount from Value %" value={valueDiscount} onChange={setValueDiscount} onBlur={() => markTouched("valueDiscount")} error={valueDiscountError} />
                </div>
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ResultCard label="Perceived Value" value={formatPHP(effectiveValue)} />
            <ResultCard label="Suggested Price" value={formatPHP(valueBased)} variant="success" />
            <ResultCard label="Customer Surplus" value={formatPHP(effectiveValue - valueBased)} sublabel="Value the customer keeps" />
            <ResultCard label="Customer ROI" value={valueBased > 0 ? `${(effectiveValue / valueBased).toFixed(1)}×` : "—"} sublabel="Value for every ₱1 they pay" />
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
          <CompetitiveTab
            offers={offers}
            onOffersChange={setOffers}
            measure={measure}
            onMeasureChange={setMeasure}
            yourSize={yourSize}
            onYourSizeChange={setYourSize}
            yourPrice={effectivePrice}
            unitName={unitName}
            comparison={comparison}
          />
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
              <CurrencyInput label="Price to round" value={charmInput} onChange={setCharmBase} />
              {charmBase !== null && (
                <Button variant="ghost" size="sm" onClick={() => setCharmBase(null)}>
                  Use my cost-plus price
                </Button>
              )}
            </CardContent>
          </Card>
          {charm !== null ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ResultCard label="Your Price" value={formatPHP(safeCharmInput)} />
              <ResultCard
                label="Round Down"
                value={formatPHP(charm.down)}
                variant={charm.down >= safeCharmInput * 0.95 ? "success" : "warning"}
                sublabel={
                  charm.down >= safeCharmInput * 0.95
                    ? `Feels cheaper than ${formatPHP(charm.down + 1)}`
                    : `Cuts ${(100 - (charm.down / safeCharmInput) * 100).toFixed(0)}% off your price — consider rounding up`
                }
              />
              <ResultCard label="Round Up" value={formatPHP(charm.up)} sublabel="More margin, still ends in 9" />
            </div>
          ) : (
            <ResultCard label="Charm Price" value="None" sublabel="Below ₱9 there is no lower price ending in 9. Keep it round, or sell two for ₱9." />
          )}
        </TabsContent>
      </Tabs>

      <PriceDecision
        ladder={ladder}
        chosenInput={effectivePrice}
        onChosenChange={setChosenPrice}
        followsCostPlus={chosenPrice === null}
        onUseCostPlus={() => setChosenPrice(null)}
        charm={decisionCharm}
        unitName={unitName}
        startup={startupName}
        onStartupChange={setStartupName}
        product={productName}
        onProductChange={setProductName}
        strategy={shareStrategy}
        onStrategyChange={setShareStrategy}
        shareLine={shareLine}
      />

      <TwoPriceTest
        unitName={unitName}
        a={twoPriceResolvedA}
        b={twoPriceResolvedB}
        onAChange={setTwoPriceA}
        onBChange={setTwoPriceB}
        result={twoPriceResult}
      />

      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        disabled={hasErrors}
        onExplain={() =>
          ai.explain({
            costPlus: {
              unitName,
              isReuseModel,
              costLines: safeCostLines.map((l) => ({
                name: l.name,
                category: l.category,
                behavior: l.behavior,
                amount: l.amount,
                lifeMonths: l.lifeMonths,
                uses: l.uses,
                grantFunded: l.grantFunded,
              })),
              expectedUnits: safeExpectedUnits,
              basis: pricingBasis,
              percent: safeTargetPercent,
              unitCost: costPlusResult.unitCost,
              price: costPlusResult.price,
              profitPerUnit: costPlusResult.profitPerUnit,
              markupPercent: costPlusResult.markupPercent,
              marginPercent: costPlusResult.marginPercent,
              // JSON turns Infinity into null; say what it means instead.
              breakeven: Number.isFinite(costPlusResult.breakeven)
                ? costPlusResult.breakeven
                : "never (price does not exceed variable cost)",
              fixedMonthly: costSummary.fixedMonthly,
              variablePerUnit: costSummary.variablePerUnit,
              grantFixedMonthly: costSummary.grantFixedMonthly,
              grantVariablePerUnit: costSummary.grantVariablePerUnit,
              totalMonthlyCost: outcome.totalCost,
              monthlyProfit: outcome.profit,
            },
            valueBased: {
              useSavings,
              savingsItems: safeSavingsItems.map((s) => ({ name: s.name, amount: s.amount })),
              perceivedValue: effectiveValue,
              valueDiscount: safeValueDiscount,
              suggestedPrice: valueBased,
            },
            penetration: { marketPrice: safeMarketPrice, penetrationDiscount: safePenetrationDiscount, entryPrice: penetrationPrice },
            competitive: {
              measure,
              yourSize: safeYourSize,
              yourPerMeasure: comparison.yourPerMeasure,
              rows: comparison.rows,
              ...comparison.position,
            },
            bundle: { bundleItems: bundleItems.map((v) => sanitizeFinancialAmount(v)), bundleDiscount: safeBundleDiscount, ...bundle },
            psychological: { price: safeCharmInput, down: charm?.down ?? null, up: charm?.up ?? null },
            decision: {
              chosenPrice: effectivePrice,
              verdict: ladder.verdict,
              breakeven: Number.isFinite(chosenBreakeven)
                ? chosenBreakeven
                : "never (price does not exceed variable cost)",
              strategy: shareStrategy,
            },
            twoPriceTest: {
              a: twoPriceResolvedA,
              b: twoPriceResolvedB,
              ...twoPriceResult,
              volumeBToMatchA: Number.isFinite(twoPriceResult.volumeBToMatchA)
                ? twoPriceResult.volumeBToMatchA
                : "never (price B does not exceed variable cost)",
            },
          })
        }
        onDismiss={ai.reset}
      />

      <EcosystemBanner toolId="pricing-calculator" />

      <RelatedTools currentToolId="pricing-calculator" />
    </div>
  );
}

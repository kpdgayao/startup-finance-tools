"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/shared/currency-input";
import { IntegerInput } from "@/components/shared/integer-input";
import { ResultCard } from "@/components/shared/result-card";
import { formatNumber, formatPHP } from "@/lib/utils";
import { compareTwoPrices, type PricePoint } from "@/lib/calculations/pricing";

export function TwoPriceTest({
  unitName,
  a,
  b,
  onAChange,
  onBChange,
  result,
}: {
  unitName: string;
  a: PricePoint;
  b: PricePoint;
  onAChange: (p: PricePoint) => void;
  onBChange: (p: PricePoint) => void;
  result: ReturnType<typeof compareTwoPrices>;
}) {
  const unitLabel = unitName || "unit";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test two prices</CardTitle>
        <CardDescription>Try two price points in your pilot before you settle on one.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3 rounded border border-rule p-3">
            <p className="text-sm font-medium">Price A</p>
            <CurrencyInput
              id="price-a"
              label={`Price per ${unitLabel}`}
              min={0}
              value={a.price}
              onChange={(v) => onAChange({ price: v, volume: a.volume })}
            />
            <div className="space-y-2">
              <Label htmlFor="price-a-units">Units a month</Label>
              <IntegerInput
                id="price-a-units"
                min={0}
                value={a.volume}
                onChange={(v) => onAChange({ price: a.price, volume: v })}
              />
            </div>
          </div>
          <div className="space-y-3 rounded border border-rule p-3">
            <p className="text-sm font-medium">Price B</p>
            <CurrencyInput
              id="price-b"
              label={`Price per ${unitLabel}`}
              min={0}
              value={b.price}
              onChange={(v) => onBChange({ price: v, volume: b.volume })}
            />
            <div className="space-y-2">
              <Label htmlFor="price-b-units">Units a month</Label>
              <IntegerInput
                id="price-b-units"
                min={0}
                value={b.volume}
                onChange={(v) => onBChange({ price: b.price, volume: v })}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResultCard label="Profit at A" value={formatPHP(result.profitA)} />
          <ResultCard
            label="Profit at B"
            value={formatPHP(result.profitB)}
            sublabel={`${result.difference >= 0 ? "+" : "−"}${formatPHP(Math.abs(result.difference))} vs A`}
          />
          <ResultCard
            label="Volume B needs to match A"
            value={result.volumeBToMatchA === Infinity ? "N/A" : formatNumber(result.volumeBToMatchA)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

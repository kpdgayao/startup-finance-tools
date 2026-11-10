"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyInput } from "@/components/shared/currency-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatPHP, formatPHPDetailed } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type { CompetitorOffer, PerMeasureRow } from "@/lib/calculations/pricing";

export interface CompetitiveComparison {
  yourPerMeasure: number;
  rows: PerMeasureRow[];
  position: { min: number; max: number; average: number; median: number };
}

export function CompetitiveTab({
  offers,
  onOffersChange,
  measure,
  onMeasureChange,
  yourSize,
  onYourSizeChange,
  yourPrice,
  unitName,
  comparison,
}: {
  offers: CompetitorOffer[];
  onOffersChange: (offers: CompetitorOffer[]) => void;
  measure: string;
  onMeasureChange: (measure: string) => void;
  yourSize: number;
  onYourSizeChange: (size: number) => void;
  yourPrice: number;
  unitName: string;
  comparison: CompetitiveComparison;
}) {
  const updateOffer = (id: string, patch: Partial<CompetitorOffer>) => {
    onOffersChange(offers.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const removeOffer = (id: string) => {
    onOffersChange(offers.filter((o) => o.id !== id));
  };

  const addOffer = () => {
    const used = new Set(offers.map((o) => o.id));
    let n = offers.length + 1;
    let id = `c-${n}`;
    while (used.has(id)) {
      n += 1;
      id = `c-${n}`;
    }
    // Default the size to your own pack, so an offer entered with just a
    // price compares pack-for-pack instead of being skipped for size 0.
    onOffersChange([...offers, { id, name: "", price: 0, size: yourSize > 0 ? yourSize : 1 }]);
  };

  const unitLabel = unitName || "unit";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Competitive Pricing
            <InfoTooltip content="Analyze competitor prices to position your product. Price at, above, or below the market average." />
          </CardTitle>
          <CardDescription>
            Compare per ml, not per pack. Enter what customers buy now, including the sachet you replace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="compare-measure">Compare per</Label>
              <Input
                id="compare-measure"
                value={measure}
                onChange={(e) => onMeasureChange(e.target.value)}
                placeholder="ml"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="your-size">
                Your {unitLabel} in {measure}
              </Label>
              <Input
                id="your-size"
                type="number"
                inputMode="decimal"
                min="0"
                value={yourSize}
                onChange={(e) => onYourSizeChange(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Your price</Label>
              <p className="text-sm h-9 flex items-center">
                {formatPHP(yourPrice)}{" "}
                <span className="text-muted-foreground">per {unitLabel}</span>
              </p>
            </div>
          </div>

          {offers.map((offer) => (
            <div
              key={offer.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end border-b border-rule pb-3"
            >
              <div className="sm:col-span-5 space-y-2">
                <Label htmlFor={`offer-name-${offer.id}`}>Offer</Label>
                <Input
                  id={`offer-name-${offer.id}`}
                  value={offer.name}
                  onChange={(e) => updateOffer(offer.id, { name: e.target.value })}
                  placeholder="What they sell"
                />
              </div>
              <div className="sm:col-span-3">
                <CurrencyInput
                  label="Price"
                  value={offer.price}
                  onChange={(v) => updateOffer(offer.id, { price: v })}
                />
              </div>
              <div className="sm:col-span-3 space-y-2">
                <Label htmlFor={`offer-size-${offer.id}`}>Size ({measure})</Label>
                <Input
                  id={`offer-size-${offer.id}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={offer.size}
                  onChange={(e) => updateOffer(offer.id, { size: Number(e.target.value) })}
                />
              </div>
              {offers.length > 1 && (
                <div className="sm:col-span-1 flex justify-end pb-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove offer"
                    onClick={() => removeOffer(offer.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {offers.length < 10 && (
            <Button variant="outline" size="sm" onClick={addOffer}>
              <Plus className="h-4 w-4 mr-2" />
              Add offer
            </Button>
          )}
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Offer</TableHead>
            <TableHead>₱ per {measure}</TableHead>
            <TableHead>Verdict</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>You</TableCell>
            <TableCell>{formatPHPDetailed(comparison.yourPerMeasure)}</TableCell>
            <TableCell>—</TableCell>
          </TableRow>
          {comparison.rows.map((row) => (
            <TableRow key={row.id}>
              {/* TableCell is nowrap by default; at phone width that pushed the
                  verdict — the column that matters — off the right edge. */}
              <TableCell className="whitespace-normal">{row.name || "Offer"}</TableCell>
              <TableCell>{formatPHPDetailed(row.pricePerMeasure)}</TableCell>
              {/* Under half a percent rounds to 0%, so call it the same price
                  rather than "0% more expensive" in the warning colour. */}
              <TableCell
                className={cn(
                  "whitespace-normal",
                  Math.abs(row.differencePercent) < 0.5
                    ? "text-muted-foreground"
                    : row.differencePercent < 0
                      ? "text-good"
                      : "text-warn"
                )}
              >
                {Math.abs(row.differencePercent) < 0.5
                  ? "Same price"
                  : row.differencePercent < 0
                    ? `You're ${Math.abs(row.differencePercent).toFixed(0)}% cheaper`
                    : `You're ${row.differencePercent.toFixed(0)}% more expensive`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {comparison.rows.some((row) => row.differencePercent >= 0.5) && (
        <p className="text-sm text-muted-foreground">
          Where you lose on price, win on a reason: a deposit back, points, quality, or convenience.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ResultCard label={`Lowest per ${measure}`} value={formatPHPDetailed(comparison.position.min)} />
        <ResultCard label={`Highest per ${measure}`} value={formatPHPDetailed(comparison.position.max)} />
        <ResultCard label={`Average per ${measure}`} value={formatPHPDetailed(comparison.position.average)} variant="success" />
        <ResultCard label={`Median per ${measure}`} value={formatPHPDetailed(comparison.position.median)} />
      </div>
    </>
  );
}

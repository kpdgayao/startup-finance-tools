"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";
import { cn, formatPHP } from "@/lib/utils";
import { Copy } from "lucide-react";
import { buildPriceLadder, PRICING_STRATEGIES } from "@/lib/calculations/pricing";

const VERDICT_COPY: Record<
  ReturnType<typeof buildPriceLadder>["verdict"],
  { className: string; text: string }
> = {
  "below-cost": { className: "text-bad", text: "Below your unit cost. Every sale loses money." },
  "in-range": { className: "text-good", text: "Covers your full cost and stays within what customers pay now." },
  "above-market": {
    className: "text-warn",
    text: "Above every alternative. You need a clear reason: proof, quality, convenience or a deposit back.",
  },
};

export function PriceDecision({
  ladder,
  chosenInput,
  onChosenChange,
  followsCostPlus,
  onUseCostPlus,
  charm,
  unitName,
  startup,
  onStartupChange,
  product,
  onProductChange,
  strategy,
  onStrategyChange,
  shareLine,
}: {
  ladder: ReturnType<typeof buildPriceLadder>;
  chosenInput: number;
  onChosenChange: (n: number) => void;
  followsCostPlus: boolean;
  onUseCostPlus: () => void;
  charm: { down: number; up: number } | null;
  unitName: string;
  startup: string;
  onStartupChange: (s: string) => void;
  product: string;
  onProductChange: (s: string) => void;
  strategy: string;
  onStrategyChange: (s: string) => void;
  shareLine: string;
}) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const shareRef = useRef<HTMLElement>(null);

  // When the clipboard is unavailable (an http page, or a browser that
  // refuses), select the line instead so Ctrl+C / long-press copies it.
  const selectShareLine = () => {
    const el = shareRef.current;
    const selection = window.getSelection();
    if (!el || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const copy = () => {
    if (!navigator.clipboard) {
      selectShareLine();
      return;
    }
    navigator.clipboard
      .writeText(shareLine)
      .then(() => {
        setCopied(true);
        clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(selectShareLine);
  };

  const unitLabel = unitName || "unit";
  const verdict = VERDICT_COPY[ladder.verdict];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick your price</CardTitle>
        <CardDescription>
          Somewhere between your cost floor and what customers pay now. Then test it in your pilot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CurrencyInput
          label={`Your price per ${unitLabel}`}
          value={chosenInput}
          onChange={onChosenChange}
        />
        {!followsCostPlus && (
          <Button variant="ghost" size="sm" onClick={onUseCostPlus}>
            Use my cost-plus price
          </Button>
        )}
        {charm !== null && (
          <p className="text-sm text-muted-foreground">
            Charm options: {formatPHP(charm.down)} or {formatPHP(charm.up)}
          </p>
        )}

        <ol>
          {ladder.anchors.map((anchor) => (
            <li
              key={anchor.label}
              className={cn(
                "flex justify-between border-b border-rule py-1.5 text-sm tabular",
                anchor.isChosen && "font-semibold"
              )}
            >
              <span>{anchor.label}</span>
              <span>{formatPHP(anchor.price)}</span>
            </li>
          ))}
        </ol>

        <p className={cn("text-sm", verdict.className)}>{verdict.text}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startup-name">Startup</Label>
            <Input
              id="startup-name"
              value={startup}
              onChange={(e) => onStartupChange(e.target.value)}
              placeholder="Your startup"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-name">Product</Label>
            <Input
              id="product-name"
              value={product}
              onChange={(e) => onProductChange(e.target.value)}
              placeholder="Your product"
            />
          </div>
          <div className="space-y-2">
            <Label>Strategy</Label>
            <Select value={strategy} onValueChange={onStrategyChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRICING_STRATEGIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
          <code ref={shareRef} className="block break-words rounded border border-rule bg-muted p-3 text-sm flex-1">
            {shareLine}
          </code>
          <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
            <Copy className="h-4 w-4 mr-2" />
            {copied ? "Copied" : "Copy for the chat"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";
import { IntegerInput } from "@/components/shared/integer-input";
import { Plus, Trash2 } from "lucide-react";
import {
  COST_CATEGORY_LABELS,
  COST_BEHAVIOR_LABELS,
  MISSED_COSTS,
  type CostLine,
  type CostCategory,
  type CostBehavior,
} from "@/lib/calculations/pricing-costs";

const AMOUNT_LABEL: Record<CostBehavior, string> = {
  fixed: "₱ per month",
  variable: "₱ per unit",
  "one-time": "₱ total",
  "per-use": "₱ per item",
};

export function CostLinesEditor({
  lines,
  onChange,
  isReuseModel,
  hasTakeBackCosts,
}: {
  lines: CostLine[];
  onChange: (lines: CostLine[]) => void;
  isReuseModel: boolean;
  hasTakeBackCosts: boolean;
}) {
  const idRef = useRef(0);
  const nextId = () => {
    idRef.current += 1;
    return `line-${idRef.current}`;
  };

  const updateLine = (id: string, patch: Partial<CostLine>) => {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    onChange(lines.filter((l) => l.id !== id));
  };

  const addLine = () => {
    onChange([
      ...lines,
      { id: nextId(), name: "", category: "overhead", behavior: "fixed", amount: 0 },
    ]);
  };

  const addMissed = (m: Omit<CostLine, "id" | "amount">) => {
    onChange([...lines, { ...m, id: nextId(), amount: 0 }]);
  };

  const handleBehaviorChange = (line: CostLine, behavior: CostBehavior) => {
    const patch: Partial<CostLine> = { behavior };
    if (behavior === "one-time" && line.lifeMonths === undefined) patch.lifeMonths = 12;
    if (behavior === "per-use" && line.uses === undefined) patch.uses = 10;
    updateLine(line.id, patch);
  };

  return (
    <div className="space-y-4">
      {lines.map((line) => (
        // Two rows per line: what the cost is, then what it costs. One
        // 12-column row squeezed "Grant pays this now" into a single column,
        // where it wrapped to four lines and made every line tall.
        <div key={line.id} className="space-y-2 border-b border-rule pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-5">
            <Input
              aria-label="Cost name"
              value={line.name}
              onChange={(e) => updateLine(line.id, { name: e.target.value })}
              placeholder="Cost name"
            />
          </div>
          <div className="sm:col-span-3">
            <Select
              value={line.category}
              onValueChange={(v) => updateLine(line.id, { category: v as CostCategory })}
            >
              <SelectTrigger aria-label="Cost category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(COST_CATEGORY_LABELS) as CostCategory[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {COST_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-4">
            <Select
              value={line.behavior}
              onValueChange={(v) => handleBehaviorChange(line, v as CostBehavior)}
            >
              <SelectTrigger aria-label="Cost behavior" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(COST_BEHAVIOR_LABELS) as CostBehavior[]).map((b) => (
                  <SelectItem key={b} value={b}>
                    {COST_BEHAVIOR_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-44">
            <CurrencyInput
              label={AMOUNT_LABEL[line.behavior]}
              value={line.amount}
              onChange={(v) => updateLine(line.id, { amount: v })}
            />
          </div>
          {(line.behavior === "one-time" || line.behavior === "per-use") && (
            <div className="w-24 space-y-2">
              <Label>{line.behavior === "one-time" ? "Months" : "Uses"}</Label>
              <IntegerInput
                min={1}
                aria-label={line.behavior === "one-time" ? "Months" : "Uses"}
                value={
                  line.behavior === "one-time"
                    ? line.lifeMonths ?? 12
                    : line.uses ?? 10
                }
                onChange={(v) =>
                  updateLine(
                    line.id,
                    line.behavior === "one-time" ? { lifeMonths: v } : { uses: v }
                  )
                }
              />
            </div>
          )}
          <div className="flex flex-1 items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`grant-${line.id}`}
                checked={!!line.grantFunded}
                onCheckedChange={(v) => updateLine(line.id, { grantFunded: v === true })}
              />
              <Label htmlFor={`grant-${line.id}`} className="whitespace-nowrap text-xs font-normal cursor-pointer">
                Grant pays this now
              </Label>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove cost"
              onClick={() => removeLine(line.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          </div>
        </div>
      ))}

      {lines.length < 30 && (
        <Button variant="outline" size="sm" onClick={addLine}>
          <Plus className="h-4 w-4 mr-2" />
          Add cost
        </Button>
      )}

      <div className="space-y-2 pt-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Commonly missed costs
        </p>
        <div className="flex flex-wrap gap-2">
          {MISSED_COSTS.map((m) => (
            <Button
              key={m.name}
              variant="outline"
              size="sm"
              disabled={lines.some((l) => l.name === m.name)}
              onClick={() => addMissed(m)}
            >
              + {m.name}
            </Button>
          ))}
        </div>
      </div>

      {isReuseModel && !hasTakeBackCosts && (
        <p className="text-sm text-warn">
          No container, collection or cleaning costs yet. Linear businesses never pay these; reuse businesses always do.
        </p>
      )}
    </div>
  );
}

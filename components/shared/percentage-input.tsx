"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PercentageInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
}

export function PercentageInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.1,
  id,
}: PercentageInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          className="pr-8"
          value={value || ""}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onChange(isNaN(val) ? 0 : Math.min(max, Math.max(min, val)));
          }}
          placeholder="0"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          %
        </span>
      </div>
    </div>
  );
}

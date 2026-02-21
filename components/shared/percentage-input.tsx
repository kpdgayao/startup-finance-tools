"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

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
  const [clamped, setClamped] = useState(false);
  const clampTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
          className={cn("pr-8", clamped && "border-red-500/50")}
          value={value || ""}
          onChange={(e) => {
            const raw = parseFloat(e.target.value);
            const val = isNaN(raw) ? 0 : raw;
            const clampedVal = Math.min(max, Math.max(min, val));
            const wasClamped = clampedVal !== val && !isNaN(raw);

            if (wasClamped) {
              setClamped(true);
              clearTimeout(clampTimer.current);
              clampTimer.current = setTimeout(() => setClamped(false), 1500);
            }

            onChange(clampedVal);
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

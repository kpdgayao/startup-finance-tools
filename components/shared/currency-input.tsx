"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber, parseNumericInput } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useCallback, useState, useRef } from "react";

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  id?: string;
  min?: number;
  max?: number;
}

export function CurrencyInput({
  label,
  value,
  onChange,
  placeholder = "0",
  id,
  min,
  max,
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(value ? String(value) : "");
  const [clamped, setClamped] = useState(false);
  const clampTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplayValue(raw);
      let parsed = parseNumericInput(raw);

      let wasClamped = false;
      if (min !== undefined && parsed < min) {
        parsed = min;
        wasClamped = true;
      }
      if (max !== undefined && parsed > max) {
        parsed = max;
        wasClamped = true;
      }

      if (wasClamped) {
        setClamped(true);
        clearTimeout(clampTimer.current);
        clampTimer.current = setTimeout(() => setClamped(false), 1500);
      }

      onChange(parsed);
    },
    [onChange, min, max]
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
    setDisplayValue(value ? String(value) : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          ₱
        </span>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          className={cn("pl-7", clamped && "border-red-500/50")}
          value={focused ? displayValue : value ? formatNumber(value) : ""}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

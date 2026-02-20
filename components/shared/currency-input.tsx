"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber, parseNumericInput } from "@/lib/utils";
import { useCallback, useState } from "react";

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  id?: string;
}

export function CurrencyInput({
  label,
  value,
  onChange,
  placeholder = "0",
  id,
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(value ? String(value) : "");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplayValue(raw);
      const parsed = parseNumericInput(raw);
      onChange(parsed);
    },
    [onChange]
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
          className="pl-7"
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

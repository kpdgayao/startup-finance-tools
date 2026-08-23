"use client";

import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface IntegerInputProps {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  /** Runs after the value has settled — used for touched-field validation. */
  onBlur?: () => void;
}

/**
 * A whole-number field you can actually clear and retype.
 *
 * THE BUG THIS EXISTS TO FIX: a controlled input written as
 * `value={n} onChange={e => set(Math.max(1, Number(e.target.value) || 1))}`
 * cannot be emptied. Deleting the last character makes the raw value "",
 * `Number("")` is 0, `|| 1` turns it into 1, and React immediately re-renders
 * the field as "1". On a phone — where you cannot easily select-all — the only
 * way to enter 3 is to put the caret before the stubborn 1 and type, giving
 * "13". An organiser reported exactly that.
 *
 * The fix is to let the field hold a DRAFT string, including an empty one,
 * while it is being edited, and only settle it on blur. `value` stays the last
 * valid number throughout, so the quote never sees NaN or a half-typed figure.
 *
 * `type="text"` with `inputMode="numeric"`, matching CurrencyInput: it brings
 * up the numeric keypad without the spinners, the scroll-wheel capture, or the
 * empty-string quirks that `type="number"` carries on mobile browsers.
 */
export function IntegerInput({
  value,
  onChange,
  id,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  placeholder,
  className,
  "aria-label": ariaLabel,
  onBlur: onBlurProp,
}: IntegerInputProps) {
  // null means "not being edited — show the canonical value".
  const [draft, setDraft] = useState<string | null>(null);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value.replace(/[^0-9]/g, "");
      setDraft(raw);

      // An empty field is a legitimate mid-edit state, so the last good value
      // is kept rather than being reset to the minimum under the user's hands.
      if (raw === "") return;

      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) return;

      // Clamped to `max` while typing, but NOT up to `min`: nudging 0 to 1
      // mid-keystroke fights someone typing "0" as the first digit of "05".
      // `min` is applied on blur, once they have finished.
      onChange(Math.min(max, parsed));
    },
    [max, onChange]
  );

  const handleBlur = useCallback(() => {
    if (draft !== null) {
      const parsed = Number.parseInt(draft, 10);
      onChange(
        Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : Math.max(min, value)
      );
    }
    setDraft(null);
    onBlurProp?.();
  }, [draft, max, min, onBlurProp, onChange, value]);

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      className={cn(className)}
      value={draft ?? String(value)}
      placeholder={placeholder}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

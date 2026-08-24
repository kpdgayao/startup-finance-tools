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
 * the field as "1". On a phone — where select-all is awkward — the only way to
 * enter 3 is to put the caret before the stubborn 1 and type, giving "13". An
 * organizer reported exactly that.
 *
 * The fix is to let the field hold a DRAFT string, the empty one included,
 * while it is being edited, and settle it on blur. The bound value stays a
 * valid number throughout, so nothing downstream sees NaN or a half-typed one.
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
  const [committed, setCommitted] = useState(value);

  // A value change that did not come from this field — a reset, or an AI draft
  // being applied — must win over a draft in progress. Without this the draft
  // masks the new value and then overwrites it on blur. Adjusting state during
  // render is React's documented way to react to a changed prop; an effect
  // would render the stale value first.
  if (value !== committed) {
    setCommitted(value);
    if (draft !== null) setDraft(null);
  }

  const commit = useCallback(
    (next: number) => {
      setCommitted(next);
      onChange(next);
    },
    [onChange]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      // A decimal point is KEPT in the draft and truncated at for the value.
      //
      // Rejecting it outright looks tidier and is a ten-times pricing bug:
      // someone typing 2 . 5 has the dot swallowed, the 5 lands against the 2,
      // and they have entered 25 while believing they entered two and a half.
      // Letting the dot show — and settling to 2 on blur — means what they see
      // matches what they typed, and what they get matches an integer field.
      const raw = event.target.value.match(/^\d*\.?\d*/)?.[0] ?? "";
      setDraft(raw);

      // An empty field, and a lone ".", are legitimate mid-edit states, so the
      // last good value is kept rather than being reset under the user's hands.
      const whole = raw.split(".")[0];
      if (whole === "") return;

      const parsed = Number.parseInt(whole, 10);
      if (!Number.isFinite(parsed)) return;

      // Clamped both ways as it is typed. The draft keeps whatever was typed,
      // so entering "05" still reads naturally, but a bare 0 never escapes
      // into a parent that divides by it.
      commit(Math.min(max, Math.max(min, parsed)));
    },
    [commit, max, min]
  );

  const handleBlur = useCallback(() => {
    if (draft !== null) {
      // parseInt truncates at the decimal point, so a draft of "2.5" settles
      // to 2 — the same figure the field was pricing while it was open.
      const parsed = Number.parseInt(draft, 10);
      // An empty field settles to the minimum, not to whatever was there
      // before. Several callers use their minimum as a meaningful default —
      // 0 paid seats means "use the participant count" — and refilling the old
      // number would make clearing the field impossible to act on.
      commit(Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min);
    }
    setDraft(null);
    onBlurProp?.();
  }, [commit, draft, max, min, onBlurProp]);

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

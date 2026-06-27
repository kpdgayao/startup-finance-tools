export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_PHP_AMOUNT = 1_000_000_000_000; // 1 trillion PHP

export function validateFinancialAmount(
  value: number,
  options?: { min?: number; max?: number; allowZero?: boolean }
): ValidationResult {
  const min = options?.min ?? 0;
  const max = options?.max ?? MAX_PHP_AMOUNT;
  const allowZero = options?.allowZero ?? true;

  if (!Number.isFinite(value)) {
    return { valid: false, error: "Please enter a valid number" };
  }

  if (value < min) {
    return {
      valid: false,
      error: `Must be at least ${min.toLocaleString("en-PH")}`,
    };
  }

  if (value > max) {
    return {
      valid: false,
      error: `Must be at most ${max.toLocaleString("en-PH")}`,
    };
  }

  if (!allowZero && value === 0) {
    return { valid: false, error: "Cannot be zero" };
  }

  return { valid: true };
}

export function validatePercentage(
  value: number,
  options?: { min?: number; max?: number }
): ValidationResult {
  const min = options?.min ?? 0;
  const max = options?.max ?? 100;

  if (!Number.isFinite(value)) {
    return { valid: false, error: "Please enter a valid number" };
  }

  if (value < min) {
    return { valid: false, error: `Must be at least ${min}%` };
  }

  if (value > max) {
    return { valid: false, error: `Must be at most ${max}%` };
  }

  return { valid: true };
}

export function validatePositiveInteger(
  value: number,
  options?: { allowZero?: boolean }
): ValidationResult {
  const allowZero = options?.allowZero ?? false;

  if (!Number.isFinite(value)) {
    return { valid: false, error: "Please enter a valid number" };
  }

  if (allowZero && value === 0) {
    return { valid: true };
  }

  if (value < 1) {
    return { valid: false, error: "Must be at least 1" };
  }

  if (!Number.isInteger(value)) {
    return { valid: false, error: "Must be a whole number" };
  }

  return { valid: true };
}

export function sanitizeFinancialAmount(
  value: number,
  options?: { min?: number; max?: number }
): number {
  const min = options?.min ?? 0;
  const max = options?.max ?? MAX_PHP_AMOUNT;
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function sanitizePercentage(
  value: number,
  options?: { min?: number; max?: number }
): number {
  const min = options?.min ?? 0;
  const max = options?.max ?? 100;
  if (!Number.isFinite(value)) return Math.min(max, Math.max(min, 0));
  return Math.min(max, Math.max(min, value));
}

export function sanitizePositiveInteger(
  value: number,
  options?: { allowZero?: boolean }
): number {
  const floor = options?.allowZero ? 0 : 1;
  if (!Number.isFinite(value)) return floor;
  return Math.max(floor, Math.floor(value));
}

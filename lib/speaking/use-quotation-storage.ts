"use client";

import { useSyncExternalStore } from "react";
import type { FieldId, IntakeDraft } from "./intake-state";

export const STORAGE_KEY = "sft-speaker-quotation";

export interface StoredQuotation {
  form: Record<string, unknown>;
  chosenDate: string | null;
  draft: IntakeDraft | null;
  edits: FieldId[];
}

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: StoredQuotation | null = null;

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Returns a stable object identity for an unchanged string.
 *
 * `useSyncExternalStore` compares snapshots by reference, so re-parsing the
 * JSON on every render would hand it a new object each time and loop forever.
 */
function getSnapshot(): StoredQuotation | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // A private window, or a browser set to block site data, throws on access
    // rather than returning null. The page works; nothing persists.
    return null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = raw ? (JSON.parse(raw) as StoredQuotation) : null;
    } catch {
      cachedValue = null;
    }
  }
  return cachedValue;
}

/**
 * Nothing is restored during the server render.
 *
 * This is read once, in a `useState` initialiser, rather than in an effect —
 * `compliance-checklist` and `fundraising-guide` read localStorage in an
 * effect and then setState, which is what makes `pnpm lint` fail with
 * `react-hooks/set-state-in-effect` in three places today.
 */
const getServerSnapshot = (): StoredQuotation | null => null;

export function useStoredQuotation(): StoredQuotation | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function writeStoredQuotation(value: StoredQuotation): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    return; // Quota, or blocked storage. Not worth interrupting the quote for.
  }
  listeners.forEach((fn) => fn());
}

export function clearStoredQuotation(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  listeners.forEach((fn) => fn());
}

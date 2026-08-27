"use client";

import { useSyncExternalStore } from "react";
import type { FieldId, IntakeDraft } from "./intake-state";

export const STORAGE_KEY = "sft-speaker-quotation";

export interface StoredQuotation {
  /**
   * Which state the organizer was last in.
   *
   * Stored rather than inferred. Deriving it from "is anything stored" meant
   * that someone filling in the full form flipped into the reading panel the
   * moment they changed their FIRST field — the write made the store
   * non-empty, and the page decided they must have come back to a quote.
   */
  phase: "opening" | "reading" | "full";
  form: Record<string, unknown>;
  chosenDate: string | null;
  draft: IntakeDraft | null;
  edits: FieldId[];
}

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: StoredQuotation | null = null;

/**
 * Nothing validates what comes back out of localStorage — it can be an older
 * shape, or hand-edited. A draft missing its `assumptions` array threw during
 * render and took the whole page down with no way back except clearing site
 * data, so the few fields that are read without a guard are filled in here.
 */
function normalize(value: StoredQuotation | null): StoredQuotation | null {
  if (!value || typeof value !== "object") return null;
  return {
    ...value,
    phase: value.phase === "reading" || value.phase === "full" ? value.phase : "opening",
    form: value.form && typeof value.form === "object" ? value.form : {},
    edits: Array.isArray(value.edits) ? value.edits : [],
    draft: value.draft
      ? { ...value.draft, assumptions: Array.isArray(value.draft.assumptions) ? value.draft.assumptions : [] }
      : null,
  };
}

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
      cachedValue = raw ? normalize(JSON.parse(raw) as StoredQuotation) : null;
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

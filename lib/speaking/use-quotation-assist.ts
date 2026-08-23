"use client";

import { useCallback, useRef, useState } from "react";
import type { AvailabilityReport } from "./availability";

/**
 * The only client-side network calls the Speaker Quotation tool makes.
 *
 * Deliberately one file. `lib/__tests__/homepage-facts.test.ts` pins the set
 * of modules allowed to call fetch() from the browser, because the homepage
 * claims calculations stay client-side. Keeping both calls here means the tool
 * costs that allowlist one entry, and the claim stays easy to verify.
 *
 * Neither call is a calculation: `buildQuotation` runs in the browser and the
 * numbers never leave it. This checks a date against the speaker's calendar,
 * and drafts the form from a description when the organiser asks it to.
 */

export interface IntakeDraft {
  engagementType?: string;
  facilitationScope?: string;
  preparation?: string;
  output?: string;
  format?: string;
  sessions?: number;
  complexity?: string;
  audienceSize?: number;
  audienceProfile?: string;
  organizerType?: string;
  ticketed?: boolean;
  participantFee?: number;
  expectedPaidAttendees?: number;
  budget?: number;
  region?: string;
  startDate?: string;
  earlyStart?: boolean;
  travelCovered?: boolean;
  accommodationCovered?: boolean;
  addOns?: string[];
  invoiceRequired?: boolean;
  eventTitle?: string;
  organizationName?: string;
  venue?: string;
  assumptions: string[];
  questions: string[];
}

async function postJSON<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

interface AvailabilityState {
  report: AvailabilityReport | null;
  isChecking: boolean;
  error: string | null;
}

export function useAvailability() {
  const [state, setState] = useState<AvailabilityState>({
    report: null,
    isChecking: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const check = useCallback(async (startDate: string, sessions: number) => {
    // A date picker fires on every keystroke through the year field, so an
    // in-flight check is always cancelled before the next one starts.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const report = await postJSON<AvailabilityReport>(
        "/api/speaking/availability",
        { startDate, sessions },
        controller.signal
      );
      setState({ report, isChecking: false, error: null });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState({
        report: null,
        isChecking: false,
        error: err instanceof Error ? err.message : "Could not check the calendar.",
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ report: null, isChecking: false, error: null });
  }, []);

  return { ...state, check, reset };
}

interface IntakeState {
  draft: IntakeDraft | null;
  isDrafting: boolean;
  error: string | null;
}

export function useIntakeDraft() {
  const [state, setState] = useState<IntakeState>({
    draft: null,
    isDrafting: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const requestDraft = useCallback(async (description: string, today: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ draft: null, isDrafting: true, error: null });

    try {
      const payload = await postJSON<{ draft: IntakeDraft }>(
        "/api/speaking/intake",
        { description, today },
        controller.signal
      );
      setState({ draft: payload.draft, isDrafting: false, error: null });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState({
        draft: null,
        isDrafting: false,
        error: err instanceof Error ? err.message : "Could not read that description.",
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ draft: null, isDrafting: false, error: null });
  }, []);

  return { ...state, requestDraft, dismiss };
}

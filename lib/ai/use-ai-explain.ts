"use client";

import { useState, useCallback, useRef } from "react";
import type { ToolId } from "./prompts";

interface UseAiExplainReturn {
  explanation: string;
  isLoading: boolean;
  error: string | null;
  explain: (data: Record<string, unknown>) => void;
  abort: () => void;
  reset: () => void;
}

export function useAiExplain(toolId: ToolId): UseAiExplainReturn {
  const [explanation, setExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    abort();
    setExplanation("");
    setError(null);
  }, [abort]);

  const explain = useCallback(
    async (data: Record<string, unknown>) => {
      abort();
      setExplanation("");
      setError(null);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ai/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolId, data }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error || `Request failed with status ${res.status}`
          );
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream available.");

        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            const text = decoder.decode(value, { stream: !done });
            setExplanation((prev) => prev + text);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [toolId, abort]
  );

  return { explanation, isLoading, error, explain, abort, reset };
}

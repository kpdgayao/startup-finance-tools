"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { IntakeDraft } from "@/lib/speaking/use-quotation-assist";

const PLACEHOLDER = `Paste your invitation, or describe the event in your own words. For example:

"We're a rural bank in Tarlac running a two-day in-house training on bookkeeping for our branch managers — around 45 of them, none of them accountants. We were thinking the second week of March, starting 8am. We can cover a hotel and a van from Baguio."`;

const MAX_CHARS = 4_000;

interface IntakeAssistantProps {
  draft: IntakeDraft | null;
  isDrafting: boolean;
  error: string | null;
  onDraft: (description: string) => void;
  onApply: (draft: IntakeDraft) => void;
  onDismiss: () => void;
}

/**
 * The optional first step: describe the event in prose and have the form
 * filled in for you.
 *
 * The draft is never applied silently. Every inferred field comes back with an
 * assumption line, and the organiser presses "Use these answers" to accept
 * them — a quotation built on a misread sentence is worse than an empty form,
 * because it looks authoritative.
 */
export function IntakeAssistant({
  draft,
  isDrafting,
  error,
  onDraft,
  onApply,
  onDismiss,
}: IntakeAssistantProps) {
  const [text, setText] = useState("");
  const tooShort = text.trim().length < 20;

  return (
    <div className="rounded-md border border-ochre/30 bg-ochre/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-ochre-deep dark:text-ochre">
          <Sparkles className="h-4 w-4" />
          Start by describing the event
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Optional
        </span>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        Or skip this and fill in the form below yourself. Nothing here is sent anywhere until you
        press the button.
      </p>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
        placeholder={PLACEHOLDER}
        rows={6}
        className="mt-3 bg-background"
        aria-label="Event description"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-muted-foreground tabular">
          {text.length} / {MAX_CHARS}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={tooShort || isDrafting}
          onClick={() => onDraft(text)}
          className="border-ochre/30 text-ochre hover:bg-ochre/10 hover:text-ochre-deep"
        >
          {isDrafting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          {isDrafting ? "Reading…" : "Fill in the form for me"}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}

      {draft && (
        <div className="mt-4 border-t border-ochre/30 pt-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">Here is what I read from that</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
              aria-label="Dismiss draft"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {draft.assumptions.length > 0 && (
            <>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Assumed — correct anything wrong after applying
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
                {draft.assumptions.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </>
          )}

          {draft.questions.length > 0 && (
            <>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Still needed — these change the price
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
                {draft.questions.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </>
          )}

          <Button size="sm" className="mt-3" onClick={() => onApply(draft)}>
            Use these answers
          </Button>
        </div>
      )}
    </div>
  );
}

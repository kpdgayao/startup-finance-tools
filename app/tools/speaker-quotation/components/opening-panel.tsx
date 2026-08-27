"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const PLACEHOLDER = `For example:

"We're a rural bank in Tarlac running a two-day in-house training on bookkeeping for our branch managers — around 45 of them, none of them accountants. We were thinking the second week of March, starting 8am. We can cover a hotel and a van from Baguio."`;

const MAX_CHARS = 4_000;

/** Enough to be a description rather than a subject line. */
const MIN_CHARS = 20;

interface OpeningPanelProps {
  isDrafting: boolean;
  error: string | null;
  onDraft: (description: string) => void;
  onSkip: () => void;
}

/**
 * The whole first screen: one question, in the speaker's voice.
 *
 * This page is sent to people who have already written to him, so the note
 * they wrote is sitting in their sent folder. Opening with a form asked them
 * to say it all a second time, in someone else's format; opening with this
 * asks them to paste it. The form is one link away for anyone who would rather
 * answer questions.
 */
export function OpeningPanel({ isDrafting, error, onDraft, onSkip }: OpeningPanelProps) {
  const [text, setText] = useState("");
  const tooShort = text.trim().length < MIN_CHARS;

  return (
    <div className="space-y-3">
      <label htmlFor="event-description" className="block text-lg font-medium">
        Tell me about your event
      </label>
      <p className="text-sm text-muted-foreground">
        Paste the note you sent me, or just say it in your own words. I will work out what it
        costs and show you the arithmetic — then you can correct anything I misread.
      </p>

      <Textarea
        id="event-description"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
        placeholder={PLACEHOLDER}
        rows={8}
        className="bg-background"
        // Submitting from the keyboard matters here: this is the only control
        // on the screen, and reaching for the mouse to send one paragraph is a
        // strange amount of ceremony.
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !tooShort && !isDrafting) {
            onDraft(text);
          }
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[10px] text-muted-foreground tabular">
          {text.length} / {MAX_CHARS}
        </span>
        <Button disabled={tooShort || isDrafting} onClick={() => onDraft(text)}>
          {isDrafting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          {isDrafting ? "Reading your note…" : "Work out what it costs"}
        </Button>
      </div>

      {/* The typed text is deliberately kept on the error path. Losing a
          paragraph somebody just wrote, because a request failed, is worse
          than the failure. */}
      {error && (
        <p className="border-l-[2px] border-bad pl-3 text-sm text-bad" role="alert">
          {error}
        </p>
      )}

      <div className="border-t border-rule pt-3">
        <button
          type="button"
          onClick={onSkip}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          I&rsquo;d rather just answer the questions
        </button>
      </div>
    </div>
  );
}

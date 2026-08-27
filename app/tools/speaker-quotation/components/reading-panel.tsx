"use client";

import { useState } from "react";
import { Loader2, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FieldId } from "@/lib/speaking/intake-state";
import { AvailabilityPanel } from "./availability-panel";
import { DetailSection } from "./detail-section";
import { QuotationFields, IdentityFields, type FieldContext } from "./quotation-fields";

const MAX_CHARS = 4_000;

/**
 * Matched to `requestSchema` in `app/api/speaking/intake/route.ts`, which
 * rejects anything under 20 characters.
 *
 * At 3 the button happily sent "hotel is covered" and the organizer got back
 * "Describe the event in at least a couple of sentences" — advice that makes
 * no sense for a one-line follow-up, about a sentence this box's own
 * placeholder invites.
 */
const MIN_CHARS = 20;

/** A section heading, in the eyebrow style the rest of the page uses. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
  );
}

interface ReadingPanelProps {
  ctx: FieldContext;
  knownIds: FieldId[];
  askingIds: FieldId[];
  restIds: FieldId[];
  noteFor: (id: FieldId) => string | null;
  availability: {
    report: React.ComponentProps<typeof AvailabilityPanel>["report"];
    isChecking: boolean;
    error: string | null;
    check: (startDate: string, sessions: number) => void;
  };
  ready: boolean;
  isDrafting: boolean;
  error: string | null;
  /** Resolves false when the sentence could not be read, so it is not thrown away. */
  onMore: (description: string) => Promise<boolean>;
  onShowAll: () => void;
}

/**
 * What the note said, what is still worth asking, and everything else.
 *
 * The quote is rendered by the page ABOVE this panel, deliberately. The people
 * this page is sent to have already decided they want the engagement and are
 * trying to find a number they can forward for approval; making them finish a
 * form before they see one is the thing this redesign exists to stop.
 */
export function ReadingPanel({
  ctx,
  knownIds,
  askingIds,
  restIds,
  noteFor,
  availability,
  ready,
  isDrafting,
  error,
  onMore,
  onShowAll,
}: ReadingPanelProps) {
  const [more, setMore] = useState("");
  const tooShort = more.trim().length < MIN_CHARS;

  const submitMore = async () => {
    if (tooShort || isDrafting) return;
    // Cleared only once it has actually been read. Clearing on submit meant a
    // rate limit or a dropped connection left an error message above an empty
    // box, with the sentence gone.
    if (await onMore(more)) setMore("");
  };

  return (
    <div className="space-y-6">
      {knownIds.length > 0 && (
        <section className="space-y-3">
          <Eyebrow>Here&rsquo;s what I read from your note</Eyebrow>
          <p className="text-sm text-muted-foreground">
            Change anything I got wrong — the number moves as you do.
          </p>
          <div className="space-y-4">
            <QuotationFields ids={knownIds} ctx={ctx} noteFor={noteFor} />
          </div>
        </section>
      )}

      {askingIds.length > 0 && (
        <section className="space-y-3 border-t border-rule pt-6">
          <Eyebrow>These would change the number</Eyebrow>
          <p className="text-sm text-muted-foreground">
            Your note did not say, and each of these moves the total enough to be worth asking.
          </p>
          <div className="space-y-4">
            <QuotationFields ids={askingIds} ctx={ctx} />
          </div>
        </section>
      )}

      {/* The calendar check belongs with the date, and the date is usually one
          of the questions above rather than in a fixed position now. Kept here,
          after both groups, so it always has a date to check. */}
      <AvailabilityPanel
        report={availability.report}
        isChecking={availability.isChecking}
        error={availability.error}
        onCheck={() => availability.check(ctx.startDate, ctx.input.sessions)}
        disabled={!ready}
      />

      {/* Always rendered: the identity fields live in here, and gating the
          whole section on `restIds` once made the working title, organization
          and venue unreachable in this phase. */}
      <DetailSection
        title="The rest of the details"
        summary="All optional — the quote above already assumes sensible answers, and everything you set here shows on it."
      >
        <QuotationFields ids={restIds} ctx={ctx} noteFor={noteFor} />
        <IdentityFields ctx={ctx} />
      </DetailSection>

      <section className="space-y-2 border-t border-rule pt-6">
        <label htmlFor="anything-else" className="block text-sm font-medium">
          Anything else I should know?
        </label>
        <p className="text-xs text-muted-foreground">
          Tell me in a sentence and I will fold it into the answers above — nothing you have
          already corrected gets overwritten unless you mention it again.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Textarea
            id="anything-else"
            value={more}
            onChange={(e) => setMore(e.target.value.slice(0, MAX_CHARS))}
            placeholder="e.g. we can cover the hotel after all"
            rows={2}
            className="min-w-0 flex-1 bg-background"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitMore();
            }}
          />
          <Button variant="outline" size="sm" disabled={tooShort || isDrafting} onClick={submitMore}>
            {isDrafting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CornerDownLeft className="mr-2 h-4 w-4" />
            )}
            {isDrafting ? "Reading…" : "Add it"}
          </Button>
        </div>
        {error && (
          <p className="border-l-[2px] border-bad pl-3 text-sm text-bad" role="alert">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Your answers stay in this browser so you can come back to them. Nothing reaches me until
          you send the inquiry.
        </p>
      </section>

      <div className="border-t border-rule pt-4">
        <button
          type="button"
          onClick={onShowAll}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Show me every question
        </button>
      </div>
    </div>
  );
}

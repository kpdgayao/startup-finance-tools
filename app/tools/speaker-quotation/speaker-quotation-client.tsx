"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, Copy, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { MarginNote } from "@/components/shared/margin-note";
import { RelatedTools } from "@/components/shared/related-tools";
import { ExportPDFButton } from "@/components/shared/export-pdf-button";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import { formatPHP } from "@/lib/utils";
import {
  ADD_ONS,
  AUDIENCE_PROFILES,
  COMPLEXITY_TIERS,
  ENGAGEMENT_TYPES,
  FACILITATION_SCOPES,
  OUTPUT_OPTIONS,
  PREPARATION_OPTIONS,
  TEAM_BUILDING_DAY_RATE,
  ORGANIZER_TYPES,
  REGIONS,
  audienceBandFor,
  audienceProfileFor,
  engagementTypeFor,
  deriveDayRate,
  sectorMultiplier,
  facilitationScopeFor,
  formatLabel,
  outputOptionFor,
  preparationOptionFor,
  formatsFor,
  type AddOnId,
  type AudienceProfileId,
  type ComplexityId,
  type EngagementFormatId,
  type EngagementTypeId,
  type FacilitationScopeId,
  type OrganizerTypeId,
  type RegionId,
} from "@/lib/speaking/rate-card";
import {
  fieldProvenance,
  noteToShow,
  initialPhase,
  mergeDrafts,
  materialBlanks,
  visibleFieldIds,
  type FieldId,
  type Phase,
} from "@/lib/speaking/intake-state";
import {
  useStoredQuotation,
  writeStoredQuotation,
  clearStoredQuotation,
} from "@/lib/speaking/use-quotation-storage";
import { buildQuotation, DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";
import {
  buildInquiryBody,
  buildInquiryMailto,
  contactComplete,
} from "@/lib/speaking/inquiry";
import {
  addDays,
  formatEngagementDate,
  isValidISODate,
  toISODate,
} from "@/lib/speaking/availability";
import {
  useAvailability,
  useIntakeDraft,
  type IntakeDraft,
} from "@/lib/speaking/use-quotation-assist";
import { type FieldContext } from "./components/quotation-fields";
import { FullForm } from "./components/full-form";
import { OpeningPanel } from "./components/opening-panel";
import { ReadingPanel } from "./components/reading-panel";
import { QuotationSummary } from "./components/quotation-summary";
import { buildQuotationPrint } from "./print";

const INQUIRY_EMAIL = "hello@startupfinance.tools";

/** Today in the browser's timezone — the visitor's calendar, not the server's. */
function today(): string {
  return toISODate(new Date());
}

/**
 * The clock, read as an external store.
 *
 * This page is statically prerendered, so reading `new Date()` during render
 * would freeze today's date at build time: a quote generated in November would
 * compute its lead time against whenever the site was last deployed. Reading it
 * in a useState initialiser instead trades that for a hydration mismatch,
 * because the prerendered HTML and the first client render would disagree.
 *
 * useSyncExternalStore is the primitive built for exactly this. The server
 * snapshot is an empty string, which is what the prerendered HTML contains; the
 * client snapshot is the real date, which React applies after hydration without
 * complaining that the two differ.
 *
 * There is no subscription: the date is read once per session. A tab left open
 * across midnight keeps yesterday's date, which costs at most a day of lead
 * time on a quote that is about to be regenerated anyway.
 */
const subscribeToNothing = () => () => {};
const serverToday = () => "";

/** Bucketing ignores edits on purpose — see `bucketProvenance`. */
const EMPTY_EDITS: ReadonlySet<FieldId> = new Set();

/** The answers the organizer gives. `today` and `startDate` are derived, not stored. */
type FormState = Omit<QuotationInput, "today" | "startDate">;

export function SpeakerQuotationClient({ aiAvailable }: { aiAvailable: boolean }) {
  const now = useSyncExternalStore(subscribeToNothing, today, serverToday);

  /**
   * A quotation left in this browser by an earlier visit.
   *
   * Read through `useSyncExternalStore`, which uses the server snapshot for
   * the hydration render and the real one immediately after — so restoring
   * cannot mismatch the server HTML. Seeding `useState` from localStorage
   * would; restoring in an effect would be the `set-state-in-effect` pattern
   * that already fails lint in three other tools here.
   */
  const stored = useStoredQuotation();

  /**
   * Every answer is DERIVED from the stored value until the organizer touches
   * it, at which point the override takes over. Nothing is copied from storage
   * into state, so there is no restore step to get wrong.
   */
  const [formOverride, setFormOverride] = useState<FormState | null>(null);
  const [phaseOverride, setPhaseOverride] = useState<Phase | null>(null);
  const [editsOverride, setEditsOverride] = useState<ReadonlySet<FieldId> | null>(null);
  const [draftOverride, setDraftOverride] = useState<IntakeDraft | null>(null);
  const [dateOverride, setDateOverride] = useState<string | null>(null);

  const form: FormState = useMemo(
    () => formOverride ?? { ...DEFAULT_INPUT, ...(stored?.form ?? {}) },
    [formOverride, stored]
  );
  /**
   * Someone with answers in this browser is the organizer who came back after
   * their sponsor said "see if he can do it for less" — they want their own
   * quote, not either blank state.
   *
   * Read from the store rather than inferred from its existence: deriving it
   * from `stored ? "reading" : …` replaced the full form with the reading
   * panel the moment somebody changed their first field, because that write is
   * what made the store non-empty.
   */
  const phase: Phase = phaseOverride ?? initialPhase(stored?.phase, aiAvailable);
  const edits: ReadonlySet<FieldId> = useMemo(
    () => editsOverride ?? new Set(stored?.edits ?? []),
    [editsOverride, stored]
  );
  const draft: IntakeDraft | null = draftOverride ?? stored?.draft ?? null;
  const chosenDate: string | null = dateOverride ?? stored?.chosenDate ?? null;

  /**
   * What the organizer has done as of RIGHT NOW.
   *
   * The follow-up box awaits a model round trip, and anything corrected while
   * it span was being reverted — and persisted — when the draft landed,
   * because the handler was still holding the `form` and `edits` from the
   * render that created it.
   */
  const latest = useRef({ form, edits, draft, chosenDate, phase });
  // Synced after commit rather than during render — writing a ref while
  // rendering is what `react-hooks/refs` forbids, and the window this leaves
  // (commit to effect) is microseconds against a race that lasts as long as a
  // model round trip.
  useEffect(() => {
    latest.current = { form, edits, draft, chosenDate, phase };
  });

  const setPhase = useCallback((next: Phase) => {
    setPhaseOverride(next);
    writeStoredQuotation({
      phase: next,
      form: latest.current.form,
      chosenDate: latest.current.chosenDate,
      draft: latest.current.draft,
      edits: [...latest.current.edits],
    });
  }, []);

  // 45 days out: far enough that the default quote carries no rush premium.
  // The organizer should meet the standard rate first and discover the
  // surcharges by moving the date, not the other way round.
  const startDate = chosenDate ?? (now ? addDays(now, 45) : "");

  const input = useMemo<QuotationInput>(
    () => ({ ...form, today: now, startDate }),
    [form, now, startDate]
  );

  /**
   * Persisting happens here rather than in an effect, so the write is part of
   * the same user action that caused it and there is no second source of
   * truth to fall out of step.
   */
  const persist = useCallback(
    (next: {
      phase?: Phase;
      form?: FormState;
      chosenDate?: string | null;
      draft?: IntakeDraft | null;
      edits?: ReadonlySet<FieldId>;
    }) => {
      const now = latest.current;
      writeStoredQuotation({
        phase: next.phase ?? now.phase,
        form: next.form ?? now.form,
        chosenDate: next.chosenDate !== undefined ? next.chosenDate : now.chosenDate,
        draft: next.draft !== undefined ? next.draft : now.draft,
        edits: [...(next.edits ?? now.edits)],
      });
    },
    []
  );

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      const nextForm = { ...latest.current.form, [key]: value };
      const nextEdits = new Set(latest.current.edits).add(key as FieldId);
      setFormOverride(nextForm);
      setEditsOverride(nextEdits);
      persist({ form: nextForm, edits: nextEdits });
    },
    [persist]
  );

  /**
   * Changing the engagement type can strand the chosen format — a keynote is
   * not offered for a board retreat — so the format falls back to the last
   * option the new type does offer, which is the full day in every list.
   */
  const setEngagementType = useCallback(
    (value: EngagementTypeId) => {
      const current = latest.current.form;
      const allowed = formatsFor(value);
      const keep = allowed.some((f) => f.id === current.format);
      const nextForm: FormState = {
        ...current,
        engagementType: value,
        format: keep ? current.format : allowed[allowed.length - 1].id,
      };
      const nextEdits = new Set(latest.current.edits).add("engagementType" as FieldId);
      setFormOverride(nextForm);
      setEditsOverride(nextEdits);
      persist({ form: nextForm, edits: nextEdits });
    },
    [persist]
  );

  const availability = useAvailability();
  const intake = useIntakeDraft();
  const ai = useAiExplain("speaker-quotation");

  const engagementType = engagementTypeFor(input.engagementType);
  const organizer = ORGANIZER_TYPES.find((o) => o.id === input.organizerType) ?? ORGANIZER_TYPES[0];
  const isFacilitation = engagementType.id === "facilitation";
  const isTeamBuilding = engagementType.id === "team-building";
  const availableFormats = formatsFor(engagementType.id);
  const format =
    availableFormats.find((f) => f.id === input.format) ?? availableFormats[availableFormats.length - 1];
  const facilitationScope = facilitationScopeFor(input.facilitationScope);
  const preparationOption = preparationOptionFor(input.preparation);
  const outputOption = outputOptionFor(input.output);
  const dayLabel = (days: number) =>
    days === 0 ? "No extra days" : `${days} ${days === 1 ? "day" : "days"} of work`;
  const preparationDaysLabel = dayLabel(preparationOption.days);
  const outputDaysLabel = dayLabel(outputOption.days);

  const isRemote = format.remote;

  const ready = Boolean(now) && isValidISODate(startDate);
  // Shown before a quote exists, so it cannot read quote.dayEquivalents.
  const dayEquivalentsPreview = Number((format.dayEquivalent * input.sessions).toFixed(3));
  const quote = useMemo(() => (ready ? buildQuotation(input) : null), [input, ready]);

  const handleReset = () => {
    setPhaseOverride(aiAvailable ? "opening" : "full");
    setFormOverride({ ...DEFAULT_INPUT });
    setDateOverride(null);
    setEditsOverride(new Set());
    setDraftOverride(null);
    // The stored answers go with it, or a reload would undo the reset.
    clearStoredQuotation();
    availability.reset();
    intake.dismiss();
    ai.reset();
  };

  /**
   * Apply an AI draft field-by-field, keeping the current value wherever the
   * draft omitted one. The draft's ids are validated server-side against the
   * rate card, but they arrive here as plain strings, so each is checked
   * against the live option list before it is accepted.
   */
  const applyDraft = (incoming: IntakeDraft) => {
    // Read through the ref: the organizer may have corrected something while
    // the model was reading their sentence, and that correction must survive.
    const current = latest.current;
    const nextDate =
      incoming.startDate && isValidISODate(incoming.startDate) ? incoming.startDate : current.chosenDate;
    const next = ((prev: FormState) => {
      const next = { ...prev };
      if (incoming.engagementType && ENGAGEMENT_TYPES.some((t) => t.id === incoming.engagementType))
        next.engagementType = incoming.engagementType as EngagementTypeId;
      if (
        incoming.facilitationScope &&
        FACILITATION_SCOPES.some((f) => f.id === incoming.facilitationScope)
      )
        next.facilitationScope = incoming.facilitationScope as FacilitationScopeId;
      if (incoming.preparation && PREPARATION_OPTIONS.some((o) => o.id === incoming.preparation))
        next.preparation = incoming.preparation;
      if (incoming.output && OUTPUT_OPTIONS.some((o) => o.id === incoming.output))
        next.output = incoming.output;
      // Checked against the type the draft chose, not the one on screen.
      const allowed = formatsFor(next.engagementType);
      if (incoming.format && allowed.some((f) => f.id === incoming.format))
        next.format = incoming.format as EngagementFormatId;
      else if (!allowed.some((f) => f.id === next.format))
        next.format = allowed[allowed.length - 1].id;
      if (incoming.complexity && COMPLEXITY_TIERS.some((c) => c.id === incoming.complexity))
        next.complexity = incoming.complexity as ComplexityId;
      if (incoming.organizerType && ORGANIZER_TYPES.some((o) => o.id === incoming.organizerType))
        next.organizerType = incoming.organizerType as OrganizerTypeId;
      if (incoming.region && REGIONS.some((r) => r.id === incoming.region))
        next.region = incoming.region as RegionId;
      if (incoming.addOns)
        next.addOns = incoming.addOns.filter((id): id is AddOnId =>
          ADD_ONS.some((a) => a.id === id)
        );
      if (typeof incoming.sessions === "number") next.sessions = incoming.sessions;
      if (typeof incoming.audienceSize === "number") next.audienceSize = incoming.audienceSize;
      if (incoming.audienceProfile && AUDIENCE_PROFILES.some((p) => p.id === incoming.audienceProfile))
        next.audienceProfile = incoming.audienceProfile as AudienceProfileId;
      if (typeof incoming.ticketed === "boolean") next.ticketed = incoming.ticketed;
      if (typeof incoming.participantFee === "number") next.participantFee = incoming.participantFee;
      if (typeof incoming.expectedPaidAttendees === "number")
        next.expectedPaidAttendees = incoming.expectedPaidAttendees;
      if (typeof incoming.budget === "number") next.budget = incoming.budget;
      if (typeof incoming.earlyStart === "boolean") next.earlyStart = incoming.earlyStart;
      if (typeof incoming.invoiceRequired === "boolean")
        next.invoiceRequired = incoming.invoiceRequired;
      if (typeof incoming.travelCovered === "boolean") next.travelCovered = incoming.travelCovered;
      if (typeof incoming.accommodationCovered === "boolean")
        next.accommodationCovered = incoming.accommodationCovered;
      if (incoming.eventTitle) next.eventTitle = incoming.eventTitle.slice(0, 200);
      if (incoming.organizationName) next.organizationName = incoming.organizationName.slice(0, 200);
      if (incoming.venue) next.venue = incoming.venue.slice(0, 200);
      // Free text like the three above, and outside FIELD_IDS, so these carry
      // no provenance note — an organizer does not need telling that the name
      // they signed off with is the name that was read.
      if (incoming.contactName) next.contactName = incoming.contactName.slice(0, 200);
      if (incoming.contactRole) next.contactRole = incoming.contactRole.slice(0, 200);
      if (incoming.contactEmail) next.contactEmail = incoming.contactEmail.slice(0, 200);
      if (incoming.contactPhone) next.contactPhone = incoming.contactPhone.slice(0, 200);
      return next;
    })(current.form);

    // Merged, not replaced. A follow-up sentence describes one field, not the
    // whole engagement — overwriting the draft made the page forget what the
    // first note had answered and re-ask it.
    const mergedDraft = mergeDrafts(current.draft, incoming);

    setFormOverride(next);
    setDateOverride(nextDate);
    setDraftOverride(mergedDraft);
    persist({ phase: "reading", form: next, chosenDate: nextDate, draft: mergedDraft });
    intake.dismiss();
    availability.reset();
    // Even an empty draft goes to Reading: a short form ordered by price
    // impact is a better landing than a dead end on the prose box.
    setPhase("reading");
  };

  /**
   * The inquiry itself is built in `lib/speaking/inquiry.ts` — it is the one
   * output nobody sees before it is sent, so it is unit-tested rather than
   * assembled inline here.
   */
  const mailtoHref = useMemo(
    () => (quote ? buildInquiryMailto(INQUIRY_EMAIL, quote, input) : `mailto:${INQUIRY_EMAIL}`),
    [quote, input]
  );
  const canSend = contactComplete(input);

  /**
   * The same text, on the clipboard.
   *
   * A `mailto:` href is a URL, and several mail clients truncate a long one
   * without saying so — a full brief runs close enough to that ceiling that
   * the organizer needs a way to paste it that cannot be cut. It is also the
   * only route on a machine with no mail client configured at all.
   */
  const [copied, setCopied] = useState(false);
  const copyInquiry = useCallback(() => {
    if (!quote) return;
    void navigator.clipboard
      ?.writeText(buildInquiryBody(quote, input))
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }, [quote, input]);
  // Reverts the tick without leaving a timer behind on unmount.
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2_000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const audienceBand = audienceBandFor(input.audienceSize);
  const audienceProfile = audienceProfileFor(input.audienceProfile);
  const complexity =
    COMPLEXITY_TIERS.find((c) => c.id === input.complexity) ?? COMPLEXITY_TIERS[0];
  /**
   * The rate the engine will use, resolved the same way it resolves it.
   * Reading `complexity.dayRate` here put a ₱9,000 travel chip on screen beside
   * the ₱15,000 travel line the quote actually charged, because the subject
   * ladder does not price facilitation or team building.
   */
  const baseDayRate = isFacilitation
    ? facilitationScope.dayRate
    : isTeamBuilding
      ? TEAM_BUILDING_DAY_RATE
      : complexity.dayRate;
  // What this engagement will actually be quoted at, resolved the same way the
  // engine resolves it — the ladders are public-sector rates until the sector
  // scales them.
  const activeDayRate = deriveDayRate(
    baseDayRate,
    sectorMultiplier(organizer, engagementType.id)
  );
  const region = REGIONS.find((r) => r.id === input.region) ?? REGIONS[0];
  const budgetFit = quote?.budgetFit ?? null;
  /**
   * The day rate restated per person, shown beside the sector question.
   *
   * Read off the quote rather than recomputed, so it cannot disagree with the
   * summary. Withheld for facilitation, where nobody in the room is a seat and
   * dividing a planning engagement by heads produces a number that means
   * nothing.
   */
  const perHeadLine =
    quote && !isFacilitation && quote.perParticipant > 0
      ? // Both halves read off the quote. Taking the head count from the raw
        // input instead would let a clamped value (0, or 200,000) print a
        // divisor the amount beside it was not actually divided by.
        `For ${quote.audienceSize.toLocaleString("en-PH")} ${
          quote.audienceSize === 1 ? "person" : "people"
        }, everything on this quote works out at about ${formatPHP(
          quote.perParticipant
        )} each.`
      : null;
  const leadFactor = quote?.lines.find((l) => l.id === "lead-time")?.factor ?? 1;

  /**
   * The three buckets the reading panel renders: what the note answered, what
   * is still worth asking, and what is left on sensible defaults.
   *
   * `materialBlanks` re-quotes once per candidate value, so it is memoized on
   * the same input as `quote` rather than recomputed inside a render loop.
   */
  const provenance = useMemo(() => fieldProvenance(draft, edits), [draft, edits]);
  const applicableIds = useMemo(() => visibleFieldIds(input), [input]);

  /**
   * Which bucket a question sits in is decided by the NOTE, not by whether the
   * organizer has since touched it.
   *
   * Using the edit-aware provenance meant that answering a question moved it:
   * a switch inside the open "rest of the details" disclosure jumped to the
   * top of the page under "Here's what I read from your note", unmounting from
   * under the cursor mid-click. Correcting the last remaining one also emptied
   * the disclosure, which took the working-title, organization and venue
   * fields off the page with it.
   */
  const bucketProvenance = useMemo(() => fieldProvenance(draft, EMPTY_EDITS), [draft]);
  const knownIds = useMemo(
    () => applicableIds.filter((id) => bucketProvenance[id] !== "blank"),
    [applicableIds, bucketProvenance]
  );
  const askingIds = useMemo(
    () => materialBlanks(input, bucketProvenance),
    [input, bucketProvenance]
  );
  const restIds = useMemo(
    () => applicableIds.filter((id) => !knownIds.includes(id) && !askingIds.includes(id)),
    [applicableIds, knownIds, askingIds]
  );
  const noteFor = useCallback(
    (id: FieldId) => noteToShow(draft, provenance, id),
    [draft, provenance]
  );

  /** The quote itself, rendered in a different position by each phase. */
  const quoteBlock = quote ? (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        <QuotationSummary quote={quote} />
      </div>
      <MarginNote toolId="speaker-quotation" className="lg:pt-2" />
    </div>
  ) : null;

  /**
   * Everything the controls need, resolved once, here, the way the engine
   * resolves it. The registry never recomputes any of it — see FieldContext.
   */
  const fieldContext: FieldContext = {
    input,
    quote,
    now,
    startDate,
    budgetFit,
    set,
    setEngagementType,
    setChosenDate: (value: string) => {
      // Recorded as an edit like every other control. Without it `startDate`
      // stayed "blank", and since it is the one entry in ALWAYS_ASK it sat in
      // "These would change the number" under "Your note did not say" forever,
      // even after the organizer had picked the date.
      const nextEdits = new Set(latest.current.edits).add("startDate" as FieldId);
      setDateOverride(value);
      setEditsOverride(nextEdits);
      persist({ chosenDate: value, edits: nextEdits });
    },
    resetAvailability: availability.reset,
    organizer,
    engagementType,
    availableFormats,
    format,
    complexity,
    facilitationScope,
    preparationOption,
    outputOption,
    region,
    audienceBand,
    audienceProfile,
    activeDayRate,
    dayEquivalentsPreview,
    leadFactor,
    perHeadLine,
    preparationDaysLabel,
    outputDaysLabel,
    isRemote,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">What would it cost to book me?</h1>
          <p className="mt-1 text-muted-foreground">
            Answer a few questions and you will have a real number, with my reasoning attached to
            every line of it.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} title="Reset to defaults">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-y border-rule py-4 font-serif text-[15px] leading-[1.55] text-ink-2">
        {/* The second sentence earns its place: a day rate read as a day's
            talking is the single most alarming way to meet this page, and the
            preparation really is the larger half. Said once, here, rather than
            argued for later against a number the reader has already balked at. */}
        <p>
          I would rather you saw the arithmetic than a number I made up on a call. A day here is
          not a day of talking — most of it is preparation you never see — and the rate moves with
          how much of that work is new, where it is, and which sector you are in. Every question
          tells you what it does to the total before you answer it, and nothing is sent to me until
          you decide to send it.
        </p>
      </div>

      {phase === "opening" && (
        <OpeningPanel
          isDrafting={intake.isDrafting}
          error={intake.error}
          onDraft={async (text) => {
            const drafted = await intake.requestDraft(text, now);
            if (drafted) applyDraft(drafted);
          }}
          onSkip={() => setPhase("full")}
        />
      )}

      {/* Everything below the opening panel hangs off `quote`, which exists
          from the first render because the engine always has defaults. Gating
          it on the phase as well is what stops an organizer meeting an Export
          PDF button and a quote reference before they have said a word. */}
      {/* In Reading the number comes FIRST, then the corrections. In Full the
          form comes first, as it always has — someone who chose the form over
          the prose box is filling it in, not reviewing a reading of it. */}
      {phase === "reading" && quoteBlock}

      {phase === "reading" && (
        <ReadingPanel
          ctx={fieldContext}
          knownIds={knownIds}
          askingIds={askingIds}
          restIds={restIds}
          noteFor={noteFor}
          availability={availability}
          ready={ready}
          isDrafting={intake.isDrafting}
          error={intake.error}
          onMore={async (text) => {
            const drafted = await intake.requestDraft(text, now);
            // Merged, not replaced: applyDraft only overwrites the fields the
            // incoming draft actually named.
            if (drafted) applyDraft(drafted);
            return Boolean(drafted);
          }}
          onShowAll={() => setPhase("full")}
        />
      )}

      {phase === "full" && (
        <FullForm ctx={fieldContext} availability={availability} ready={ready} />
      )}

      {phase === "full" && quoteBlock}

      {phase !== "opening" && quote && (
      <div className="space-y-3 border-t border-rule pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Quote {quote.reference} · valid until {formatEngagementDate(quote.validUntil)}
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Ungated on purpose. Someone may legitimately want the numbers
                without contacting anybody, and gating the PDF would make the
                contact block feel like a toll rather than a courtesy. */}
            <ExportPDFButton
              filename={`Speaking Quotation ${quote.reference}`}
              buildPrintContent={() => buildQuotationPrint(quote, input)}
            />
            <Button variant="outline" size="sm" onClick={copyInquiry}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy inquiry"}
            </Button>
            {/* Rendered as a disabled BUTTON rather than a greyed link: an
                anchor with `aria-disabled` is still followed on Enter, which
                would open a blank mail draft anyway. */}
            {canSend ? (
              <Button asChild size="sm">
                <a href={mailtoHref}>
                  <Send className="mr-2 h-4 w-4" />
                  Send this inquiry
                </a>
              </Button>
            ) : (
              <Button size="sm" disabled aria-describedby="send-gate">
                <Send className="mr-2 h-4 w-4" />
                Send this inquiry
              </Button>
            )}
          </div>
        </div>
        {!canSend && (
          <p id="send-gate" className="text-right text-xs text-muted-foreground">
            Add your name, organization and email above so I know who I am replying to.
          </p>
        )}
      </div>
      )}

      {phase !== "opening" && quote && (
      <AiInsightsPanel
        label="What does this quote mean?"
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
            reference: quote.reference,
            eventTitle: input.eventTitle || "(not given)",
            engagementType: engagementType.label,
            format: formatLabel(format, engagementType.id),
            sessions: input.sessions,
            dayEquivalents: quote.dayEquivalents,
            // Describes whichever basis actually set the rate. Sending the
            // speaking tier on a facilitation quote had the model explaining a
            // subject tier and a day rate that appear nowhere on the page.
            rateBasis: `${quote.topicTier} (₱${quote.dayRate.toLocaleString("en-PH")}/day)`,
            ...(isFacilitation
              ? {
                  preparation: preparationOption.label,
                  writtenOutput: outputOption.label,
                  deskDays: quote.deskDays,
                }
              : {}),
            audienceSize: input.audienceSize,
            ...(isTeamBuilding ? {} : { audienceProfile: audienceProfile.label }),
            organizerType: organizer.label,
            // The engine forces "online" for a remote format, so sending the
            // stale dropdown value had the model explaining flights and hotel
            // nights that are not on the quote.
            region: isRemote ? "Online — no travel" : region.label,
            dates: quote.dates.map((d) => `${d.weekday} ${d.date}`),
            daysOfNotice: quote.daysOfNotice,
            lines: quote.lines.map((l) => ({
              label: l.label,
              amount: l.amount,
              factor: l.factor,
            })),
            professionalFee: quote.professionalFee,
            effectiveDayRate: quote.effectiveDayRate,
            topicDayRate: quote.dayRate,
            daysCommitted: quote.daysCommitted,
            billedLogistics: quote.reimbursablesBilled,
            coveredLogistics: quote.reimbursablesCovered,
            total: quote.total,
            projectedRevenue: quote.projectedRevenue,
            revenueSharePercent: quote.revenueShare,
            addOns: input.addOns,
            invoicedBy: quote.invoicing.entity ?? "billed personally",
            // What the organizer GETS, read off the rate card. Sent so the
            // explanation can describe the engagement rather than only defend
            // its price — and so it cannot invent an inclusion of its own.
            ...(quote.deliverables
              ? {
                  includes: quote.deliverables.included.map(
                    (item) => `${item.label} — ${item.detail}`
                  ),
                  notIncluded: quote.deliverables.excluded,
                  ...(quote.deliverables.comparison
                    ? {
                        perParticipantPerDay: quote.deliverables.comparison.perParticipantPerDay,
                        openCourseSeatPerDay: `${formatPHP(
                          quote.deliverables.comparison.publicMin
                        )}–${formatPHP(quote.deliverables.comparison.publicMax)}`,
                        cheaperThanSendingThemOnACourse:
                          quote.deliverables.comparison.cheaperThanSendingThem,
                        inHousePaysFromParticipants:
                          quote.deliverables.comparison.breakEvenParticipants,
                      }
                    : {}),
                }
              : {}),
            // Sent so the explanation cannot contradict the budget panel
            // sitting directly above it — the levers are the engine's, priced
            // by re-quoting each change, and the model is told to use these
            // rather than invent its own.
            ...(budgetFit
              ? {
                  statedBudget: budgetFit.budget,
                  budgetStatus: budgetFit.withinBudget
                    ? `within budget, ${formatPHP(budgetFit.difference)} to spare`
                    : `${formatPHP(budgetFit.difference)} above budget`,
                  waysToFit: budgetFit.levers.map(
                    (lever) =>
                      `${lever.label} — saves ${formatPHP(lever.saving)}, leaves ${formatPHP(
                        lever.total
                      )}`
                  ),
                  reachableWithinBudget: budgetFit.reachable,
                }
              : {}),
          })
        }
        onDismiss={ai.reset}
      />
      )}

      <RelatedTools currentToolId="speaker-quotation" />
    </div>
  );
}

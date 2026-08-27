"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { RotateCcw, Send } from "lucide-react";
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
import { type FieldId } from "@/lib/speaking/intake-state";
import { buildQuotation, DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";
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
import { IntakeAssistant } from "./components/intake-assistant";
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

/**
 * Which of the three states the page is in.
 *
 * One URL, no navigation: the quote is computed the same way in all three, and
 * only the questions around it change.
 */
type Phase = "opening" | "reading" | "full";

/** The answers the organizer gives. `today` and `startDate` are derived, not stored. */
type FormState = Omit<QuotationInput, "today" | "startDate">;

export default function SpeakerQuotationPage() {
  const now = useSyncExternalStore(subscribeToNothing, today, serverToday);

  const [form, setForm] = useState<FormState>({ ...DEFAULT_INPUT });
  /**
   * Which state the page is in. Opening and Reading arrive in later tasks;
   * until then every visitor gets the full form, exactly as before.
   */
  const [phase, setPhase] = useState<Phase>("full");
  /**
   * Fields the organizer has changed by hand. An assumption note beside one of
   * them stops being true the moment they correct it.
   */
  const [edits, setEdits] = useState<ReadonlySet<FieldId>>(() => new Set());
  /**
   * The draft is RETAINED rather than dismissed after it is applied. Without
   * it the page cannot tell "the model read this from their note" from "this
   * is still DEFAULT_INPUT", which is the whole basis of the reading panel.
   */
  const [draft, setDraft] = useState<IntakeDraft | null>(null);
  // Null until the organizer picks a date, so the default stays relative to
  // today rather than to whenever this component first rendered.
  const [chosenDate, setChosenDate] = useState<string | null>(null);

  // 45 days out: far enough that the default quote carries no rush premium.
  // The organizer should meet the standard rate first and discover the
  // surcharges by moving the date, not the other way round.
  const startDate = chosenDate ?? (now ? addDays(now, 45) : "");

  const input = useMemo<QuotationInput>(
    () => ({ ...form, today: now, startDate }),
    [form, now, startDate]
  );

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setEdits((prev) =>
      prev.has(key as FieldId) ? prev : new Set(prev).add(key as FieldId)
    );
  }, []);

  /**
   * Changing the engagement type can strand the chosen format — a keynote is
   * not offered for a board retreat — so the format falls back to the last
   * option the new type does offer, which is the full day in every list.
   */
  const setEngagementType = useCallback((value: EngagementTypeId) => {
    setForm((prev) => {
      const allowed = formatsFor(value);
      const keep = allowed.some((f) => f.id === prev.format);
      return {
        ...prev,
        engagementType: value,
        format: keep ? prev.format : allowed[allowed.length - 1].id,
      };
    });
  }, []);

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
    setForm({ ...DEFAULT_INPUT });
    setChosenDate(null);
    setEdits(new Set());
    setDraft(null);
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
  const applyDraft = (draft: IntakeDraft) => {
    if (draft.startDate && isValidISODate(draft.startDate)) setChosenDate(draft.startDate);
    setForm((prev) => {
      const next = { ...prev };
      if (draft.engagementType && ENGAGEMENT_TYPES.some((t) => t.id === draft.engagementType))
        next.engagementType = draft.engagementType as EngagementTypeId;
      if (
        draft.facilitationScope &&
        FACILITATION_SCOPES.some((f) => f.id === draft.facilitationScope)
      )
        next.facilitationScope = draft.facilitationScope as FacilitationScopeId;
      if (draft.preparation && PREPARATION_OPTIONS.some((o) => o.id === draft.preparation))
        next.preparation = draft.preparation;
      if (draft.output && OUTPUT_OPTIONS.some((o) => o.id === draft.output))
        next.output = draft.output;
      // Checked against the type the draft chose, not the one on screen.
      const allowed = formatsFor(next.engagementType);
      if (draft.format && allowed.some((f) => f.id === draft.format))
        next.format = draft.format as EngagementFormatId;
      else if (!allowed.some((f) => f.id === next.format))
        next.format = allowed[allowed.length - 1].id;
      if (draft.complexity && COMPLEXITY_TIERS.some((c) => c.id === draft.complexity))
        next.complexity = draft.complexity as ComplexityId;
      if (draft.organizerType && ORGANIZER_TYPES.some((o) => o.id === draft.organizerType))
        next.organizerType = draft.organizerType as OrganizerTypeId;
      if (draft.region && REGIONS.some((r) => r.id === draft.region))
        next.region = draft.region as RegionId;
      if (draft.addOns)
        next.addOns = draft.addOns.filter((id): id is AddOnId =>
          ADD_ONS.some((a) => a.id === id)
        );
      if (typeof draft.sessions === "number") next.sessions = draft.sessions;
      if (typeof draft.audienceSize === "number") next.audienceSize = draft.audienceSize;
      if (draft.audienceProfile && AUDIENCE_PROFILES.some((p) => p.id === draft.audienceProfile))
        next.audienceProfile = draft.audienceProfile as AudienceProfileId;
      if (typeof draft.ticketed === "boolean") next.ticketed = draft.ticketed;
      if (typeof draft.participantFee === "number") next.participantFee = draft.participantFee;
      if (typeof draft.expectedPaidAttendees === "number")
        next.expectedPaidAttendees = draft.expectedPaidAttendees;
      if (typeof draft.budget === "number") next.budget = draft.budget;
      if (typeof draft.earlyStart === "boolean") next.earlyStart = draft.earlyStart;
      if (typeof draft.invoiceRequired === "boolean")
        next.invoiceRequired = draft.invoiceRequired;
      if (typeof draft.travelCovered === "boolean") next.travelCovered = draft.travelCovered;
      if (typeof draft.accommodationCovered === "boolean")
        next.accommodationCovered = draft.accommodationCovered;
      if (draft.eventTitle) next.eventTitle = draft.eventTitle.slice(0, 200);
      if (draft.organizationName) next.organizationName = draft.organizationName.slice(0, 200);
      if (draft.venue) next.venue = draft.venue.slice(0, 200);
      return next;
    });
    setDraft(draft);
    intake.dismiss();
    availability.reset();
  };

  const mailtoHref = useMemo(() => {
    if (!quote) return `mailto:${INQUIRY_EMAIL}`;
    const type = engagementTypeFor(input.engagementType);
    const chosen = formatsFor(type.id).find((f) => f.id === input.format);
    const chosenLabel = chosen ? formatLabel(chosen, type.id) : type.label;
    const lines = [
      `Quotation reference: ${quote.reference}`,
      input.eventTitle ? `Event: ${input.eventTitle}` : null,
      input.organizationName ? `Organization: ${input.organizationName}` : null,
      input.venue ? `Venue: ${input.venue}` : null,
      `Dates: ${quote.dates.map((d) => formatEngagementDate(d.date, { weekday: true })).join("; ")}`,
      `Engagement: ${type.label}`,
      `Format: ${chosenLabel}${input.sessions > 1 ? ` × ${input.sessions}` : ""}`,
      `Participants: ${input.audienceSize}`,
      "",
      `Professional fee: ${formatPHP(quote.professionalFee)}`,
      `Billed logistics: ${formatPHP(quote.reimbursablesBilled)}`,
      `Total: ${formatPHP(quote.total)}`,
      `Quote valid until ${formatEngagementDate(quote.validUntil)}.`,
      "",
      "Generated from the published rate card at startupfinance.tools/tools/speaker-quotation.",
      "",
      "Anything else you should know about this event:",
      "",
    ].filter((line): line is string => line !== null);

    const subject = `[Speaking] ${input.eventTitle || "Engagement inquiry"} — ${quote.reference}`;
    return `mailto:${INQUIRY_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(lines.join("\n"))}`;
  }, [quote, input]);

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
    setChosenDate,
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

      <IntakeAssistant
        draft={intake.draft}
        isDrafting={intake.isDrafting}
        error={intake.error}
        onDraft={(text) => intake.requestDraft(text, now)}
        onApply={applyDraft}
        onDismiss={intake.dismiss}
      />

      {phase === "full" && (
        <FullForm ctx={fieldContext} availability={availability} ready={ready} />
      )}

      {quote && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
          <div className="min-w-0">
            <QuotationSummary quote={quote} />
          </div>
          <MarginNote toolId="speaker-quotation" className="lg:pt-2" />
        </div>
      )}

      {quote && (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
        <p className="text-sm text-muted-foreground">
          Quote {quote.reference} · valid until {formatEngagementDate(quote.validUntil)}
        </p>
        <div className="flex flex-wrap gap-2">
          <ExportPDFButton
            filename={`Speaking Quotation ${quote.reference}`}
            buildPrintContent={() => buildQuotationPrint(quote, input)}
          />
          <Button asChild size="sm">
            <a href={mailtoHref}>
              <Send className="mr-2 h-4 w-4" />
              Send this inquiry
            </a>
          </Button>
        </div>
      </div>
      )}

      {quote && (
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

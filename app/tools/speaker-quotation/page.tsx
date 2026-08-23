"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/shared/currency-input";
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
  DAY_RATE_MIN,
  INVOICING_ENTITY,
  ORGANIZER_TYPES,
  REGIONS,
  RETURNING_CLIENT_DISCOUNT,
  TRAVEL_DAY_FACTOR,
  audienceBandFor,
  audienceProfileFor,
  engagementTypeFor,
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
import { QUESTIONS } from "@/lib/speaking/questions";
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
import { RateFactorField } from "./components/rate-factor-field";
import { AvailabilityPanel } from "./components/availability-panel";
import { IntakeAssistant } from "./components/intake-assistant";
import { QuotationSummary } from "./components/quotation-summary";
import { DetailSection } from "./components/detail-section";
import { buildQuotationPrint } from "./print";

const ENQUIRY_EMAIL = "hello@startupfinance.tools";

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
 * Dropdowns are capped to the viewport. Radix sizes the panel to its widest
 * item, and these options carry a sentence of explanation each — unconstrained,
 * one of them measured 805px inside a 375px phone.
 */
const SELECT_CONTENT = "max-w-[calc(100vw-2rem)]";

/**
 * An option rendered as a stacked label and explanation rather than one long
 * line, so it wraps and stays readable on a phone. `whitespace-normal` is
 * required: the trigger sets `whitespace-nowrap` and the item inherits it.
 */
function OptionText({
  label,
  detail,
  trailing,
}: {
  label: string;
  detail: string;
  trailing?: string;
}) {
  return (
    <span className="flex flex-col gap-0.5 whitespace-normal">
      <span className="flex items-baseline gap-2">
        <span className="font-medium">{label}</span>
        {trailing && (
          <span className="font-mono text-[11px] text-ochre-deep dark:text-ochre tabular">
            {trailing}
          </span>
        )}
      </span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </span>
  );
}

/** A percentage impact chip, e.g. "+15%". Neutral factors read "No change". */
function factorImpact(factor: number): string {
  if (factor === 1) return "No change";
  const pct = Math.round((factor - 1) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

/** The answers the organiser gives. `today` and `startDate` are derived, not stored. */
type FormState = Omit<QuotationInput, "today" | "startDate">;

export default function SpeakerQuotationPage() {
  const now = useSyncExternalStore(subscribeToNothing, today, serverToday);

  const [form, setForm] = useState<FormState>({ ...DEFAULT_INPUT });
  // Null until the organiser picks a date, so the default stays relative to
  // today rather than to whenever this component first rendered.
  const [chosenDate, setChosenDate] = useState<string | null>(null);

  // 45 days out: far enough that the default quote carries no rush premium.
  // The organiser should meet the standard rate first and discover the
  // surcharges by moving the date, not the other way round.
  const startDate = chosenDate ?? (now ? addDays(now, 45) : "");

  const input = useMemo<QuotationInput>(
    () => ({ ...form, today: now, startDate }),
    [form, now, startDate]
  );

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
    intake.dismiss();
    availability.reset();
  };

  const mailtoHref = useMemo(() => {
    if (!quote) return `mailto:${ENQUIRY_EMAIL}`;
    const type = engagementTypeFor(input.engagementType);
    const chosen = formatsFor(type.id).find((f) => f.id === input.format);
    const chosenLabel = chosen ? formatLabel(chosen, type.id) : type.label;
    const lines = [
      `Quotation reference: ${quote.reference}`,
      input.eventTitle ? `Event: ${input.eventTitle}` : null,
      input.organizationName ? `Organisation: ${input.organizationName}` : null,
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

    const subject = `[Speaking] ${input.eventTitle || "Engagement enquiry"} — ${quote.reference}`;
    return `mailto:${ENQUIRY_EMAIL}?subject=${encodeURIComponent(
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
  const activeDayRate = isFacilitation
    ? facilitationScope.dayRate
    : isTeamBuilding
      ? TEAM_BUILDING_DAY_RATE
      : complexity.dayRate;
  const organizer = ORGANIZER_TYPES.find((o) => o.id === input.organizerType) ?? ORGANIZER_TYPES[0];
  const region = REGIONS.find((r) => r.id === input.region) ?? REGIONS[0];
  const leadFactor = quote?.lines.find((l) => l.id === "lead-time")?.factor ?? 1;

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
        <p>
          I would rather you saw the arithmetic than a number I made up on a call. My day rate
          starts at {formatPHP(DAY_RATE_MIN)} and moves with how much of the work is new, where it
          is, and who it is for — and every question below tells you what it does to the total
          before you answer it. Nothing is sent to me until you decide to send it.
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

      <Card>
        <CardHeader>
          <CardTitle>What are you planning?</CardTitle>
          <CardDescription>The four answers that move the number most.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RateFactorField
            question={QUESTIONS.engagementType}
            impact={`from ${formatPHP(
              engagementType.id === "facilitation"
                ? FACILITATION_SCOPES[0].dayRate
                : engagementType.id === "team-building"
                  ? TEAM_BUILDING_DAY_RATE
                  : DAY_RATE_MIN
            )}/day`}
            active
          >
            <Select
              value={input.engagementType}
              onValueChange={(v) => setEngagementType(v as EngagementTypeId)}
            >
              <SelectTrigger id={QUESTIONS.engagementType.id} className="w-full">
                <SelectValue>{engagementType.label}</SelectValue>
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                {ENGAGEMENT_TYPES.map((option) => (
                  <SelectItem key={option.id} value={option.id} textValue={option.label}>
                    <OptionText label={option.label} detail={option.detail} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RateFactorField>

          <RateFactorField
            question={QUESTIONS.format}
            impact={`${format.dayEquivalent} day${format.dayEquivalent === 1 ? "" : "s"} each`}
            active
          >
            <Select
              value={input.format}
              onValueChange={(v) => set("format", v as EngagementFormatId)}
            >
              <SelectTrigger id={QUESTIONS.format.id} className="w-full">
                {/* Explicit children: without them Radix mirrors the item's
                    full markup into the trigger, and the trigger is `w-fit`,
                    so a long option stretched it to 805px — pushing <main>
                    to 896px inside a 375px viewport and giving the whole page
                    an invisible sideways scroll. */}
                <SelectValue>{formatLabel(format, engagementType.id)}</SelectValue>
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                {availableFormats.map((option) => (
                  <SelectItem
                    key={option.id}
                    value={option.id}
                    textValue={formatLabel(option, engagementType.id)}
                  >
                    <OptionText
                      label={formatLabel(option, engagementType.id)}
                      detail={option.detail}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RateFactorField>

          <RateFactorField
            question={QUESTIONS.sessions}
            // Rounded the way the engine rounds it: 0.6 × 3 in raw float is
            // 1.7999999999999998, which rendered verbatim in the chip.
            impact={`${dayEquivalentsPreview} engagement day${
              dayEquivalentsPreview === 1 ? "" : "s"
            }`}
            active={input.sessions > 1}
          >
            <Input
              id={QUESTIONS.sessions.id}
              type="number"
              min={1}
              max={30}
              step={1}
              value={input.sessions}
              onChange={(e) => {
                // Floored, not just clamped: a number input accepts "2.5",
                // which the engine silently priced as 2 while the chip read
                // "2.5 engagement days" and the availability request was
                // rejected as a non-integer.
                set(
                  "sessions",
                  Math.max(1, Math.min(30, Math.floor(Number(e.target.value) || 1)))
                );
                // The session count decides how many dates the engagement
                // spans, so an existing check no longer covers it. Leaving it
                // on screen showed a one-date "Open" beside a three-date quote.
                availability.reset();
              }}
            />
          </RateFactorField>

          {!isFacilitation && !isTeamBuilding && (
          <RateFactorField
            question={QUESTIONS.complexity}
            impact={`${formatPHP(complexity.dayRate)}/day`}
            active
          >
            <Select
              value={input.complexity}
              onValueChange={(v) => set("complexity", v as ComplexityId)}
            >
              <SelectTrigger id={QUESTIONS.complexity.id} className="w-full">
                {/* Explicit children: without them Radix mirrors the item's
                    full markup into the trigger, and the trigger is `w-fit`,
                    so a long option stretched it to 805px — pushing <main>
                    to 896px inside a 375px viewport and giving the whole page
                    an invisible sideways scroll. */}
                <SelectValue>{complexity.label}</SelectValue>
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                {COMPLEXITY_TIERS.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id} textValue={tier.label}>
                    <OptionText
                      label={tier.label}
                      detail={tier.detail}
                      trailing={`${formatPHP(tier.dayRate)}/day`}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RateFactorField>
          )}

          {isFacilitation && (
            <>
              <RateFactorField
                question={QUESTIONS.facilitationScope}
                impact={`${formatPHP(facilitationScope.dayRate)}/day`}
                active
              >
                <Select
                  value={input.facilitationScope}
                  onValueChange={(v) => set("facilitationScope", v as FacilitationScopeId)}
                >
                  <SelectTrigger id={QUESTIONS.facilitationScope.id} className="w-full">
                    <SelectValue>{facilitationScope.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {FACILITATION_SCOPES.map((option) => (
                      <SelectItem key={option.id} value={option.id} textValue={option.label}>
                        <OptionText
                          label={option.label}
                          detail={option.detail}
                          trailing={`${formatPHP(option.dayRate)}/day`}
                        />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </RateFactorField>

              <RateFactorField
                question={QUESTIONS.preparation}
                impact={preparationDaysLabel}
                active={preparationOption.days > 0}
              >
                <Select value={input.preparation} onValueChange={(v) => set("preparation", v)}>
                  <SelectTrigger id={QUESTIONS.preparation.id} className="w-full">
                    <SelectValue>{preparationOption.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {PREPARATION_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id} textValue={option.label}>
                        <OptionText label={option.label} detail={option.detail} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </RateFactorField>

              <RateFactorField
                question={QUESTIONS.output}
                impact={outputDaysLabel}
                active={outputOption.days > 0}
              >
                <Select value={input.output} onValueChange={(v) => set("output", v)}>
                  <SelectTrigger id={QUESTIONS.output.id} className="w-full">
                    <SelectValue>{outputOption.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {OUTPUT_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id} textValue={option.label}>
                        <OptionText label={option.label} detail={option.detail} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </RateFactorField>
            </>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>When and where</CardTitle>
          <CardDescription>
            I will check the date against my calendar before you go any further.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RateFactorField
            question={QUESTIONS.startDate}
            impact={
              quote
                ? `${factorImpact(quote.schedule.factor)} · notice ${factorImpact(leadFactor)}`
                : undefined
            }
            active={Boolean(quote && (quote.schedule.factor !== 1 || leadFactor !== 1))}
          >
            <Input
              id={QUESTIONS.startDate.id}
              type="date"
              value={startDate}
              min={now || undefined}
              onChange={(e) => {
                if (isValidISODate(e.target.value)) {
                  setChosenDate(e.target.value);
                  availability.reset();
                }
              }}
            />
            {quote && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {quote.schedule.reason}. {quote.daysOfNotice} days of notice.
              </p>
            )}
          </RateFactorField>

          <AvailabilityPanel
            report={availability.report}
            isChecking={availability.isChecking}
            error={availability.error}
            onCheck={() => availability.check(startDate, input.sessions)}
            disabled={!ready}
          />

          <RateFactorField
            question={QUESTIONS.region}
            impact={
              isRemote
                ? "No travel"
                : region.travelDays > 0
                  ? `+${formatPHP(
                      activeDayRate * TRAVEL_DAY_FACTOR * region.travelDays
                    )} travel time`
                  : "No travel"
            }
            active={!isRemote && region.travelDays > 0}
          >
            <Select
              value={input.region}
              onValueChange={(v) => set("region", v as RegionId)}
              disabled={isRemote}
            >
              <SelectTrigger id={QUESTIONS.region.id} className="w-full">
                {/* Explicit children: without them Radix mirrors the item's
                    full markup into the trigger, and the trigger is `w-fit`,
                    so a long option stretched it to 805px — pushing <main>
                    to 896px inside a 375px viewport and giving the whole page
                    an invisible sideways scroll. */}
                <SelectValue>{region.label}</SelectValue>
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                {REGIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id} textValue={option.label}>
                    <OptionText label={option.label} detail={option.detail} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isRemote && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                An online session has no travel, so the location does not affect the quote.
              </p>
            )}
          </RateFactorField>


        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>And about you</CardTitle>
          <CardDescription>
            Which rate applies, and whether we have met before.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RateFactorField
            question={QUESTIONS.organizerType}
            impact={organizer.mission ? "Concessionary rate" : factorImpact(organizer.factor)}
            active={organizer.factor !== 1 || organizer.mission}
          >
            <Select
              value={input.organizerType}
              onValueChange={(v) => set("organizerType", v as OrganizerTypeId)}
            >
              <SelectTrigger id={QUESTIONS.organizerType.id} className="w-full">
                {/* Explicit children: without them Radix mirrors the item's
                    full markup into the trigger, and the trigger is `w-fit`,
                    so a long option stretched it to 805px — pushing <main>
                    to 896px inside a 375px viewport and giving the whole page
                    an invisible sideways scroll. */}
                <SelectValue>{organizer.label}</SelectValue>
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                {ORGANIZER_TYPES.map((option) => (
                  <SelectItem key={option.id} value={option.id} textValue={option.label}>
                    <OptionText label={option.label} detail={option.detail} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RateFactorField>


          <RateFactorField
            question={QUESTIONS.returningClient}
            impact={input.returningClient ? `−${RETURNING_CLIENT_DISCOUNT * 100}%` : "No change"}
            active={input.returningClient}
          >
            <div className="flex items-center gap-3">
              <Switch
                id={QUESTIONS.returningClient.id}
                checked={input.returningClient}
                onCheckedChange={(v) => set("returningClient", v)}
              />
              <span className="text-sm text-muted-foreground">
                {input.returningClient ? "Yes, we have worked together" : "This would be the first time"}
              </span>
            </div>
          </RateFactorField>

          <RateFactorField
            question={QUESTIONS.ticketed}
            impact={
              quote && quote.projectedGate > 0
                ? `Gate ${formatPHP(quote.projectedGate)}`
                : input.ticketed
                  ? "Awaiting figures"
                  : "No floor applied"
            }
            active={input.ticketed}
          >
            <div className="flex items-center gap-3">
              <Switch
                id={QUESTIONS.ticketed.id}
                checked={input.ticketed}
                onCheckedChange={(v) => set("ticketed", v)}
              />
              <span className="text-sm text-muted-foreground">
                {input.ticketed ? "Participants pay to attend" : "Free to participants"}
              </span>
            </div>
          </RateFactorField>


          {input.ticketed && (
            <>
              <RateFactorField question={QUESTIONS.participantFee} labelMode="child">
                <CurrencyInput
                  id={QUESTIONS.participantFee.id}
                  label={QUESTIONS.participantFee.label}
                  value={input.participantFee}
                  onChange={(v) => set("participantFee", v)}
                  min={0}
                />
              </RateFactorField>

              <RateFactorField question={QUESTIONS.expectedPaidAttendees}>
                <Input
                  id={QUESTIONS.expectedPaidAttendees.id}
                  type="number"
                  min={0}
                  max={100000}
                  value={input.expectedPaidAttendees}
                  onChange={(e) =>
                    set("expectedPaidAttendees", Math.max(0, Number(e.target.value) || 0))
                  }
                  placeholder={String(input.audienceSize)}
                />
              </RateFactorField>
            </>
          )}
        </CardContent>
      </Card>

      <DetailSection
        title="Anything else I should know?"
        summary="Room size, the venue, travel arrangements, invoicing, extras. All optional — the quote above already assumes sensible answers, and everything you set here shows on it."
      >
            <RateFactorField
              question={QUESTIONS.audienceSize}
              impact={factorImpact(audienceBand.factor)}
              active={audienceBand.factor !== 1}
            >
              <Input
                id={QUESTIONS.audienceSize.id}
                type="number"
                min={1}
                max={100000}
                value={input.audienceSize}
                onChange={(e) => set("audienceSize", Math.max(1, Number(e.target.value) || 1))}
              />
            </RateFactorField>
            {!isTeamBuilding && (
            <RateFactorField
              question={QUESTIONS.audienceProfile}
              impact={factorImpact(audienceProfile.factor)}
              active={audienceProfile.factor !== 1}
            >
              <Select
                value={input.audienceProfile}
                onValueChange={(v) => set("audienceProfile", v as AudienceProfileId)}
              >
                <SelectTrigger id={QUESTIONS.audienceProfile.id} className="w-full">
                  <SelectValue>{audienceProfile.label}</SelectValue>
                </SelectTrigger>
                <SelectContent className={SELECT_CONTENT}>
                  {AUDIENCE_PROFILES.map((option) => (
                    <SelectItem key={option.id} value={option.id} textValue={option.label}>
                      <OptionText label={option.label} detail={option.detail} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </RateFactorField>
            )}
            <div className="border-t border-rule pt-4">
              <Label htmlFor="event-title">Working title of the session</Label>
              <Input
                id="event-title"
                value={input.eventTitle ?? ""}
                onChange={(e) => set("eventTitle", e.target.value.slice(0, 200))}
                placeholder="e.g. Bookkeeping for Non-Accountants"
                className="mt-2"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Optional, but it is the clearest signal of how much new ground the subject covers.
              </p>
            </div>
            <div className="border-t border-rule pt-4">
              <Label htmlFor="organization">Organisation</Label>
              <Input
                id="organization"
                value={input.organizationName ?? ""}
                onChange={(e) => set("organizationName", e.target.value.slice(0, 200))}
                placeholder="Who the quote is addressed to"
                className="mt-2"
              />
            </div>
            <div className="border-t border-rule pt-4">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={input.venue ?? ""}
                onChange={(e) => set("venue", e.target.value.slice(0, 200))}
                placeholder="e.g. Baguio Country Club, or Zoom"
                className="mt-2"
              />
            </div>
            {!isRemote && (
              <>
                <RateFactorField
                  question={QUESTIONS.earlyStart}
                  impact={input.earlyStart ? "One extra night" : "No overnight added"}
                  active={input.earlyStart}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      id={QUESTIONS.earlyStart.id}
                      checked={input.earlyStart}
                      onCheckedChange={(v) => set("earlyStart", v)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {input.earlyStart ? "Starts before 10am" : "Starts at 10am or later"}
                    </span>
                  </div>
                </RateFactorField>

                <RateFactorField
                  question={QUESTIONS.travelCovered}
                  impact={input.travelCovered ? "Not billed" : "Billed as a reimbursable"}
                  active={!input.travelCovered}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      id={QUESTIONS.travelCovered.id}
                      checked={input.travelCovered}
                      onCheckedChange={(v) => set("travelCovered", v)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {input.travelCovered ? "We arrange transport" : "Please arrange and bill us"}
                    </span>
                  </div>
                </RateFactorField>

                <RateFactorField
                  question={QUESTIONS.accommodationCovered}
                  impact={input.accommodationCovered ? "Not billed" : "Billed as a reimbursable"}
                  active={!input.accommodationCovered}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      id={QUESTIONS.accommodationCovered.id}
                      checked={input.accommodationCovered}
                      onCheckedChange={(v) => set("accommodationCovered", v)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {input.accommodationCovered
                        ? "We arrange accommodation"
                        : "Please arrange and bill us"}
                    </span>
                  </div>
                </RateFactorField>
              </>
            )}
            <RateFactorField
              question={QUESTIONS.invoiceRequired}
              impact={
                input.invoiceRequired
                  ? `Issued by ${INVOICING_ENTITY.name}`
                  : "Billed personally"
              }
              active={input.invoiceRequired}
            >
              <div className="flex items-center gap-3">
                <Switch
                  id={QUESTIONS.invoiceRequired.id}
                  checked={input.invoiceRequired}
                  onCheckedChange={(v) => set("invoiceRequired", v)}
                />
                <span className="text-sm text-muted-foreground">
                  {input.invoiceRequired
                    ? "We need an official invoice"
                    : "No invoice needed"}
                </span>
              </div>
            </RateFactorField>
            <RateFactorField
              question={QUESTIONS.addOns}
              labelMode="group"
              impact={
                input.addOns.length
                  ? `${input.addOns.length} selected`
                  : "None"
              }
              active={input.addOns.length > 0}
            >
              <div className="space-y-3">
                {ADD_ONS.map((addOn) => {
                  const checked = input.addOns.includes(addOn.id);
                  return (
                    <div key={addOn.id} className="flex items-start gap-3">
                      <Checkbox
                        id={`addon-${addOn.id}`}
                        checked={checked}
                        onCheckedChange={(value) =>
                          set(
                            "addOns",
                            value === true
                              ? [...input.addOns, addOn.id]
                              : input.addOns.filter((id) => id !== addOn.id)
                          )
                        }
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <Label htmlFor={`addon-${addOn.id}`} className="font-medium">
                          {addOn.label}
                          <span className="ml-2 font-mono text-[11px] text-ochre-deep dark:text-ochre tabular">
                            {addOn.factor ? `+${Math.round(addOn.factor * 100)}%` : `+${formatPHP(addOn.amount ?? 0)}`}
                          </span>
                        </Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">{addOn.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RateFactorField>
      </DetailSection>

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
              Send this enquiry
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
            projectedGate: quote.projectedGate,
            gateSharePercent: quote.gateShare,
            addOns: input.addOns,
            invoicedBy: quote.invoicing.entity ?? "billed personally",
          })
        }
        onDismiss={ai.reset}
      />
      )}

      <RelatedTools currentToolId="speaker-quotation" />
    </div>
  );
}

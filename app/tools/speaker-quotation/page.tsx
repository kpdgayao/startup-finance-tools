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
  COMPLEXITY_TIERS,
  DAY_RATE_MAX,
  DAY_RATE_MIN,
  ENGAGEMENT_FORMATS,
  ORGANIZER_TYPES,
  REGIONS,
  TRAVEL_DAY_FACTOR,
  audienceBandFor,
  type AddOnId,
  type ComplexityId,
  type EngagementFormatId,
  type OrganizerTypeId,
  type RegionId,
} from "@/lib/speaking/rate-card";
import { QUESTIONS } from "@/lib/speaking/questions";
import { buildQuotation, DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";
import { addDays, isValidISODate, toISODate } from "@/lib/speaking/availability";
import {
  useAvailability,
  useIntakeDraft,
  type IntakeDraft,
} from "@/lib/speaking/use-quotation-assist";
import { RateFactorField } from "./components/rate-factor-field";
import { AvailabilityPanel } from "./components/availability-panel";
import { IntakeAssistant } from "./components/intake-assistant";
import { QuotationSummary } from "./components/quotation-summary";
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

  const availability = useAvailability();
  const intake = useIntakeDraft();
  const ai = useAiExplain("speaker-quotation");

  const format = ENGAGEMENT_FORMATS.find((f) => f.id === input.format) ?? ENGAGEMENT_FORMATS[0];
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
      if (draft.format && ENGAGEMENT_FORMATS.some((f) => f.id === draft.format))
        next.format = draft.format as EngagementFormatId;
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
      if (typeof draft.ticketed === "boolean") next.ticketed = draft.ticketed;
      if (typeof draft.participantFee === "number") next.participantFee = draft.participantFee;
      if (typeof draft.expectedPaidAttendees === "number")
        next.expectedPaidAttendees = draft.expectedPaidAttendees;
      if (typeof draft.earlyStart === "boolean") next.earlyStart = draft.earlyStart;
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
    const lines = [
      `Quotation reference: ${quote.reference}`,
      input.eventTitle ? `Event: ${input.eventTitle}` : null,
      input.organizationName ? `Organisation: ${input.organizationName}` : null,
      input.venue ? `Venue: ${input.venue}` : null,
      `Dates: ${quote.dates.map((d) => `${d.weekday}, ${d.date}`).join("; ")}`,
      `Format: ${format.label}${input.sessions > 1 ? ` × ${input.sessions}` : ""}`,
      `Participants: ${input.audienceSize}`,
      "",
      `Professional fee: ${formatPHP(quote.professionalFee)}`,
      `Billed logistics: ${formatPHP(quote.reimbursablesBilled)}`,
      `Total: ${formatPHP(quote.total)}`,
      `Quote valid until ${quote.validUntil}.`,
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
  }, [quote, input, format]);

  const audienceBand = audienceBandFor(input.audienceSize);
  const complexity =
    COMPLEXITY_TIERS.find((c) => c.id === input.complexity) ?? COMPLEXITY_TIERS[0];
  const organizer = ORGANIZER_TYPES.find((o) => o.id === input.organizerType) ?? ORGANIZER_TYPES[0];
  const region = REGIONS.find((r) => r.id === input.region) ?? REGIONS[0];
  const leadFactor = quote?.lines.find((l) => l.id === "lead-time")?.factor ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Speaker Engagement Quotation</h1>
          <p className="mt-1 text-muted-foreground">
            Cost a workshop, keynote or training day against a published rate card — and see
            exactly which answers moved the number.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} title="Reset to defaults">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-y border-rule py-4 font-serif text-[15px] leading-[1.55] text-ink-2">
        <p>
          The day rate is set by the topic — {formatPHP(DAY_RATE_MIN)} for something already in the
          catalogue, up to {formatPHP(DAY_RATE_MAX)} for one that needs real research first — with
          transport and accommodation arranged by the organiser. Everything below either adds to
          that or explains why it stays where it is. Nothing is hidden, and nothing here is sent to
          anyone until you choose to send it.
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
          <CardTitle>The engagement</CardTitle>
          <CardDescription>
            What is being asked for, and how much of it has to be built from scratch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RateFactorField
            question={QUESTIONS.format}
            impact={`${format.dayEquivalent} day${format.dayEquivalent === 1 ? "" : "s"} each`}
            active
          >
            <Select
              value={input.format}
              onValueChange={(v) => set("format", v as EngagementFormatId)}
            >
              <SelectTrigger id={QUESTIONS.format.id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENGAGEMENT_FORMATS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label} — {option.detail}
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
              value={input.sessions}
              onChange={(e) => {
                set("sessions", Math.max(1, Math.min(30, Number(e.target.value) || 1)));
                // The session count decides how many dates the engagement
                // spans, so an existing check no longer covers it. Leaving it
                // on screen showed a one-date "Open" beside a three-date quote.
                availability.reset();
              }}
            />
          </RateFactorField>

          <RateFactorField
            question={QUESTIONS.complexity}
            impact={`${formatPHP(complexity.dayRate)}/day`}
            active
          >
            <Select
              value={input.complexity}
              onValueChange={(v) => set("complexity", v as ComplexityId)}
            >
              <SelectTrigger id={QUESTIONS.complexity.id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPLEXITY_TIERS.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.label} — {tier.detail}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RateFactorField>

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
              Optional, but it is what decides whether the material already exists.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>When and where</CardTitle>
          <CardDescription>
            The date decides both availability and how much notice the request gives.
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
                      complexity.dayRate * TRAVEL_DAY_FACTOR * region.travelDays
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
              <SelectTrigger id={QUESTIONS.region.id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label} — {option.detail}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Who is asking</CardTitle>
          <CardDescription>
            This decides which rate applies, and whether the event is funding itself.
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
              <SelectTrigger id={QUESTIONS.organizerType.id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZER_TYPES.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label} — {option.detail}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RateFactorField>

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

      <Card>
        <CardHeader>
          <CardTitle>Beyond the session</CardTitle>
          <CardDescription>
            Everything here is optional, and each one is a separate piece of work.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

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
          Quote {quote.reference} · valid until {quote.validUntil}
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
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
            reference: quote.reference,
            eventTitle: input.eventTitle || "(not given)",
            format: format.label,
            sessions: input.sessions,
            dayEquivalents: quote.dayEquivalents,
            complexity: `${complexity.label} (₱${complexity.dayRate.toLocaleString("en-PH")}/day)`,
            audienceSize: input.audienceSize,
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
          })
        }
        onDismiss={ai.reset}
      />
      )}

      <RelatedTools currentToolId="speaker-quotation" />
    </div>
  );
}

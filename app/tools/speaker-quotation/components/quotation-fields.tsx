"use client";

import { Fragment } from "react";
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
import { IntegerInput } from "@/components/shared/integer-input";
import { formatPHP } from "@/lib/utils";
import {
  ADD_ONS,
  AUDIENCE_PROFILES,
  COMPLEXITY_TIERS,
  ENGAGEMENT_TYPES,
  FACILITATION_SCOPES,
  OUTPUT_OPTIONS,
  PREPARATION_OPTIONS,
  DAY_RATE_MIN,
  INVOICING_ENTITY,
  ORGANIZER_TYPES,
  REGIONS,
  RETURNING_CLIENT_DISCOUNT,
  TEAM_BUILDING_DAY_RATE,
  TRAVEL_DAY_FEE,
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
  type AudienceProfileId,
  type ComplexityId,
  type EngagementFormatId,
  type EngagementTypeId,
  type FacilitationScopeId,
  type OrganizerTypeId,
  type RegionId,
} from "@/lib/speaking/rate-card";
import { QUESTIONS } from "@/lib/speaking/questions";
import type { BudgetFit, Quotation, QuotationInput } from "@/lib/speaking/quotation";
import { isValidISODate } from "@/lib/speaking/availability";
import { type FieldId, isFieldDisabled } from "@/lib/speaking/intake-state";
import { RateFactorField } from "./rate-factor-field";

/** The answers the organizer gives. `today` and `startDate` are derived, not stored. */
export type FormState = Omit<QuotationInput, "today" | "startDate">;

/**
 * Dropdowns are capped to the viewport. Radix sizes the panel to its widest
 * item, and these options carry a sentence of explanation each — unconstrained,
 * one of them measured 805px inside a 375px phone.
 */
const SELECT_CONTENT = "max-w-[calc(100vw-2rem)]";

/**
 * Triggers are full-width, and their value shrinks rather than being clipped.
 *
 * `w-full` alone is not enough. The trigger sets `whitespace-nowrap` and its
 * value is a flex item, which by default will not shrink below its content —
 * so a long option was cut off mid-word with no ellipsis ("Company or
 * corporate in-house trainin"), reading as a typo rather than as a label too
 * long for the box. `min-w-0` lets it shrink so the existing `line-clamp-1`
 * can do its job.
 */
const SELECT_TRIGGER = "w-full *:data-[slot=select-value]:min-w-0";

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

/**
 * Everything a control needs, resolved once by the page.
 *
 * The derived values are passed in rather than recomputed here because the
 * page already resolves them the way the ENGINE resolves them — reading
 * `complexity.dayRate` directly once put a ₱9,000 travel chip on screen beside
 * the ₱15,000 travel line the quote actually charged. One resolution, one
 * truth.
 */
export interface FieldContext {
  input: QuotationInput;
  quote: Quotation | null;
  now: string;
  startDate: string;
  budgetFit: BudgetFit | null;

  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  setEngagementType: (value: EngagementTypeId) => void;
  setChosenDate: (value: string) => void;
  resetAvailability: () => void;

  organizer: (typeof ORGANIZER_TYPES)[number];
  engagementType: ReturnType<typeof engagementTypeFor>;
  availableFormats: ReturnType<typeof formatsFor>;
  format: ReturnType<typeof formatsFor>[number];
  complexity: (typeof COMPLEXITY_TIERS)[number];
  facilitationScope: ReturnType<typeof facilitationScopeFor>;
  preparationOption: ReturnType<typeof preparationOptionFor>;
  outputOption: ReturnType<typeof outputOptionFor>;
  region: (typeof REGIONS)[number];
  audienceBand: ReturnType<typeof audienceBandFor>;
  audienceProfile: ReturnType<typeof audienceProfileFor>;

  activeDayRate: number;
  dayEquivalentsPreview: number;
  leadFactor: number;
  perHeadLine: string | null;
  preparationDaysLabel: string;
  outputDaysLabel: string;
  isRemote: boolean;
}

interface QuotationFieldsProps {
  ids: FieldId[];
  ctx: FieldContext;
  /** Rendered under a field's control — the assumption note, when there is one. */
  noteFor?: (id: FieldId) => string | null;
}

/**
 * Renders the given questions, in the order given, from one definition each.
 *
 * Both the full form and the reading panel come through here. Two copies of a
 * control would drift, and a sector select that differs between two states of
 * one page produces two different prices for one event.
 */
export function QuotationFields({ ids, ctx, noteFor }: QuotationFieldsProps) {
  return (
    <>
      {ids.map((id) => (
        <Fragment key={id}>{renderField(id, ctx, noteFor?.(id) ?? null)}</Fragment>
      ))}
    </>
  );
}

/** The assumption note, when the model made one about this field. */
function Note({ note }: { note: string | null }) {
  if (!note) return null;
  return (
    <p className="mt-1.5 border-l-[2px] border-ochre/40 pl-2.5 text-xs text-muted-foreground">
      {note}
    </p>
  );
}

function renderField(id: FieldId, ctx: FieldContext, note: string | null) {
  const {
    input,
    quote,
    set,
    organizer,
    engagementType,
    format,
    availableFormats,
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
    budgetFit,
  } = ctx;

  switch (id) {
    /* First, before any rate is shown anywhere on the page.
       It used to sit two cards further down, which meant the first
       number a visitor met was the DEAREST sector's day rate, quoted
       before they had said a word about themselves — a school or an
       NGO had to read the corporate number and then work downwards.
       Asking who is asking first means every figure below is already
       the reader's own. */
    case "organizerType":
      return (
        <RateFactorField
          question={QUESTIONS.organizerType}
          // The sector sets the rate rather than adding to it, so the chip
          // shows the resulting day rate — the number the quote will use —
          // instead of a ratio the reader would only try to negotiate down.
          impact={organizer.mission ? "Concessionary rate" : `${formatPHP(activeDayRate)}/day`}
          active
        >
          <Select
            value={input.organizerType}
            onValueChange={(v) => set("organizerType", v as OrganizerTypeId)}
          >
            <SelectTrigger id={QUESTIONS.organizerType.id} className={SELECT_TRIGGER}>
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
          <Note note={note} />
          {/* The day rate, restated as what it costs per person.
              Both numbers are true, and this is the one the reader can take
              to whoever holds the budget: a day rate invites "for ONE day?",
              where a per-head figure invites a comparison with what a seat
              at an open program costs. Placed here rather than in the
              results because this is where the day rate first appears, and
              so this is where it first needs the context. */}
          {perHeadLine && <p className="mt-1.5 text-xs text-muted-foreground">{perHeadLine}</p>}
        </RateFactorField>
      );

    case "engagementType":
      return (
        <RateFactorField
          question={QUESTIONS.engagementType}
          impact={`from ${formatPHP(
            deriveDayRate(
              engagementType.id === "facilitation"
                ? FACILITATION_SCOPES[0].dayRate
                : engagementType.id === "team-building"
                  ? TEAM_BUILDING_DAY_RATE
                  : DAY_RATE_MIN,
              // Facilitation is scaled by its own sector multiplier, so the
              // chip has to resolve it the way the engine does or the two
              // ladders disagree on one screen.
              sectorMultiplier(organizer, engagementType.id)
            )
          )}/day`}
          active
        >
          <Select
            value={input.engagementType}
            onValueChange={(v) => ctx.setEngagementType(v as EngagementTypeId)}
          >
            <SelectTrigger id={QUESTIONS.engagementType.id} className={SELECT_TRIGGER}>
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
          <Note note={note} />
        </RateFactorField>
      );

    case "format":
      return (
        <RateFactorField
          question={QUESTIONS.format}
          impact={`${format.dayEquivalent} day${format.dayEquivalent === 1 ? "" : "s"} each`}
          active
        >
          <Select value={input.format} onValueChange={(v) => set("format", v as EngagementFormatId)}>
            <SelectTrigger id={QUESTIONS.format.id} className={SELECT_TRIGGER}>
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
          <Note note={note} />
        </RateFactorField>
      );

    case "sessions":
      return (
        <RateFactorField
          question={QUESTIONS.sessions}
          // Rounded the way the engine rounds it: 0.6 × 3 in raw float is
          // 1.7999999999999998, which rendered verbatim in the chip.
          impact={`${dayEquivalentsPreview} engagement day${
            dayEquivalentsPreview === 1 ? "" : "s"
          }`}
          active={input.sessions > 1}
        >
          <IntegerInput
            id={QUESTIONS.sessions.id}
            min={1}
            max={30}
            value={input.sessions}
            onChange={(v) => {
              set("sessions", v);
              // The session count decides how many dates the engagement
              // spans, so an existing check no longer covers it. Leaving it
              // on screen showed a one-date "Open" beside a three-date quote.
              ctx.resetAvailability();
            }}
          />
          <Note note={note} />
        </RateFactorField>
      );

    case "complexity":
      return (
        <RateFactorField
          question={QUESTIONS.complexity}
          impact={`${formatPHP(
            deriveDayRate(complexity.dayRate, sectorMultiplier(organizer, "speaking"))
          )}/day`}
          active
        >
          <Select value={input.complexity} onValueChange={(v) => set("complexity", v as ComplexityId)}>
            <SelectTrigger id={QUESTIONS.complexity.id} className={SELECT_TRIGGER}>
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
                    trailing={`${formatPHP(
                      deriveDayRate(tier.dayRate, sectorMultiplier(organizer, "speaking"))
                    )}/day`}
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Note note={note} />
        </RateFactorField>
      );

    case "facilitationScope":
      return (
        <RateFactorField
          question={QUESTIONS.facilitationScope}
          impact={`${formatPHP(
            deriveDayRate(facilitationScope.dayRate, sectorMultiplier(organizer, "facilitation"))
          )}/day`}
          active
        >
          <Select
            value={input.facilitationScope}
            onValueChange={(v) => set("facilitationScope", v as FacilitationScopeId)}
          >
            <SelectTrigger id={QUESTIONS.facilitationScope.id} className={SELECT_TRIGGER}>
              <SelectValue>{facilitationScope.label}</SelectValue>
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              {FACILITATION_SCOPES.map((option) => (
                <SelectItem key={option.id} value={option.id} textValue={option.label}>
                  <OptionText
                    label={option.label}
                    detail={option.detail}
                    trailing={`${formatPHP(
                      deriveDayRate(option.dayRate, sectorMultiplier(organizer, "facilitation"))
                    )}/day`}
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Note note={note} />
        </RateFactorField>
      );

    case "preparation":
      return (
        <RateFactorField
          question={QUESTIONS.preparation}
          impact={preparationDaysLabel}
          active={preparationOption.days > 0}
        >
          <Select value={input.preparation} onValueChange={(v) => set("preparation", v)}>
            <SelectTrigger id={QUESTIONS.preparation.id} className={SELECT_TRIGGER}>
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
          <Note note={note} />
        </RateFactorField>
      );

    case "output":
      return (
        <RateFactorField
          question={QUESTIONS.output}
          impact={outputDaysLabel}
          active={outputOption.days > 0}
        >
          <Select value={input.output} onValueChange={(v) => set("output", v)}>
            <SelectTrigger id={QUESTIONS.output.id} className={SELECT_TRIGGER}>
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
          <Note note={note} />
        </RateFactorField>
      );

    case "startDate":
      return (
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
            value={ctx.startDate}
            min={ctx.now || undefined}
            onChange={(e) => {
              if (isValidISODate(e.target.value)) {
                ctx.setChosenDate(e.target.value);
                ctx.resetAvailability();
              }
            }}
          />
          <Note note={note} />
          {quote && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {quote.schedule.reason}. {quote.daysOfNotice} days of notice.
            </p>
          )}
        </RateFactorField>
      );

    case "region":
      return (
        <RateFactorField
          question={QUESTIONS.region}
          impact={
            isRemote
              ? "No travel"
              : region.travelDays > 0
                ? // Read off the quote where there is one. Computing it here
                  // instead showed ₱3,750 beside the ₱3,800 the engine
                  // charges, since fee lines quote to the nearest ₱100.
                  `+${formatPHP(
                    quote?.lines.find((l) => l.kind === "travel")?.amount ??
                      TRAVEL_DAY_FEE * region.travelDays
                  )} travel time`
                : "No travel"
          }
          active={!isRemote && region.travelDays > 0}
        >
          <Select
            value={input.region}
            onValueChange={(v) => set("region", v as RegionId)}
            disabled={isFieldDisabled("region", input)}
          >
            <SelectTrigger id={QUESTIONS.region.id} className={SELECT_TRIGGER}>
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
          <Note note={note} />
          {isRemote && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              An online session has no travel, so the location does not affect the quote.
            </p>
          )}
        </RateFactorField>
      );

    case "returningClient":
      return (
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
              {input.returningClient
                ? "Yes, we have worked together"
                : "This would be the first time"}
            </span>
          </div>
          <Note note={note} />
        </RateFactorField>
      );

    case "ticketed":
      return (
        <RateFactorField
          question={QUESTIONS.ticketed}
          impact={
            quote && quote.projectedRevenue > 0
              ? `Registrations ${formatPHP(quote.projectedRevenue)}`
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
          <Note note={note} />
        </RateFactorField>
      );

    case "participantFee":
      return (
        <RateFactorField question={QUESTIONS.participantFee} labelMode="child">
          <CurrencyInput
            id={QUESTIONS.participantFee.id}
            label={QUESTIONS.participantFee.label}
            value={input.participantFee}
            onChange={(v) => set("participantFee", v)}
            min={0}
          />
          <Note note={note} />
        </RateFactorField>
      );

    case "expectedPaidAttendees":
      return (
        <RateFactorField question={QUESTIONS.expectedPaidAttendees}>
          <IntegerInput
            id={QUESTIONS.expectedPaidAttendees.id}
            min={0}
            max={100000}
            value={input.expectedPaidAttendees}
            onChange={(v) => set("expectedPaidAttendees", v)}
            placeholder={String(input.audienceSize)}
          />
          <Note note={note} />
        </RateFactorField>
      );

    /* Last in the card on purpose. Asking for a budget before the
       organizer has seen a single number reads as "how much have you
       got"; asking it after the rate card has explained itself reads as
       "tell me what to build for what you have". */
    case "budget":
      return (
        <RateFactorField
          question={QUESTIONS.budget}
          labelMode="child"
          impact={
            budgetFit
              ? budgetFit.withinBudget
                ? `${formatPHP(budgetFit.difference)} to spare`
                : `${formatPHP(budgetFit.difference)} over`
              : "Not stated"
          }
          active={Boolean(budgetFit && !budgetFit.withinBudget)}
        >
          <CurrencyInput
            id={QUESTIONS.budget.id}
            label={QUESTIONS.budget.label}
            value={input.budget}
            onChange={(v) => set("budget", v)}
            min={0}
            // Matched to the engine's own clamp. Without it a typed
            // ₱9,999,999,999 would be clamped out of sight and the panel
            // would quote a budget back that nobody had entered.
            max={1_000_000_000}
            placeholder="Leave blank if you would rather not say"
          />
          <Note note={note} />
        </RateFactorField>
      );

    case "audienceSize":
      return (
        <RateFactorField
          question={QUESTIONS.audienceSize}
          impact={factorImpact(audienceBand.factor)}
          active={audienceBand.factor !== 1}
        >
          <IntegerInput
            id={QUESTIONS.audienceSize.id}
            min={1}
            max={100000}
            value={input.audienceSize}
            onChange={(v) => set("audienceSize", v)}
          />
          <Note note={note} />
        </RateFactorField>
      );

    case "audienceProfile":
      return (
        <RateFactorField
          question={QUESTIONS.audienceProfile}
          impact={factorImpact(audienceProfile.factor)}
          active={audienceProfile.factor !== 1}
        >
          <Select
            value={input.audienceProfile}
            onValueChange={(v) => set("audienceProfile", v as AudienceProfileId)}
          >
            <SelectTrigger id={QUESTIONS.audienceProfile.id} className={SELECT_TRIGGER}>
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
          <Note note={note} />
        </RateFactorField>
      );

    case "earlyStart":
      return (
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
          <Note note={note} />
        </RateFactorField>
      );

    case "travelCovered":
      return (
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
              {input.travelCovered ? "Yes, we will shoulder it" : "No, please bill it to us"}
            </span>
          </div>
          <Note note={note} />
        </RateFactorField>
      );

    case "accommodationCovered":
      return (
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
                ? "Yes, we will shoulder it"
                : "No, please bill it to us"}
            </span>
          </div>
          <Note note={note} />
        </RateFactorField>
      );

    case "invoiceRequired":
      return (
        <RateFactorField
          question={QUESTIONS.invoiceRequired}
          impact={input.invoiceRequired ? `Issued by ${INVOICING_ENTITY.name}` : "Billed personally"}
          active={input.invoiceRequired}
        >
          <div className="flex items-center gap-3">
            <Switch
              id={QUESTIONS.invoiceRequired.id}
              checked={input.invoiceRequired}
              onCheckedChange={(v) => set("invoiceRequired", v)}
            />
            <span className="text-sm text-muted-foreground">
              {input.invoiceRequired ? "We need an official invoice" : "No invoice needed"}
            </span>
          </div>
          <Note note={note} />
        </RateFactorField>
      );

    case "addOns":
      return (
        <RateFactorField
          question={QUESTIONS.addOns}
          labelMode="group"
          impact={input.addOns.length ? `${input.addOns.length} selected` : "None"}
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
                          : input.addOns.filter((existing) => existing !== addOn.id)
                      )
                    }
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <Label htmlFor={`addon-${addOn.id}`} className="font-medium">
                      {addOn.label}
                      <span className="ml-2 font-mono text-[11px] text-ochre-deep dark:text-ochre tabular">
                        {addOn.factor
                          ? `+${Math.round(addOn.factor * 100)}%`
                          : `+${formatPHP(addOn.amount ?? 0)}`}
                      </span>
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">{addOn.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <Note note={note} />
        </RateFactorField>
      );
  }
}

/**
 * The three free-text fields that never enter the price.
 *
 * Kept out of the registry — they have no QUESTIONS entry and no impact chip —
 * but shared between the full form and the reading panel so the markup exists
 * once.
 */
export function IdentityFields({ ctx }: { ctx: FieldContext }) {
  const { input, set } = ctx;
  return (
    <>
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
        <Label htmlFor="organization">Organization</Label>
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
    </>
  );
}

/** The full form's groupings, in the order it has always shown them. */
export const CARD_ONE: FieldId[] = [
  "organizerType",
  "engagementType",
  "format",
  "sessions",
  "complexity",
  "facilitationScope",
  "preparation",
  "output",
];
export const CARD_TWO_BEFORE_CALENDAR: FieldId[] = ["startDate"];
export const CARD_TWO_AFTER_CALENDAR: FieldId[] = ["region"];
export const CARD_THREE: FieldId[] = [
  "returningClient",
  "ticketed",
  "participantFee",
  "expectedPaidAttendees",
  "budget",
];
export const DETAILS_BEFORE_IDENTITY: FieldId[] = ["audienceSize", "audienceProfile"];
export const DETAILS_AFTER_IDENTITY: FieldId[] = [
  "earlyStart",
  "travelCovered",
  "accommodationCovered",
  "invoiceRequired",
  "addOns",
];

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { visibleFieldIds, type FieldId } from "@/lib/speaking/intake-state";
import { AvailabilityPanel } from "./availability-panel";
import { DetailSection } from "./detail-section";
import {
  QuotationFields,
  IdentityFields,
  ContactFields,
  CARD_ONE,
  CARD_TWO_BEFORE_CALENDAR,
  CARD_TWO_AFTER_CALENDAR,
  CARD_THREE,
  DETAILS_BEFORE_IDENTITY,
  DETAILS_AFTER_IDENTITY,
  type FieldContext,
} from "./quotation-fields";

interface FullFormProps {
  ctx: FieldContext;
  availability: {
    report: React.ComponentProps<typeof AvailabilityPanel>["report"];
    isChecking: boolean;
    error: string | null;
    check: (startDate: string, sessions: number) => void;
  };
  ready: boolean;
}

/**
 * Every question in one scroll — the escape hatch, and the page's whole
 * content when there is no API key to read a description with.
 *
 * Reachable from the opening panel's skip link and from the reading panel, and
 * kept complete on purpose: an organizer who chooses the form over the prose
 * box must not find a smaller form than the one the reading panel can reach.
 */
export function FullForm({ ctx, availability, ready }: FullFormProps) {
  const applicable = visibleFieldIds(ctx.input);
  const visible = (group: FieldId[]) => group.filter((id) => applicable.includes(id));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Who is asking, and what for?</CardTitle>
          <CardDescription>
            These are the answers that set the rate. Everything after them only adjusts it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* First, before any rate is shown anywhere on the page.
              It used to sit two cards further down, which meant the first
              number a visitor met was the DEAREST sector's day rate, quoted
              before they had said a word about themselves — a school or an
              NGO had to read the corporate number and then work downwards.
              Asking who is asking first means every figure below is already
              the reader's own. */}
          <QuotationFields ids={visible(CARD_ONE)} ctx={ctx} />
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
          <QuotationFields ids={visible(CARD_TWO_BEFORE_CALENDAR)} ctx={ctx} />
          <AvailabilityPanel
            report={availability.report}
            isChecking={availability.isChecking}
            error={availability.error}
            onCheck={() => availability.check(ctx.startDate, ctx.input.sessions)}
            disabled={!ready}
          />
          <QuotationFields ids={visible(CARD_TWO_AFTER_CALENDAR)} ctx={ctx} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>And a little more about you</CardTitle>
          <CardDescription>
            Whether we have met before, whether participants pay, and what you have to work with.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <QuotationFields ids={visible(CARD_THREE)} ctx={ctx} />
        </CardContent>
      </Card>

      <DetailSection
        title="Anything else I should know?"
        summary="Room size, the venue, travel arrangements, invoicing, extras. All optional — the quote above already assumes sensible answers, and everything you set here shows on it."
      >
        <QuotationFields ids={visible(DETAILS_BEFORE_IDENTITY)} ctx={ctx} />
        <IdentityFields ctx={ctx} />
        <QuotationFields ids={visible(DETAILS_AFTER_IDENTITY)} ctx={ctx} />
      </DetailSection>

      {/* Last, and outside the collapsed section: it is the block the send
          button waits on, so it belongs immediately above it. */}
      <Card>
        <CardContent className="pt-6">
          <ContactFields ctx={ctx} />
        </CardContent>
      </Card>
    </>
  );
}

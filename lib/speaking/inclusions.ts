/**
 * What the organizer actually GETS, and what a comparable seat costs elsewhere.
 *
 * The quotation was, for its whole life, an explanation of cost. Every line
 * said why the number is what it is; not one said what arrives. That is a
 * strange document to hand someone: it argues the price without ever
 * describing the thing being priced, so a reader with no other information
 * concludes the only thing available to conclude — that it is expensive.
 *
 * Nothing here is invented. Every inclusion is read off a choice already on
 * the rate card: the format says what happens in the room, the subject tier
 * says what is rebuilt beforehand, the add-ons say what was bought on top.
 * Those facts were all present and all buried — the format's "materials and
 * facilitation included" sat inside a dropdown that closes the moment you
 * choose it.
 *
 * The exclusions are here for the same reason, and are worth more than they
 * look. A list of what is NOT covered reads as confidence rather than
 * meanness, and it settles on paper the arguments that otherwise happen on the
 * day, in front of participants, about who was supposed to bring the projector.
 */

import {
  ADD_ONS,
  AUDIENCE_BANDS,
  DATE_HOLD_DAYS,
  INVOICING_ENTITY,
  PUBLIC_COURSE_RATE_MIN,
  PUBLIC_COURSE_RATE_MAX,
  audienceProfileFor,
  complexityTierFor,
  engagementTypeFor,
  formatLabel,
  outputOptionFor,
  preparationOptionFor,
  ENGAGEMENT_FORMATS,
  type EngagementFormatId,
} from "./rate-card";
import type { QuotationInput } from "./quotation";

export interface Inclusion {
  id: string;
  /** The thing itself, as a noun the organizer could put in a purchase order. */
  label: string;
  /** What it means in practice. Never a sales line. */
  detail: string;
}

/**
 * The quote set against what the same training costs bought a seat at a time.
 *
 * This is the one comparison worth making, and it is only worth making because
 * it is checkable: Philippine open-enrollment programs are quoted per
 * participant per day, so an in-house day divided by heads lands in the same
 * unit. It is also the comparison that can go the other way, and says so when
 * it does — below the break-even head count the organizer genuinely should
 * send people to an open course instead, and a quotation that admits that is
 * worth more than one that does not.
 */
export interface ValueComparison {
  /** What this engagement costs per participant, per day in the room. */
  perParticipantPerDay: number;
  /** The published range for an open-enrollment seat, per participant per day. */
  publicMin: number;
  publicMax: number;
  /** Head count at which in-house becomes the cheaper of the two. */
  breakEvenParticipants: number;
  /** True when this engagement already beats the cheapest open-course seat. */
  cheaperThanSendingThem: boolean;
  /** What sending this same group to the cheapest open course would cost. */
  costOfSendingThem: number;
}

export interface Deliverables {
  included: Inclusion[];
  excluded: string[];
  /** Null where nothing comparable is sold by the seat — see below. */
  comparison: ValueComparison | null;
}

/**
 * Formats with an open-enrollment equivalent.
 *
 * A workshop competes with a public course; a keynote does not. Nobody sells
 * seats to a 90-minute plenary by the head, so putting a per-seat comparison
 * beside one would be arithmetic without a referent — the most expensive kind
 * of number to be caught using.
 */
const COMPARABLE_FORMATS: EngagementFormatId[] = ["half-day", "full-day", "webinar"];

/** Peso amounts round to the nearest peso here; these are per-head figures. */
const peso = (n: number) => Math.round(n);

/**
 * Re-prices the same engagement for a different head count.
 *
 * Injected rather than imported, because the engine imports this file. It also
 * has to exist at all: the break-even below cannot be `total / rate`, since
 * the total is not fixed — a bigger room carries a bigger audience factor, so
 * the fee being divided moves as the divisor does. Dividing the current total
 * by the open-course rate produced a threshold that the engine then
 * contradicted, and the two claims sat one sentence apart on the page.
 */
export type PriceAtHeadCount = (audienceSize: number) => number;

export function buildDeliverables(
  input: QuotationInput,
  quote: { total: number; dayEquivalents: number; audienceSize: number },
  priceAt: PriceAtHeadCount
): Deliverables {
  const engagementType = engagementTypeFor(input.engagementType);
  const format =
    ENGAGEMENT_FORMATS.find((f) => f.id === input.format) ?? ENGAGEMENT_FORMATS[0];
  const isFacilitation = engagementType.id === "facilitation";
  const isTeamBuilding = engagementType.id === "team-building";
  const included: Inclusion[] = [];

  // 1. The room itself, in hours rather than in day-equivalents. A reader
  //    checking what they bought wants "6 to 8 hours", not "1.0 day".
  included.push({
    id: "sessions",
    label:
      input.sessions > 1
        ? `${input.sessions} × ${formatLabel(format, engagementType.id).toLowerCase()}`
        : formatLabel(format, engagementType.id),
    detail: format.detail,
  });

  // 2. The preparation. This is the largest single thing being bought and the
  //    only one the organizer never sees, which is exactly why it belongs on
  //    the list of what they get rather than only in the reasons for the price.
  if (isFacilitation) {
    const preparation = preparationOptionFor(input.preparation);
    if (preparation.days > 0) {
      included.push({
        id: "preparation",
        label: preparation.label,
        detail: `${preparation.detail}, so the session opens on the real questions instead of arriving at them by lunch`,
      });
    }
    const output = outputOptionFor(input.output);
    if (output.days > 0) {
      included.push({
        id: "output",
        label: output.label,
        detail: output.detail,
      });
    }
  } else if (!isTeamBuilding) {
    const tier = complexityTierFor(input.complexity);
    included.push({
      id: "preparation",
      label: "The build behind the session",
      detail: `${tier.detail}. This is the part nobody sees, and it is most of what you are paying for.`,
    });
  } else {
    included.push({
      id: "preparation",
      label: "Activities designed for this group",
      detail:
        "Not a standard set run in a different room — the activities are chosen for the group you described and what you want them to be like afterwards.",
    });
  }

  // 3. Materials, only where the format actually promises them. A keynote does
  //    not, and claiming it did would be the first false line on the page.
  if (format.detail.includes("materials") || format.detail.includes("exercises")) {
    // Worded for the kind of work it is. "Worked examples" is training
    // language and says nothing true about a planning room, where what gets
    // handed over is the templates and whatever the room produced on them.
    included.push({
      id: "materials",
      label: isFacilitation
        ? "The materials the session runs on"
        : "The exercises and worked examples",
      detail: isFacilitation
        ? "The templates and worksheets used in the room, and everything your people fill in on them, handed over afterwards."
        : `Everything used on the day, in a form you can reproduce for all ${quote.audienceSize.toLocaleString(
            "en-PH"
          )} without asking again.`,
    });
  }

  // 4. Pitching. Only listed where the audience profile actually changed the
  //    build — otherwise it is a line that says nothing.
  if (!isTeamBuilding) {
    const profile = audienceProfileFor(input.audienceProfile);
    if (profile.factor > 1) {
      included.push({
        id: "audience-profile",
        label: `Pitched at ${profile.label.toLowerCase()}`,
        detail: profile.detail,
      });
    }
  }

  // 5. Whatever was bought on top.
  for (const addOn of ADD_ONS.filter((a) => input.addOns.includes(a.id))) {
    included.push({ id: `addon-${addOn.id}`, label: addOn.label, detail: addOn.detail });
  }

  // 6. The paperwork. Not a throwaway: plenty of resource speakers cannot
  //    issue a registered invoice at all, and an organization that can only pay
  //    against one has had engagements fall over for exactly this.
  if (input.invoiceRequired) {
    included.push({
      id: "invoice",
      label: `A registered invoice from ${INVOICING_ENTITY.name}`,
      detail:
        "Issued in your organization's name, so your accounting can process payment the normal way rather than as a special case.",
    });
  }

  // 7. The hold. It costs the organizer nothing and is worth something real:
  //    it is the difference between a quotation and a booking.
  included.push({
    id: "hold",
    label: `The date, held for ${DATE_HOLD_DAYS} days`,
    detail:
      "Nobody else is offered it in the meantime, and no deposit is needed to keep it — you have that long to get the approval you need.",
  });

  // Exclusions ---------------------------------------------------------------
  const excluded: string[] = [];
  if (!format.remote) {
    excluded.push("The venue, and the projector, sound and internet in it");
    excluded.push("Meals, snacks and accommodation for your participants");
  } else {
    excluded.push("The meeting platform and its license — the session runs on yours");
  }
  excluded.push("Printing and reproduction of the handouts for participants");
  // The catch-all is the useful one. Everything argued about on the day is
  // something neither side thought to name beforehand.
  excluded.push(
    "Anything not listed above — if you need it, say so now rather than on the day, when it is dearer and harder"
  );

  return {
    included,
    excluded,
    comparison: comparisonFor(input, format.id, quote, priceAt),
  };
}

/**
 * The smallest head count at which running it in-house beats the cheapest
 * open-course seat.
 *
 * Computed against the real fee at each size rather than against this quote's
 * total. Within one audience band the fee does not move at all, so cost per
 * head falls as the band fills and the crossing point is simply
 * fee ÷ (rate × days); it is only at a band boundary that the fee steps up.
 * So probing each band once is exact, and costs five re-prices rather than
 * three hundred.
 */
function breakEvenFor(
  days: number,
  priceAt: PriceAtHeadCount
): number | null {
  let lower = 1;
  for (const band of AUDIENCE_BANDS) {
    // Any size inside the band prices the same; the top of it is a size that
    // certainly exists. The unbounded last band is probed above its floor.
    const probe = Number.isFinite(band.max) ? band.max : lower + 1;
    const crossing = Math.ceil(priceAt(probe) / (PUBLIC_COURSE_RATE_MIN * days));
    // Below the band's floor means the band is already cheap enough at its
    // smallest size, so the floor itself is the answer.
    const withinBand = Math.max(crossing, lower);
    if (withinBand <= band.max) return withinBand;
    lower = band.max + 1;
  }
  return null;
}

function comparisonFor(
  input: QuotationInput,
  formatId: EngagementFormatId,
  quote: { total: number; dayEquivalents: number; audienceSize: number },
  priceAt: PriceAtHeadCount
): ValueComparison | null {
  const engagementType = engagementTypeFor(input.engagementType);
  // Facilitation is excluded on principle rather than on arithmetic: nobody in
  // a planning room is a seat, and there is no open-enrollment strategic plan
  // to compare against.
  if (engagementType.id === "facilitation") return null;
  if (!COMPARABLE_FORMATS.includes(formatId)) return null;
  if (quote.audienceSize < 1 || quote.dayEquivalents <= 0) return null;

  const perParticipantPerDay = peso(quote.total / quote.audienceSize / quote.dayEquivalents);
  const costOfSendingThem = peso(
    PUBLIC_COURSE_RATE_MIN * quote.audienceSize * quote.dayEquivalents
  );
  // Compared against the BOTTOM of the published range, never the middle. A
  // comparison that only works against the dearest competitor is a sales
  // trick; one that holds against the cheapest is an argument.
  const breakEvenParticipants = breakEvenFor(quote.dayEquivalents, priceAt);
  if (breakEvenParticipants === null) return null;

  return {
    perParticipantPerDay,
    publicMin: PUBLIC_COURSE_RATE_MIN,
    publicMax: PUBLIC_COURSE_RATE_MAX,
    breakEvenParticipants,
    cheaperThanSendingThem: perParticipantPerDay < PUBLIC_COURSE_RATE_MIN,
    costOfSendingThem,
  };
}

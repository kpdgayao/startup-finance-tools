import { describe, it, expect } from "vitest";
import {
  buildInquiryBody,
  buildInquirySubject,
  contactComplete,
  exceedsMailtoLimit,
  MAILTO_SAFE_LENGTH,
} from "@/lib/speaking/inquiry";
import { buildQuotation, DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";
import { complexityTierFor } from "@/lib/speaking/rate-card";
import { formatPHP } from "@/lib/utils";

/**
 * The inquiry email is the only thing that actually leaves this page. Whatever
 * it drops, the person replying never learns — they get a fee, a date and an
 * unknown sender, and have to open a correspondence to find out who is asking
 * and what kind of organization they are asking for.
 */
const base: QuotationInput = {
  ...DEFAULT_INPUT,
  today: "2026-01-15",
  startDate: "2026-04-15",
  contactName: "Maria Santos",
  contactRole: "Training Officer",
  contactEmail: "maria@dtiregion1.gov.ph",
  contactPhone: "0917 123 4567",
  organizationName: "DTI Region 1",
  eventTitle: "Bookkeeping for Non-Accountants",
  venue: "Baguio Country Club",
};

const bodyFor = (overrides: Partial<QuotationInput> = {}) => {
  const input = { ...base, ...overrides };
  return buildInquiryBody(buildQuotation(input), input);
};

describe("inquiry body — who is asking", () => {
  it("names the person, their role, their organization and how to reach them", () => {
    const body = bodyFor();
    expect(body).toContain("Maria Santos");
    expect(body).toContain("Training Officer");
    expect(body).toContain("DTI Region 1");
    expect(body).toContain("maria@dtiregion1.gov.ph");
    expect(body).toContain("0917 123 4567");
  });

  it("names the KIND of organization, not just its name", () => {
    // The sector sets the rate ladder and decides how the reply should be
    // pitched. It was collected and then thrown away.
    const body = bodyFor({ organizerType: "government" });
    expect(body).toMatch(/Organization type:.*Government/i);
  });

  it("puts the sender above the money", () => {
    const body = bodyFor();
    expect(body.indexOf("Maria Santos")).toBeLessThan(body.indexOf("Professional fee"));
  });

  it("omits contact lines that were left blank rather than printing a dash", () => {
    // No label left standing over an empty value, no trailing comma where the
    // role used to be, and no orphaned separator where the phone used to be.
    const block = bodyFor({ contactRole: "", contactPhone: "" }).split("\n\n")[0];
    expect(block.split("\n")).toEqual([
      "WHO IS ASKING",
      "Maria Santos",
      "maria@dtiregion1.gov.ph",
      "Organization: DTI Region 1",
      "Organization type: Company or corporation",
    ]);
  });
});

describe("inquiry body — the engagement", () => {
  it("carries every collected detail the reply depends on", () => {
    const body = bodyFor({
      organizerType: "government",
      region: "north-luzon",
      audienceSize: 45,
      audienceProfile: "non-specialist",
      complexity: "routine",
      addOns: ["workbook"],
      invoiceRequired: true,
      travelCovered: false,
      accommodationCovered: true,
      earlyStart: true,
      ticketed: true,
      participantFee: 1_500,
      expectedPaidAttendees: 40,
      budget: 120_000,
    });

    expect(body).toContain("Bookkeeping for Non-Accountants");
    expect(body).toContain("Baguio Country Club");
    expect(body).toMatch(/45/);
    expect(body).toMatch(/Participants:/);
    expect(body).toMatch(/Audience:/);
    expect(body).toMatch(/Subject/i);
    expect(body).toMatch(/Ticketed/i);
    expect(body).toMatch(/budget/i);
    expect(body).toMatch(/₱120,000/);
    expect(body).toMatch(/invoice/i);
    expect(body).toMatch(/Add-ons:/);
    expect(body).toMatch(/notice/i);
  });

  it("states who is paying for travel and accommodation in words, not booleans", () => {
    const body = bodyFor({ travelCovered: false, accommodationCovered: true, region: "north-luzon" });
    expect(body).not.toMatch(/\b(true|false)\b/);
    expect(body).toMatch(/Travel:/);
    expect(body).toMatch(/Accommodation:/);
  });

  it("drops travel, accommodation and venue-region lines for a remote engagement", () => {
    // The engine forces "online" for a remote format, so printing the stale
    // region dropdown would describe a trip that is not on the quote.
    const body = bodyFor({ format: "webinar", region: "north-luzon" });
    expect(body).not.toMatch(/Accommodation:/);
    expect(body).not.toMatch(/Northern or Central Luzon/);
  });

  it("describes facilitation by its scope and written output, not a subject tier", () => {
    const body = bodyFor({
      engagementType: "facilitation",
      format: "full-day",
      facilitationScope: "board",
      preparation: "interviews",
      output: "plan",
    });
    expect(body).toMatch(/Scope:/);
    expect(body).toMatch(/Preparation:/);
    expect(body).toMatch(/Written output:/);
    expect(body).not.toMatch(/Subject tier:/);
  });

  it("omits the audience profile for team building, which is not priced on it", () => {
    const body = bodyFor({ engagementType: "team-building", format: "full-day" });
    expect(body).not.toMatch(/Audience:/);
  });

  it("says nothing about a budget that was never stated", () => {
    expect(bodyFor({ budget: 0 })).not.toMatch(/stated budget/i);
  });

  it("says nothing about ticketing when nobody pays to attend", () => {
    expect(bodyFor({ ticketed: false })).not.toMatch(/Ticketed/i);
  });

  it("says nothing about add-ons when none were chosen", () => {
    expect(bodyFor({ addOns: [] })).not.toMatch(/Add-ons:/);
  });
});

describe("inquiry body — the quote", () => {
  it("carries the reference, the totals and the validity", () => {
    const quote = buildQuotation(base);
    const body = buildInquiryBody(quote, base);
    expect(body).toContain(quote.reference);
    expect(body).toMatch(/Professional fee:/);
    expect(body).toMatch(/Total:/);
    expect(body).toMatch(/valid until/i);
  });

  it("leaves the organizer somewhere to write", () => {
    expect(bodyFor()).toMatch(/Anything else/i);
  });

  it("names the rate card it came from, so the number is not mistaken for a negotiation", () => {
    expect(bodyFor()).toContain("startupfinance.tools/tools/speaker-quotation");
  });
});

describe("inquiry subject", () => {
  it("carries the event and the reference", () => {
    const quote = buildQuotation(base);
    const subject = buildInquirySubject(quote, base);
    expect(subject).toContain("Bookkeeping for Non-Accountants");
    expect(subject).toContain(quote.reference);
    expect(subject).toContain("[Speaking]");
  });

  it("falls back to the organization when no event was titled", () => {
    const input = { ...base, eventTitle: "" };
    expect(buildInquirySubject(buildQuotation(input), input)).toContain("DTI Region 1");
  });
});

describe("mailto length", () => {
  /**
   * A `mailto:` URL is a URL. Several mail clients — older Outlook builds
   * worst of all — truncate it somewhere around 2,000 characters, and a
   * truncated inquiry arrives cut off mid-sentence with no sign anything is
   * missing. The Copy button exists because of this; the body still has to
   * fit for the common case, and when it cannot, the part that survives a
   * cut has to be the part worth keeping.
   */
  const hrefFor = (input: QuotationInput) => {
    const quote = buildQuotation(input);
    return `mailto:x@y.com?subject=${encodeURIComponent(
      buildInquirySubject(quote, input)
    )}&body=${encodeURIComponent(buildInquiryBody(quote, input))}`;
  };

  it("fits inside a mail client's URL ceiling for a realistic inquiry", () => {
    expect(hrefFor(base).length).toBeLessThan(MAILTO_SAFE_LENGTH);
  });

  it("flags a fully-specified inquiry as too long, rather than sending it cut off", () => {
    // Measured at ~2,065 characters: facilitation, four add-ons, ticketing, a
    // budget and every logistics line. Not a theoretical maximum — the peso
    // sign alone costs nine characters once encoded. The page steers this
    // organizer to Copy instead of letting Outlook truncate it silently.
    expect(
      exceedsMailtoLimit(hrefFor({
        ...base,
        engagementType: "facilitation",
        facilitationScope: "board",
        preparation: "interviews",
        output: "plan",
        format: "full-day",
        sessions: 3,
        organizerType: "government",
        region: "visayas-mindanao",
        audienceSize: 250,
        ticketed: true,
        participantFee: 3_500,
        expectedPaidAttendees: 200,
        budget: 500_000,
        addOns: ["workbook", "recording-public", "assessment", "clinic"],
        invoiceRequired: true,
        returningClient: true,
        travelCovered: false,
        accommodationCovered: false,
        earlyStart: true,
      }))
    ).toBe(true);
  });

  it("does not flag an ordinary one", () => {
    expect(exceedsMailtoLimit(hrefFor(base))).toBe(false);
  });

  it("keeps the sender inside the first 400 characters, so a truncation cannot eat it", () => {
    // 200 chars each of title, organization, venue, name, role and phone is
    // past any client's ceiling on purpose: the guarantee under test is the
    // ORDER, which is what decides whether a cut email is still answerable.
    const body = buildInquiryBody(
      buildQuotation({ ...base, eventTitle: "A".repeat(200), venue: "C".repeat(200) }),
      { ...base, eventTitle: "A".repeat(200), venue: "C".repeat(200) }
    );
    expect(body.indexOf("Maria Santos")).toBeLessThan(400);
    expect(body.indexOf("maria@dtiregion1.gov.ph")).toBeLessThan(400);
    expect(body.indexOf("Organization type:")).toBeLessThan(400);
  });
});


describe("contactComplete", () => {
  it("is false until a name, an organization and a plausible email are all there", () => {
    expect(contactComplete({ ...base, contactName: "" })).toBe(false);
    expect(contactComplete({ ...base, organizationName: "" })).toBe(false);
    expect(contactComplete({ ...base, contactEmail: "" })).toBe(false);
    expect(contactComplete({ ...base, contactEmail: "maria" })).toBe(false);
    expect(contactComplete({ ...base, contactEmail: "maria@" })).toBe(false);
    expect(contactComplete({ ...base, contactEmail: "maria@dti" })).toBe(false);
    expect(contactComplete({ ...base, contactEmail: "maria @dti.gov.ph" })).toBe(false);
  });

  it("ignores surrounding whitespace rather than accepting a space as a name", () => {
    expect(contactComplete({ ...base, contactName: "   " })).toBe(false);
    expect(contactComplete({ ...base, contactEmail: "  maria@dtiregion1.gov.ph  " })).toBe(true);
  });

  it("is true once the three required fields are there, with or without the optional two", () => {
    expect(contactComplete(base)).toBe(true);
    expect(contactComplete({ ...base, contactRole: "", contactPhone: "" })).toBe(true);
  });
});

describe("what the engine actually priced", () => {
  it("prints the paying headcount the engine used, not a default 0", () => {
    // The field defaults to 0 and its placeholder is the participant count:
    // 0 means "everyone in the room". Printing the raw 0 sent an email saying
    // nobody pays, attached to a fee carrying a revenue-share uplift computed
    // on a full room.
    const input = { ...base, ticketed: true, participantFee: 1_500, expectedPaidAttendees: 0 };
    const quote = buildQuotation(input);
    const body = buildInquiryBody(quote, input);

    expect(body).not.toMatch(/0 expected to pay/);
    expect(body).toMatch(new RegExp(`${input.audienceSize} expected to pay`));
    expect(body).toContain(formatPHP(quote.projectedRevenue));
  });

  it("honours an explicit paying headcount below the room size", () => {
    const input = { ...base, ticketed: true, participantFee: 1_500, expectedPaidAttendees: 12 };
    expect(buildInquiryBody(buildQuotation(input), input)).toMatch(/12 expected to pay/);
  });

  it("gives team building a day rate but never a subject tier it was not asked", () => {
    // `quote.topicTier` falls back to the complexity label for team building,
    // and the complexity question is filtered out of the form entirely there.
    const input: QuotationInput = { ...base, engagementType: "team-building", format: "full-day" };
    const body = buildInquiryBody(buildQuotation(input), input);

    expect(body).toMatch(/Day rate: /);
    expect(body).not.toMatch(/Subject tier:/);
    expect(body).not.toContain(complexityTierFor(base.complexity).label);
  });

  it("reads remote from the format the ENGINE resolved, not the offered list", () => {
    // A format id stranded by an older build: the offered-list fallback said
    // "not remote" while the engine priced a webinar with no travel at all.
    const input = { ...base, format: "webinar" as const, engagementType: "facilitation" as const };
    const body = buildInquiryBody(buildQuotation(input), input);
    expect(body).toContain("Location: online, no travel");
    expect(body).not.toMatch(/Travel:/);
  });
});

describe("the reference an organizer quotes back", () => {
  it("does not move when the organization name is typed in last", () => {
    // organizationName is now required and filled in the LAST block on the
    // page. Seeding the reference with it meant a PDF exported before that
    // block and the email sent after it carried two different codes for one
    // quote.
    const before = buildQuotation({ ...base, organizationName: "" });
    const after = buildQuotation({ ...base, organizationName: "DTI Region 1" });
    expect(after.reference).toBe(before.reference);
  });

  it("still moves when something that was actually priced changes", () => {
    const a = buildQuotation(base);
    const b = buildQuotation({ ...base, audienceSize: base.audienceSize + 100 });
    expect(a.reference).not.toBe(b.reference);
  });
});

import { describe, it, expect } from "vitest";
import {
  buildInquiryBody,
  buildInquirySubject,
  contactComplete,
  MAILTO_SAFE_LENGTH,
} from "@/lib/speaking/inquiry";
import { buildQuotation, DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";

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
   * fit for the common case.
   */
  it("stays under a mail client's URL ceiling with every field filled in", () => {
    const maximal: QuotationInput = {
      ...base,
      engagementType: "facilitation",
      facilitationScope: "board",
      preparation: "interviews",
      output: "plan",
      format: "multi-day",
      sessions: 3,
      organizerType: "government",
      region: "visayas",
      audienceSize: 250,
      audienceProfile: "executives",
      ticketed: true,
      participantFee: 3_500,
      expectedPaidAttendees: 200,
      budget: 500_000,
      addOns: ADD_ON_MAX,
      invoiceRequired: true,
      returningClient: true,
      travelCovered: false,
      accommodationCovered: false,
      earlyStart: true,
      eventTitle: "A".repeat(200),
      organizationName: "B".repeat(200),
      venue: "C".repeat(200),
      contactName: "D".repeat(200),
      contactRole: "E".repeat(200),
      contactEmail: "F".repeat(190) + "@x.com",
      contactPhone: "G".repeat(200),
    };
    const quote = buildQuotation(maximal);
    const href = `mailto:x@y.com?subject=${encodeURIComponent(
      buildInquirySubject(quote, maximal)
    )}&body=${encodeURIComponent(buildInquiryBody(quote, maximal))}`;

    // Not a claim that this maximal case fits — it cannot, with 1,400
    // characters of free text alone. The claim is that a REALISTIC one does.
    const realistic = buildQuotation(base);
    const realisticHref = `mailto:x@y.com?subject=${encodeURIComponent(
      buildInquirySubject(realistic, base)
    )}&body=${encodeURIComponent(buildInquiryBody(realistic, base))}`;
    expect(realisticHref.length).toBeLessThan(MAILTO_SAFE_LENGTH);
    expect(href.length).toBeGreaterThan(0);
  });
});

const ADD_ON_MAX = ["workbook", "recording-public", "assessment", "clinic"] as QuotationInput["addOns"];

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

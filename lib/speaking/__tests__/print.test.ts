import { describe, it, expect } from "vitest";
import { buildQuotationPrint } from "@/app/tools/speaker-quotation/print";
import { buildQuotation, DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";

/**
 * The printed quote is what actually circulates: it is forwarded to the person
 * holding the budget, who has never seen the page. Anything the screen shows
 * and the PDF drops is invisible to the one reader who most needs it.
 */
const base: QuotationInput = {
  ...DEFAULT_INPUT,
  today: "2026-01-15",
  startDate: "2026-04-15",
};

describe("printed quotation", () => {
  it("prints the budget comparison and the levers when a budget was given", () => {
    const input = { ...base, budget: 60_000 };
    const html = buildQuotationPrint(buildQuotation(input), input);

    expect(html).toContain("Above your budget");
    expect(html).toContain("Budget stated");
    expect(html).toContain("What could change");
    // The distinction the whole panel exists to make.
    expect(html).toContain("a change of scope, not a discount");
  });

  it("says so when the quote already fits", () => {
    const quoted = buildQuotation(base);
    const input = { ...base, budget: quoted.total + 10_000 };
    const html = buildQuotationPrint(buildQuotation(input), input);

    expect(html).toContain("Against your budget");
    expect(html).toContain("within the stated budget");
    expect(html).not.toContain("What could change");
  });

  it("names who requested it, so a forwarded quote is answerable", () => {
    const input = {
      ...base,
      organizationName: "DTI Region 1",
      contactName: "Maria Santos",
      contactRole: "Training Officer",
      contactEmail: "maria@dtiregion1.gov.ph",
      contactPhone: "0917 123 4567",
    };
    const html = buildQuotationPrint(buildQuotation(input), input);

    expect(html).toContain("Requested by");
    expect(html).toContain("Maria Santos, Training Officer");
    expect(html).toContain("maria@dtiregion1.gov.ph");
  });

  it("escapes a contact name rather than letting it inject markup", () => {
    const input = { ...base, contactName: "<script>alert(1)</script>" };
    const html = buildQuotationPrint(buildQuotation(input), input);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("prints no budget section when none was given", () => {
    const html = buildQuotationPrint(buildQuotation(base), base);
    expect(html).not.toContain("Budget stated");
  });

  it("asks a public body for nothing in advance", () => {
    // The printed quote is what reaches procurement. A "50% on confirmation"
    // line there is not a price they refuse, it is a term they cannot accept.
    const gov = buildQuotationPrint(
      buildQuotation({ ...base, organizerType: "government" }),
      { ...base, organizerType: "government" }
    );
    expect(gov).toContain("nothing in advance");
    expect(gov).not.toContain("on confirmation");

    const corporate = buildQuotationPrint(buildQuotation(base), base);
    expect(corporate).toContain("on confirmation");
  });

  it("escapes free text the organizer typed", () => {
    const input = { ...base, eventTitle: '<img src=x onerror="alert(1)">' };
    const html = buildQuotationPrint(buildQuotation(input), input);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

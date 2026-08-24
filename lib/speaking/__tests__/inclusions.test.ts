import { describe, it, expect } from "vitest";
import { buildQuotation, DEFAULT_INPUT, type QuotationInput } from "@/lib/speaking/quotation";
import {
  ADD_ONS,
  INVOICING_ENTITY,
  PUBLIC_COURSE_RATE_MIN,
  PUBLIC_COURSE_RATE_MAX,
} from "@/lib/speaking/rate-card";

const TODAY = "2026-01-15";
const WEDNESDAY = "2026-04-15";

function input(overrides: Partial<QuotationInput> = {}): QuotationInput {
  return {
    ...DEFAULT_INPUT,
    today: TODAY,
    startDate: WEDNESDAY,
    complexity: "routine",
    organizerType: "government",
    audienceSize: 40,
    region: "baguio",
    earlyStart: false,
    ...overrides,
  };
}

const deliverables = (o: Partial<QuotationInput> = {}) => buildQuotation(input(o)).deliverables!;
const labels = (o: Partial<QuotationInput> = {}) =>
  deliverables(o).included.map((i) => i.label);

describe("what the organizer gets", () => {
  it("describes the thing before the quote justifies its price", () => {
    const list = deliverables().included;
    expect(list.length).toBeGreaterThan(2);
    for (const item of list) {
      expect(item.label.trim(), item.id).not.toBe("");
      expect(item.detail.trim(), item.id).not.toBe("");
    }
    // Ids are unique, since they key a rendered list.
    expect(new Set(list.map((i) => i.id)).size).toBe(list.length);
  });

  it("never promises materials a format does not include", () => {
    // The single most dangerous thing this file could do is invent a
    // deliverable. A keynote's own description says "one delivery, open forum"
    // and nothing about materials, so the list must not claim any.
    expect(labels({ format: "keynote" })).not.toContain("The exercises and worked examples");
    expect(labels({ format: "full-day" })).toContain("The exercises and worked examples");
  });

  it("lists the preparation, which is the part nobody sees", () => {
    expect(labels()).toContain("The build behind the session");
    // And for facilitation it names the actual groundwork bought, or omits it.
    const withPrep = labels({
      engagementType: "facilitation",
      preparation: "interviews",
      output: "plan",
    });
    expect(withPrep).toContain("Interview up to five of our people first");
    expect(withPrep).toContain("The written plan itself");

    const withoutPrep = labels({
      engagementType: "facilitation",
      preparation: "none",
      output: "none",
    });
    expect(withoutPrep).not.toContain("Interview up to five of our people first");
  });

  it("words the materials for the kind of work it is", () => {
    // "Worked examples" is training language and says nothing true about a
    // planning room, where what is handed over is the templates and whatever
    // the room filled in on them.
    expect(labels({ engagementType: "facilitation", format: "half-day" })).toContain(
      "The materials the session runs on"
    );
    expect(labels({ format: "half-day" })).toContain("The exercises and worked examples");
  });

  it("lists only the add-ons actually chosen", () => {
    const workbook = ADD_ONS.find((a) => a.id === "workbook")!;
    expect(labels({ addOns: ["workbook"] })).toContain(workbook.label);
    expect(labels({ addOns: [] })).not.toContain(workbook.label);
  });

  it("counts the invoice as something they get, not only as paperwork", () => {
    // Plenty of resource speakers cannot issue a registered invoice at all,
    // and an organization that can only pay against one has had engagements
    // fall over for exactly this.
    expect(labels({ invoiceRequired: true }).join(" ")).toContain(INVOICING_ENTITY.name);
    expect(labels({ invoiceRequired: false }).join(" ")).not.toContain(INVOICING_ENTITY.name);
  });

  it("mentions the pitch only when the room actually changed the build", () => {
    // "Staff and managers without a finance background" is the neutral case;
    // listing it would be a line that says nothing.
    expect(labels({ audienceProfile: "non-specialist" }).join(" ")).not.toContain("Pitched at");
    expect(labels({ audienceProfile: "leadership" }).join(" ")).toContain("Pitched at");
  });
});

describe("what the organizer does not get", () => {
  it("says so plainly, which is where the arguments come from otherwise", () => {
    const { excluded } = deliverables();
    expect(excluded.length).toBeGreaterThan(1);
    expect(excluded.join(" ")).toContain("venue");
    // The catch-all is the useful one: everything argued about on the day is
    // something neither side thought to name beforehand.
    expect(excluded.join(" ")).toContain("Anything not listed");
  });

  it("does not exclude a venue from an online session", () => {
    const { excluded } = deliverables({ format: "webinar" });
    expect(excluded.join(" ")).not.toContain("venue");
    expect(excluded.join(" ")).toContain("meeting platform");
  });
});

describe("against what a seat costs elsewhere", () => {
  it("compares only where something comparable is sold by the seat", () => {
    // Nobody sells seats to a 90-minute plenary by the head.
    expect(deliverables({ format: "keynote" }).comparison).toBeNull();
    expect(deliverables({ format: "panel" }).comparison).toBeNull();
    // And nobody sells an open-enrollment strategic plan.
    expect(deliverables({ engagementType: "facilitation" }).comparison).toBeNull();
    expect(deliverables({ format: "full-day" }).comparison).not.toBeNull();
  });

  it("measures against the cheapest open-course seat, never the dearest", () => {
    // A claim that only holds against the dearest competitor is a sales trick.
    const c = deliverables({ format: "full-day", audienceSize: 40 }).comparison!;
    expect(c.publicMin).toBe(PUBLIC_COURSE_RATE_MIN);
    expect(c.publicMax).toBe(PUBLIC_COURSE_RATE_MAX);
    expect(c.costOfSendingThem).toBe(PUBLIC_COURSE_RATE_MIN * 40 * 1);
    expect(c.breakEvenParticipants).toBeGreaterThan(0);
  });

  it("reports the arithmetic a reader can check", () => {
    const quote = buildQuotation(input({ format: "full-day", sessions: 2, audienceSize: 50 }));
    const c = quote.deliverables!.comparison!;
    expect(c.perParticipantPerDay).toBe(Math.round(quote.total / 50 / 2));
  });

  it("measures the break-even against the fee that size would really be quoted", () => {
    // It cannot be this quote's total ÷ the open-course rate. The total is not
    // fixed — a bigger room carries a bigger audience factor — so dividing the
    // current one produced a threshold the engine then contradicted one
    // sentence later: a 40-person quote claimed in-house paid from 21 people,
    // while a 20-person quote of the same engagement was already cheaper.
    const at = (size: number) => {
      const quote = buildQuotation(
        input({ format: "full-day", organizerType: "corporate", audienceSize: size })
      );
      return quote.total / size / quote.dayEquivalents;
    };

    const { breakEvenParticipants } = deliverables({
      format: "full-day",
      organizerType: "corporate",
      audienceSize: 40,
    }).comparison!;

    expect(at(breakEvenParticipants)).toBeLessThan(PUBLIC_COURSE_RATE_MIN);
    expect(at(breakEvenParticipants - 1)).toBeGreaterThanOrEqual(PUBLIC_COURSE_RATE_MIN);
  });

  it("states the same threshold whatever head count is on screen", () => {
    // The threshold is a property of the engagement, not of the number the
    // organizer happens to have typed. Two readers of the same programme must
    // not be told two different break-evens.
    const shape = { format: "full-day", organizerType: "corporate" } as const;
    const sizes = [5, 20, 40, 120].map(
      (audienceSize) => deliverables({ ...shape, audienceSize }).comparison!.breakEvenParticipants
    );
    expect(new Set(sizes).size).toBe(1);
  });

  it("admits when sending them on a course is the better buy", () => {
    // The only reason the other direction is worth believing. A corporate
    // engagement for a handful of people genuinely does not beat open
    // enrollment, and the quote says so rather than hiding it.
    const small = deliverables({
      format: "full-day",
      organizerType: "corporate",
      audienceSize: 5,
    }).comparison!;
    expect(small.cheaperThanSendingThem).toBe(false);
    expect(small.perParticipantPerDay).toBeGreaterThan(PUBLIC_COURSE_RATE_MIN);

    const large = deliverables({
      format: "full-day",
      organizerType: "corporate",
      audienceSize: 60,
    }).comparison!;
    expect(large.cheaperThanSendingThem).toBe(true);
  });

  it("keeps the claim and the threshold agreeing", () => {
    // Otherwise the panel contradicts itself in two consecutive sentences.
    for (const audienceSize of [5, 20, 25, 40, 80, 200]) {
      const c = deliverables({
        format: "full-day",
        organizerType: "corporate",
        audienceSize,
      }).comparison!;
      expect(c.cheaperThanSendingThem, `${audienceSize}`).toBe(
        audienceSize >= c.breakEvenParticipants
      );
    }
  });
});

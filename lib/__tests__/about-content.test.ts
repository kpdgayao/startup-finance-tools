import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GRANT_TIMELINE,
  NAME,
  ABOUT_BIO,
  PULL_QUOTE,
} from "@/lib/kevin";
import { ORGS, type OrgKind } from "@/lib/orgs";

const ROOT = process.cwd();
const VALID_KINDS: OrgKind[] = ["gov", "edu", "solid", "other"];

// The angel investment year was corrected from the handoff's 2021 to 2018
// per the client. This guard locks the correction so it cannot regress.
const REQUIRED_TIMELINE_ENTRIES = [
  "DOST-PCIEERD Startup Grant",
  "DOST-TAPI TECHNiCOM Grant",
  "Angel investment via IdeaSpace Cohort 7",
  "Finance Manager, Vivita Philippines",
  "EU-PH Green Economy Partnership grant",
  "Visiting Lecturer, SLU Graduate School",
  "Finance Mentor, New Energy Nexus",
  "Certified Mentor, PCE / Go Negosyo",
];

describe("about content", () => {
  it("grant timeline has the required entries", () => {
    const entries = GRANT_TIMELINE.map((e) => e.entry);
    for (const required of REQUIRED_TIMELINE_ENTRIES) {
      expect(
        entries.some((e) => e.includes(required)),
        `Grant timeline missing entry containing "${required}"`
      ).toBe(true);
    }
  });

  it("angel investment is dated 2018, not 2021", () => {
    const angel = GRANT_TIMELINE.find((e) =>
      e.entry.includes("Angel investment via IdeaSpace")
    );
    expect(angel, "Angel investment entry must exist").toBeDefined();
    expect(angel!.year).toBe("2018");
  });

  it("bio and pull-quote are non-empty", () => {
    expect(ABOUT_BIO.length).toBeGreaterThanOrEqual(1);
    for (const para of ABOUT_BIO) {
      expect(para.trim()).not.toBe("");
    }
    expect(PULL_QUOTE.trim()).not.toBe("");
  });

  it("every org has a valid kind", () => {
    expect(ORGS.length).toBeGreaterThanOrEqual(8);
    for (const org of ORGS) {
      expect(
        VALID_KINDS,
        `${org.name} has kind "${org.kind}"`
      ).toContain(org.kind);
    }
  });

  it("the author's name appears at most twice on /about", () => {
    // /about is the one page allowed the full credentials, but the name
    // itself should still appear at most twice (once in the rail, once in
    // the closing line) to keep the page from drifting back toward the
    // rejected v1 promotional density.
    const source = readFileSync(join(ROOT, "app/about/page.tsx"), "utf8");
    const firstName = NAME.split(" ")[0];
    const count = (source.match(new RegExp(firstName, "g")) ?? []).length;
    expect(
      count,
      `${NAME} should appear at most twice in app/about/page.tsx; found ${count}`
    ).toBeLessThanOrEqual(2);
  });
});

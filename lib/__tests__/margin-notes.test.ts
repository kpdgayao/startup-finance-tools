import { describe, it, expect } from "vitest";
import { NOTES, type NoteTone } from "@/lib/notes";

const REQUIRED_TOOLS = [
  "valuation-calculator",
  "equity-simulator",
  "safe-calculator",
  "burn-rate",
  "unit-economics",
  "compliance-checklist",
] as const;

const VALID_TONES: NoteTone[] = ["rule", "watch", "ph"];

// A note that mentions the author's name, firm, credentials, or seminars is
// a failed note — the whole point of the margin note is inferred authority,
// not asserted authority. Case-insensitive.
const FORBIDDEN = ["kevin", "iol", "credential", "seminar", "gayao"];

describe("margin notes", () => {
  it("ships at least 12 notes total", () => {
    const total = Object.values(NOTES).reduce((n, arr) => n + arr.length, 0);
    expect(
      total,
      `Expected at least 12 margin notes; found ${total}.`
    ).toBeGreaterThanOrEqual(12);
  });

  it("covers every required tool id with at least 2 notes", () => {
    for (const toolId of REQUIRED_TOOLS) {
      const arr = NOTES[toolId] ?? [];
      expect(
        arr.length,
        `${toolId} must have at least 2 notes; found ${arr.length}.`
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("every note has a non-empty body and a valid tone", () => {
    for (const [toolId, arr] of Object.entries(NOTES)) {
      expect(arr.length, `${toolId} has an empty notes array`).toBeGreaterThan(0);
      for (let i = 0; i < arr.length; i++) {
        expect(
          arr[i].body.trim(),
          `${toolId}[${i}] has an empty body`
        ).not.toBe("");
        expect(
          VALID_TONES,
          `${toolId}[${i}] has tone "${arr[i].tone}", expected one of ${VALID_TONES.join(", ")}`
        ).toContain(arr[i].tone);
      }
    }
  });

  it("no note mentions the author, firm, credentials, or seminars", () => {
    const failures: string[] = [];
    for (const [toolId, arr] of Object.entries(NOTES)) {
      arr.forEach((note, i) => {
        const low = note.body.toLowerCase();
        for (const term of FORBIDDEN) {
          if (low.includes(term)) {
            failures.push(`${toolId}[${i}] contains "${term}"`);
          }
        }
      });
    }
    expect(
      failures,
      `Margin notes must be unsigned and self-referential-free. ` +
        `Found forbidden terms: ${failures.join(", ")}`
    ).toEqual([]);
  });
});

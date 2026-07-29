import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { TOOLS } from "@/lib/constants";
import { QUIZ_QUESTIONS } from "@/lib/calculations/self-assessment";
import { DATA_LAST_UPDATED } from "@/lib/calculations/compliance-checklist";

// Vitest runs from the repo root, which IS the `app/` directory.
// Do not use __dirname — this file is ESM and it is undefined there.
const ROOT = process.cwd();

// Every component that renders on the homepage. Listed explicitly rather
// than crawled: the point is to assert a property of one specific page, and
// a crawl would silently start covering pages this rule scores differently
// (/about is allowed the full credentials treatment).
const HOMEPAGE_FILES = [
  "app/page.tsx",
  "components/layout/header.tsx",
  "components/layout/footer.tsx",
  "components/shared/newsletter-section.tsx",
  "components/shared/ecosystem-strip.tsx",
];

// components/home/ does not exist until Task 2. Once it does, everything in
// it renders on the homepage and counts.
function homeComponents(): string[] {
  const dir = join(ROOT, "components", "home");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `components/home/${f}`);
}

// The rule is about what a visitor reads. Comments are not rendered, and
// aria-label/alt/title are accessible names rather than prose — a screen
// reader user hearing "Kevin's LinkedIn" is not being marketed to.
function visibleText(source: string): string {
  return source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "") // {/* jsx comment */}
    .replace(/\/\*[\s\S]*?\*\//g, "") // /* block comment */
    .replace(/^\s*\/\/.*$/gm, "") // // line comment
    .replace(/(aria-label|alt|title)=(["'])[\s\S]*?\2/g, "");
}

describe("homepage facts", () => {
  it("mentions the author at most twice", () => {
    const counts: string[] = [];
    let total = 0;
    for (const rel of [...HOMEPAGE_FILES, ...homeComponents()]) {
      const source = readFileSync(join(ROOT, rel), "utf8");
      const n = (visibleText(source).match(/Kevin/g) ?? []).length;
      if (n > 0) counts.push(`${rel}: ${n}`);
      total += n;
    }
    expect(
      total,
      `Quiet Authority allows the author's name at most twice on any page ` +
        `(once in the hero byline, once in the footer credit). Found ` +
        `${total}: ${counts.join(", ")}`
    ).toBeLessThanOrEqual(2);
  });

  it("has the tool count the hero copy claims", () => {
    // The hero eyebrow spells the number as a word ("Sixteen tools · free
    // · nothing leaves your browser") and cannot interpolate it. If a tool
    // is added or removed, this must fail loudly rather than let the page
    // state something untrue.
    expect(
      TOOLS.length,
      "TOOLS.length changed. Update the word in the eyebrow copy in " +
        "components/home/quiet-hero.tsx. The secondary CTA and FactStrip " +
        "cell 1 derive the number and need no edit."
    ).toBe(16);
  });

  it("has the question count the primary CTA claims", () => {
    // The CTA interpolates this, so it cannot drift — but the *claim* that
    // 25 questions is a reasonable ask is a copy decision. A jump to 60
    // should prompt a rewrite, not silently ship "Start with the
    // 60-question assessment".
    expect(
      QUIZ_QUESTIONS.length,
      "QUIZ_QUESTIONS.length changed. Re-read the primary CTA copy in " +
        "components/home/quiet-hero.tsx before updating this number."
    ).toBe(25);
  });

  it("has a compliance date FactStrip can slice a year from", () => {
    // FactStrip cell 3 renders DATA_LAST_UPDATED.slice(0, 4) as "2026" and
    // labels it "SEC / DTI / BIR fees current". Reusing the constant the
    // compliance tool already displays means the homepage claim and the
    // tool page cannot disagree — but only if the format holds.
    expect(
      DATA_LAST_UPDATED,
      "FactStrip cell 3 slices the first four characters as a year. " +
        "DATA_LAST_UPDATED must stay YYYY-MM."
    ).toMatch(/^\d{4}-\d{2}$/);
  });
});

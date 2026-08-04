import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
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
  "components/tools/tool-index.tsx",
];

// Everything under components/home/ renders on the homepage and counts.
// Recursive, so a future components/home/hero/parts.tsx is not a blind spot.
function homeComponents(): string[] {
  const dir = join(ROOT, "components", "home");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `components/home/${f.split(sep).join("/")}`);
}

// The rule is about what a visitor reads. Comments are not rendered, and
// aria-label/alt/title are accessible names rather than prose — a screen
// reader user hearing "Kevin's LinkedIn" is not being marketed to.
//
// The attribute pattern requires a boundary before the name. Unanchored, the
// `alt`/`title` alternatives also match the tail of longer prop names, so a
// `subtitle="Built by Kevin Gayao"` or `data-title="…"` would be stripped as
// though it were an accessible name and the guard would score it zero.
function stripComments(source: string): string {
  return source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "") // {/* jsx comment */}
    .replace(/\/\*[\s\S]*?\*\//g, "") // /* block comment */
    .replace(/^\s*\/\/.*$/gm, ""); // // line comment (leading only: a
  //   trailing `// …` pattern would also eat the `//` in every https:// URL)
}

function visibleText(source: string): string {
  return stripComments(source).replace(
    /(?:^|[\s<{])(?:aria-label|alt|title)=(["'])[\s\S]*?\1/g,
    ""
  );
}

// Longest alternative first, so "Kevin Philip D. Gayao" scores 1 rather than
// 2, and a surname-only "Gayao" is not invisible to the guard.
const AUTHOR_NAME = /Kevin(?:\s+\w+\.?)*\s+Gayao|Kevin|Gayao/g;

describe("homepage facts", () => {
  it("mentions the author at most twice", () => {
    const counts: string[] = [];
    let total = 0;
    for (const rel of [...HOMEPAGE_FILES, ...homeComponents()]) {
      const source = readFileSync(join(ROOT, rel), "utf8");
      const n = (visibleText(source).match(AUTHOR_NAME) ?? []).length;
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

  it("scans every component app/page.tsx actually renders", () => {
    // HOMEPAGE_FILES is hand-maintained on purpose (a crawl would wander into
    // /about, which is allowed the full credentials treatment). The cost of
    // that choice is that a new component rendered on the homepage would be
    // invisible to the name guard above. This closes it: every non-primitive
    // component the page imports must be on the list.
    const page = readFileSync(join(ROOT, "app/page.tsx"), "utf8");
    const covered = new Set([...HOMEPAGE_FILES, ...homeComponents()]);
    const missing = [...page.matchAll(/from\s+"@\/(components\/[^"]+)"/g)]
      .map((m) => `${m[1]}.tsx`)
      // components/ui/* are unstyled shadcn primitives carrying no prose.
      .filter((rel) => !rel.startsWith("components/ui/"))
      .filter((rel) => !covered.has(rel));
    expect(
      missing,
      `app/page.tsx renders ${missing.join(", ")}, which the author-name ` +
        `guard never reads. Add to HOMEPAGE_FILES in this file.`
    ).toEqual([]);
  });

  it("has the tool count the hero copy claims", () => {
    // The hero eyebrow spells the number as a word ("Sixteen tools · free
    // · calculations stay in your browser") and cannot interpolate it.
    expect(
      TOOLS.length,
      "TOOLS.length changed. Update the word in the eyebrow copy in " +
        "components/home/quiet-hero.tsx. The secondary CTA and FactStrip " +
        "cell 1 derive the number and need no edit."
    ).toBe(16);

    // Asserting TOOLS.length alone is a tripwire on the data, not the copy:
    // someone bumping this test to 17 would leave the eyebrow reading
    // "Sixteen". Assert the word that is actually on the page.
    const WORDS = ["Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen"];
    const word = WORDS[TOOLS.length - 14];
    const hero = readFileSync(
      join(ROOT, "components/home/quiet-hero.tsx"),
      "utf8"
    );
    expect(
      hero.includes(`${word} tools`),
      `The hero eyebrow must spell TOOLS.length (${TOOLS.length}) as ` +
        `"${word} tools". Update components/home/quiet-hero.tsx.`
    ).toBe(true);
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

  it("has only the known call sites that send anything to a server", () => {
    // FactStrip cell 4 claims zero *calculations* reach a server and the
    // hero eyebrow claims calculations stay in the browser. Both are true
    // only while the network calls this app makes are the ones below —
    // none of which is a calculation:
    //
    //   lib/ai/use-ai-explain.ts        opt-in AI Explain, POSTs tool inputs
    //   components/shared/newsletter-*  opt-in email signup
    //   components/shared/email-capture-dialog.tsx  opt-in PDF-export gate
    //   app/contact/page.tsx            the contact form
    //
    // A new fetch() anywhere else fails this test, which is the point: the
    // next feature that phones home has to re-read the homepage copy rather
    // than silently falsify it. Server-only code under app/api/ is excluded
    // — it runs on the server by definition and sends nothing from the
    // visitor's browser.
    const ALLOWED = [
      "app/contact/page.tsx",
      "components/shared/email-capture-dialog.tsx",
      "components/shared/newsletter-section.tsx",
      "lib/ai/use-ai-explain.ts",
    ];

    const found: string[] = [];
    for (const root of ["app", "components", "lib"]) {
      for (const f of readdirSync(join(ROOT, root), {
        recursive: true,
        encoding: "utf8",
      })) {
        const rel = `${root}/${f.split(sep).join("/")}`;
        if (!/\.tsx?$/.test(rel)) continue;
        if (rel.startsWith("app/api/") || rel.includes("__tests__")) continue;
        // stripComments so a comment *about* fetch() — like the one in
        // fact-strip.tsx explaining this very rule — is not a call site.
        const code = stripComments(readFileSync(join(ROOT, rel), "utf8"));
        if (/(?:^|[^.\w])fetch\s*\(/.test(code)) found.push(rel);
      }
    }

    expect(
      found.sort(),
      "The set of files that send data from the visitor's browser changed. " +
        "Re-read FactStrip cell 4 and the hero eyebrow in components/home/ " +
        "before updating this allowlist — they claim calculations stay " +
        "client-side."
    ).toEqual(ALLOWED);
  });
});

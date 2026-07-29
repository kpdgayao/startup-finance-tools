import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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
});

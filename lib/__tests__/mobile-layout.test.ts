import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Vitest runs from the repo root, which IS the `app/` directory.
const ROOT = process.cwd();

const LAYOUTS = ["app/tools/layout.tsx", "app/learn/layout.tsx"];

describe("the main region is not a scroll container", () => {
  // This is the guard for a bug that shipped precisely because it was
  // invisible. `<main>` carried `overflow-auto`, which made it scroll
  // horizontally instead of the document. Content 500px wider than a phone
  // therefore left `document.scrollWidth` at a clean 375 — so every overflow
  // check, including the first pass of the audit that eventually caught it,
  // reported the page as fine while opening a dropdown slid the whole layout
  // sideways and left it there.
  //
  // `min-w-0` keeps the flex item shrinkable without swallowing the evidence.
  it("uses min-w-0 rather than overflow-auto on #main-content", () => {
    for (const rel of LAYOUTS) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      const main = src.match(/<main[^>]*id="main-content"[^>]*>/)?.[0] ?? "";

      expect(main, `${rel} has no #main-content <main>`).not.toBe("");
      expect(
        main,
        `${rel}: overflow-auto on <main> hides horizontal overflow from the ` +
          `document, which is how it goes unnoticed. Use min-w-0 and give wide ` +
          `content its own overflow-x-auto wrapper.`
      ).not.toMatch(/overflow-(auto|scroll|x-auto|x-scroll)/);
      expect(main, `${rel}: <main> needs min-w-0 to shrink inside the sidebar row`).toContain(
        "min-w-0"
      );
    }
  });
});

describe("select triggers are width-constrained", () => {
  // shadcn's SelectTrigger is `w-fit`, and Radix mirrors the selected item's
  // markup into it. An option carrying a sentence of explanation therefore
  // stretched the trigger to 805px inside a 375px viewport. Any page whose
  // options are longer than a couple of words has to pass w-full.
  it("gives every trigger on the speaker quotation page a full-width class", () => {
    const src = readFileSync(join(ROOT, "app/tools/speaker-quotation/page.tsx"), "utf8");
    const triggers = src.match(/<SelectTrigger[^>]*>/g) ?? [];

    expect(triggers.length, "expected the quotation form to render selects").toBeGreaterThan(0);
    for (const trigger of triggers) {
      expect(
        trigger,
        `SelectTrigger is w-fit by default, so a long option stretches it past ` +
          `the viewport: ${trigger}`
      ).toMatch(/w-full/);
    }
  });
});

describe("action rows wrap", () => {
  // The Export PDF button is whitespace-nowrap and 127px wide. Beside a Reset
  // button in a non-wrapping row it pushed eight tool pages past a 320px
  // viewport.
  it("never puts toolbar buttons in a row that cannot wrap", () => {
    const offenders: string[] = [];
    for (const rel of [
      "app/tools/unit-economics/page.tsx",
      "app/tools/valuation-calculator/page.tsx",
      "app/tools/equity-simulator/page.tsx",
      "app/tools/market-sizing/page.tsx",
      "app/tools/safe-calculator/page.tsx",
      "app/tools/burn-rate/page.tsx",
      "app/tools/break-even/page.tsx",
      "app/tools/msme-financial-plan/page.tsx",
      "app/tools/cash-flow-forecast/components/cash-flow-actions.tsx",
      "app/tools/financial-model-builder/components/financial-model-actions.tsx",
    ]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      if (/className="flex gap-2"/.test(src)) offenders.push(rel);
    }
    expect(
      offenders,
      `these action rows need flex-wrap — without it the buttons overflow a 320px phone`
    ).toEqual([]);
  });
});

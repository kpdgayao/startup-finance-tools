import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

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

    // The page routes them all through one constant. Resolve it rather than
    // grepping each tag, so the guard follows the indirection instead of
    // failing the moment the classes are named in one place.
    const shared = src.match(/const SELECT_TRIGGER = "([^"]*)"/)?.[1] ?? "";

    expect(triggers.length, "expected the quotation form to render selects").toBeGreaterThan(0);
    for (const trigger of triggers) {
      const classes = /SELECT_TRIGGER/.test(trigger)
        ? shared
        : (trigger.match(/className="([^"]*)"/)?.[1] ?? "");
      expect(
        classes,
        `SelectTrigger is w-fit by default, so a long option stretches it past ` +
          `the viewport: ${trigger}`
      ).toMatch(/w-full/);
    }
  });

  // w-full stops the trigger stretching the page. It does NOT stop the label
  // inside it being cut off mid-word: the trigger is whitespace-nowrap and its
  // value is a flex item, which will not shrink below its content without
  // min-w-0 — so "Company or corporate in-house training" rendered as
  // "Company or corporate in-house trainin", with no ellipsis to show that
  // anything had been cut.
  it("lets a long label shrink rather than be clipped mid-word", () => {
    const src = readFileSync(join(ROOT, "app/tools/speaker-quotation/page.tsx"), "utf8");
    const shared = src.match(/const SELECT_TRIGGER = "([^"]*)"/)?.[1] ?? "";
    expect(shared, "SELECT_TRIGGER should carry the width classes").toMatch(/w-full/);
    expect(shared, "the value needs min-w-0 for line-clamp to apply").toMatch(/min-w-0/);
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

describe("the form asks a manageable number of questions up front", () => {
  // A real organiser said the form was too long. Completion falls measurably
  // with each field a person has to consider past roughly eight, and what
  // counts is fields considered rather than screens they are spread over — so
  // the questions that do not move the number live behind one disclosure with
  // sensible defaults, rather than being spread across more steps.
  it("keeps the optional questions behind a disclosure", () => {
    const src = readFileSync(join(ROOT, "app/tools/speaker-quotation/page.tsx"), "utf8");
    expect(src, "the optional questions should sit inside a DetailSection").toMatch(
      /<DetailSection/
    );

    // Everything in the collapsed group must come after the quote-critical
    // questions, or the disclosure is hiding something load-bearing.
    const detailIndex = src.indexOf("<DetailSection");
    for (const critical of ["QUESTIONS.engagementType", "QUESTIONS.startDate", "QUESTIONS.region"]) {
      expect(src.indexOf(critical), `${critical} must stay outside the disclosure`).toBeLessThan(
        detailIndex
      );
    }
  });

  // The page is read by someone deciding whether to book a person, and it is
  // that person's own rate card. An institutional register read as distancing
  // to the organiser who reviewed it.
  it("speaks in the first person rather than about 'the speaker'", () => {
    const src = readFileSync(join(ROOT, "lib/speaking/questions.ts"), "utf8");
    const bodies = src.match(/why: "[^"]+"/g) ?? [];
    expect(bodies.length).toBeGreaterThan(8);

    const firstPerson = bodies.filter((b) => /\b(I|me|my)\b/.test(b));
    expect(
      firstPerson.length / bodies.length,
      "most rationales should be written in the first person"
    ).toBeGreaterThan(0.5);
  });
});

describe("whole-number fields can be cleared", () => {
  // A controlled input written as
  //   value={n} onChange={e => set(Math.max(1, Number(e.target.value) || 1))}
  // cannot be emptied: deleting the last character yields "", Number("") is 0,
  // `|| 1` makes it 1, and React re-renders the field as "1" under the user's
  // hands. On a phone, where select-all is awkward, the only way to enter 3 is
  // to put the caret before the stubborn 1 and type — giving 13. An organiser
  // reported exactly that. IntegerInput holds a draft string instead.
  it("uses IntegerInput rather than a self-resetting handler", () => {
    // Catches both shapes. `|| 1` is the one that was reported — clearing the
    // field refills it and typing appends. `|| 0` is milder but the same bug:
    // the field cannot be left empty either. `parseFloat` handlers are out of
    // scope; those are decimal fields and IntegerInput is the wrong control.
    // Matches the radix form (`parseInt(x, 10)`) and any argument name, both of
    // which the first version missed — `parseInt(e.target.value, 10) || 0` was
    // sitting unconverted in unit-economics while this test passed.
    // parseFloat is deliberately absent: those are decimal fields, and an
    // integer control is the wrong fix for them.
    const RESETTING =
      /(?:Number|parseInt)\(\s*\w+\.target\.value\s*(?:,\s*\d+\s*)?\)\s*\|\|\s*\d/;

    // IntegerInput's own documentation quotes the broken handler it replaces,
    // so it matches its own guard. Excluded by full path rather than basename,
    // and rather than rewording working documentation to dodge a regex — the
    // same approach design-tokens.test.ts takes with itself.
    const SELF = "components/shared/integer-input.tsx";
    const offenders: string[] = [];

    for (const rel of [...walkTsx(join(ROOT, "app")), ...walkTsx(join(ROOT, "components"))]) {
      const path = relative(ROOT, rel).replace(/\\/g, "/");
      if (path === SELF) continue;
      if (RESETTING.test(readFileSync(rel, "utf8"))) offenders.push(path);
    }

    expect(
      offenders,
      "these whole-number fields refill themselves the moment they are cleared — " +
        "use <IntegerInput>, which lets the field hold an empty draft while editing"
    ).toEqual([]);
  });
});

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsx(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

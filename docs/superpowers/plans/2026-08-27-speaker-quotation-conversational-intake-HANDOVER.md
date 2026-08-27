# Handover prompt

Paste everything below the line into a fresh session of the coding agent, with
the repository checked out at `startup-finance-tools/app` on branch
`design/speaker-quotation-conversational-intake`.

---

You are implementing a redesign of one page in an existing Next.js 16
application. Two documents govern this work. **Read both before writing any
code**, in this order:

1. `docs/superpowers/specs/2026-08-27-speaker-quotation-conversational-intake-design.md` — the design and the reasoning behind it.
2. `docs/superpowers/plans/2026-08-27-speaker-quotation-conversational-intake.md` — ten tasks, each with exact files, code, and verification steps.

Work through the plan **task by task, in order**. Complete every step of a task,
verify it, and commit before starting the next one. Do not batch tasks. Do not
skip a verification step because the change "obviously" works.

## What you are building, in one paragraph

`/tools/speaker-quotation` lets an event organizer price a speaking engagement
against a published rate card. It is sent to people who have already emailed
the speaker asking what it would cost, and it currently meets them with a
seventeen-field form. That is cold for a warm inquiry, and longer than most
events need. You are replacing the front half with three states: an opening
prose box ("tell me about your event"), a Reading state that leads with the
number and asks only the questions that are still missing and would actually
move it, and the existing full form kept intact as an escape hatch and a
fallback. **The pricing engine is not being changed.**

## Ground rules

- **The repository root is the `app/` directory.** Its parent is not a git repo.
  Run every `git` and `pnpm` command from there. The `@/` alias points at it.
- **Test with `pnpm exec vitest run`.** Never `pnpm test` — that is bare
  `vitest`, which enters watch mode and will look like a hang.
- **`pnpm build` is the real gate.** Run it at the end of every task that
  touches a `.tsx` file.
- **`pnpm lint` already fails** on five pre-existing errors that are not yours.
  Scope it: `pnpm exec eslint <the files you edited>`.
- **There is no CI on this repository.** The local commands above are the only
  gate that exists. A clean-looking PR page proves nothing.
- **There is no jsdom and no Testing Library, by choice.** Every test in this
  repo is a pure data assertion or a filesystem sweep. Write tests for the pure
  modules; verify components with `pnpm build` and by looking at the page. Do
  not add a test runtime as a side effect of this work.
- **Do not modify** `lib/speaking/quotation.ts`, `rate-card.ts`,
  `inclusions.ts`, `availability.ts`, `ics.ts`, or any of their tests. Task 10
  contains the single narrow exception. If you believe another change is
  needed, stop and report it rather than making it.

## How to read the existing code

This codebase comments *why*, not *what*, and many of those comments record
real bugs that were fixed. When you move code — and Task 5 moves about 650
lines of it — **the comments move with it, unchanged**. A comment explaining
that a Radix trigger stretched to 805px inside a 375px viewport is load-bearing
documentation, not clutter.

Two conventions to respect in anything you write:

- **Never type a peso figure that the rate card can produce.** `lib/speaking/questions.ts`
  interpolates every number from `rate-card.ts` so copy cannot drift from the
  engine. Follow that.
- **No `shadow-*` classes, no hex colours.** Guard tests fail the build on
  both. Elevation comes from `border-rule` hairlines and surface steps.

## What to do when the plan is wrong

The plan was written against the code at commit `4f6f21b`, and it cites exact
line numbers. If a line range does not contain what the plan says it does, or a
test asserts something the code contradicts:

**Stop and report it. Do not quietly work around it and do not adjust a test to
match whatever the code happens to do.**

Two places this is most likely:

- Task 1 tells you to `grep` for the real remote-format id rather than trusting
  the placeholder `"online-webinar"` in the test. Do that.
- Task 3's threshold constants (5% of the total, or ₱5,000) are a judgement
  call. If the test "asks for the sector" fails, print the actual spreads
  before touching either the constants or the test — the test asserts a real
  property of the rate card, which describes sector as the biggest single
  factor on the price.

## Definition of done

The plan's final section lists eight criteria. The two that matter most:

1. **The number is identical in Reading and Full for the same answers.** Two
   states rendering two copies of a control is the defect this design is most
   likely to ship, and it produces two different prices for one event. Task 5
   exists entirely to prevent it, and a guard test enforces it.
2. **A missing `ANTHROPIC_API_KEY` opens the page on the full form, silently.**
   No error, no dead button, no prose box that cannot work. Verify this by
   actually unsetting the variable and loading the page, not by reading the
   code.

Report what you did, what you verified and how, and anything you found that the
plan or spec got wrong.

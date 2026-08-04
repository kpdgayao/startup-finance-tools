import { QUIZ_QUESTIONS } from "@/lib/calculations/self-assessment";
import { STAGE_ORDER, getStageChecklist } from "@/lib/calculations/fundraising-guide";

/**
 * Mono meta lines for the featured tool cards on the homepage.
 *
 * Every number is read from the data it describes rather than typed. The
 * hard-coded "15 interactive financial tools" that sat on /tools for months
 * after the 16th tool shipped is what this exists to prevent. Values are
 * natural case; the card uppercases them in CSS.
 *
 * STAGE_CHECKLISTS is module-private in fundraising-guide.ts. getStageChecklist
 * is already exported and reaches it — do not add a new export.
 */
export const FEATURED_TOOL_META: Record<string, string> = {
  "self-assessment": `${QUIZ_QUESTIONS.length} questions · ${
    new Set(QUIZ_QUESTIONS.map((q) => q.category)).size
  } categories`,

  "fundraising-guide": `${STAGE_ORDER.reduce(
    (total, stage) => total + getStageChecklist(stage).length,
    0
  )} steps · ${STAGE_ORDER.length} stages`,
};

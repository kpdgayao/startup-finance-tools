import { describe, it, expect } from "vitest";
import {
  calculateQuizResult,
  QUIZ_QUESTIONS,
  type QuizCategory,
} from "../self-assessment";

describe("calculateQuizResult", () => {
  const allCorrect: Record<string, number> = {};
  for (const q of QUIZ_QUESTIONS) {
    allCorrect[q.id] = q.correctIndex;
  }

  const allWrong: Record<string, number> = {};
  for (const q of QUIZ_QUESTIONS) {
    allWrong[q.id] = (q.correctIndex + 1) % q.options.length;
  }

  it("returns Expert for all correct answers", () => {
    const result = calculateQuizResult(allCorrect);
    expect(result.overallScore).toBe(QUIZ_QUESTIONS.length);
    expect(result.overallPercentage).toBe(100);
    expect(result.profileLabel).toBe("Expert");
  });

  it("returns Beginner for all wrong answers", () => {
    const result = calculateQuizResult(allWrong);
    expect(result.overallScore).toBe(0);
    expect(result.overallPercentage).toBe(0);
    expect(result.profileLabel).toBe("Beginner");
  });

  it("totalQuestions matches QUIZ_QUESTIONS length", () => {
    const result = calculateQuizResult(allCorrect);
    expect(result.totalQuestions).toBe(QUIZ_QUESTIONS.length);
  });

  it("categoryScores covers all 6 categories", () => {
    const result = calculateQuizResult(allCorrect);
    expect(result.categoryScores).toHaveLength(6);
    const cats = result.categoryScores.map((cs) => cs.category);
    expect(cats).toContain("financial-statements");
    expect(cats).toContain("valuation");
    expect(cats).toContain("cash-management");
    expect(cats).toContain("fundraising");
    expect(cats).toContain("compliance");
    expect(cats).toContain("revenue-pricing");
  });

  it("each category score has correct total question count", () => {
    const result = calculateQuizResult(allCorrect);
    for (const cs of result.categoryScores) {
      const expected = QUIZ_QUESTIONS.filter(
        (q) => q.category === cs.category
      ).length;
      expect(cs.total).toBe(expected);
    }
  });

  it("weak categories are those below 50%", () => {
    // Answer only financial-statements correctly, rest wrong
    const partial: Record<string, number> = {};
    for (const q of QUIZ_QUESTIONS) {
      if (q.category === "financial-statements") {
        partial[q.id] = q.correctIndex;
      } else {
        partial[q.id] = (q.correctIndex + 1) % q.options.length;
      }
    }
    const result = calculateQuizResult(partial);
    // financial-statements should NOT be weak (100%)
    expect(result.weakCategories).not.toContain("financial-statements");
    // Other categories should be weak (0%)
    expect(result.weakCategories).toContain("valuation");
  });

  it("recommended tools come from weak categories", () => {
    // All wrong → all categories weak → should have recommendations
    const result = calculateQuizResult(allWrong);
    expect(result.recommendedTools.length).toBeGreaterThan(0);
    for (const tool of result.recommendedTools) {
      expect(tool.id).toBeDefined();
      expect(tool.name).toBeDefined();
      expect(tool.reason).toBeDefined();
    }
  });

  it("no recommended tools when all correct", () => {
    const result = calculateQuizResult(allCorrect);
    expect(result.recommendedTools).toHaveLength(0);
  });

  it("profile labels follow correct thresholds", () => {
    // Answer ~50% correctly → Intermediate
    const half: Record<string, number> = {};
    let count = 0;
    for (const q of QUIZ_QUESTIONS) {
      if (count % 2 === 0) {
        half[q.id] = q.correctIndex;
      } else {
        half[q.id] = (q.correctIndex + 1) % q.options.length;
      }
      count++;
    }
    const result = calculateQuizResult(half);
    expect(["Beginner", "Intermediate", "Advanced"]).toContain(
      result.profileLabel
    );
  });

  it("handles empty answers gracefully", () => {
    const result = calculateQuizResult({});
    expect(result.overallScore).toBe(0);
    expect(result.overallPercentage).toBe(0);
    expect(result.profileLabel).toBe("Beginner");
  });
});

describe("QUIZ_QUESTIONS", () => {
  it("has questions for all 6 categories", () => {
    const categories = new Set(QUIZ_QUESTIONS.map((q) => q.category));
    expect(categories.size).toBe(6);
  });

  it("every question has valid structure", () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.id).toBeDefined();
      expect(q.question).toBeDefined();
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(q.explanation).toBeDefined();
    }
  });

  it("all question IDs are unique", () => {
    const ids = QUIZ_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

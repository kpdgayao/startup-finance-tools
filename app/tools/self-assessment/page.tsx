"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ResultCard } from "@/components/shared/result-card";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import {
  QUIZ_QUESTIONS,
  calculateQuizResult,
  type QuizCategory,
} from "@/lib/calculations/self-assessment";
import { GraduationCap, CheckCircle2, XCircle, ArrowRight, RotateCcw, Trophy, BookOpen } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

type Phase = "intro" | "questions" | "results";

const PROFILE_COLORS: Record<string, string> = {
  Beginner: "text-red-400",
  Intermediate: "text-yellow-400",
  Advanced: "text-blue-400",
  Expert: "text-green-400",
};

export default function SelfAssessmentPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const ai = useAiExplain("self-assessment");

  const currentQuestion = QUIZ_QUESTIONS[currentIndex];
  const totalQuestions = QUIZ_QUESTIONS.length;
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;

  const result = useMemo(() => {
    if (phase !== "results") return null;
    return calculateQuizResult(answers);
  }, [phase, answers]);

  const radarData = useMemo(() => {
    if (!result) return [];
    return result.categoryScores.map((cs) => ({
      category: cs.label,
      score: cs.percentage,
      fullMark: 100,
    }));
  }, [result]);

  function handleStart() {
    setPhase("questions");
    setCurrentIndex(0);
    setAnswers({});
    setSelectedOption(null);
    setShowExplanation(false);
    ai.reset();
  }

  function handleSelectOption(optionIndex: number) {
    if (showExplanation) return;
    setSelectedOption(optionIndex);
    setShowExplanation(true);
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  }

  function handleNext() {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setPhase("results");
    }
  }

  // Intro phase
  if (phase === "intro") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Finance Self-Assessment</h1>
          <p className="text-muted-foreground mt-1">
            Test your startup finance knowledge and get a personalized learning path.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle>Ready to test your knowledge?</CardTitle>
                <CardDescription>
                  {totalQuestions} questions across 5 categories
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Financial Statements", desc: "P&L, Balance Sheet, Cash Flow" },
                { label: "Valuation", desc: "DCF, Berkus, Revenue Multiples" },
                { label: "Cash Management", desc: "Burn rate, runway, working capital" },
                { label: "Fundraising", desc: "Dilution, cap tables, investor metrics" },
                { label: "Compliance", desc: "SEC, DTI, BIR, CREATE Act" },
              ].map((cat) => (
                <div key={cat.label} className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
                  <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button size="lg" className="w-full" onClick={handleStart}>
              Start Quiz
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results phase
  if (phase === "results" && result) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Your Results</h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s how you scored across all 5 categories.
          </p>
        </div>

        {/* Overall score */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-2">
              <Trophy className={`h-10 w-10 ${PROFILE_COLORS[result.profileLabel]}`} />
              <h2 className={`text-2xl font-bold ${PROFILE_COLORS[result.profileLabel]}`}>
                {result.profileLabel}
              </h2>
              <p className="text-4xl font-bold">{result.overallPercentage}%</p>
              <p className="text-muted-foreground">
                {result.overallScore} / {result.totalQuestions} correct
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Radar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="category" stroke="var(--muted-foreground)" fontSize={12} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="var(--border)" fontSize={10} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {result.categoryScores.map((cs) => (
                <ResultCard
                  key={cs.category}
                  label={cs.label}
                  value={`${cs.percentage}%`}
                  sublabel={`${cs.correct}/${cs.total} correct`}
                  variant={cs.percentage >= 65 ? "success" : cs.percentage >= 40 ? "default" : "danger"}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weak areas & recommendations */}
        {result.recommendedTools.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recommended Practice</CardTitle>
              <CardDescription>
                Based on your weak areas, try these tools to improve.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.recommendedTools.map((tool) => (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.id}`}
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.reason}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleStart}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Quiz
          </Button>
        </div>

        <AiInsightsPanel
          explanation={ai.explanation}
          isLoading={ai.isLoading}
          error={ai.error}
          onExplain={() =>
            ai.explain({
              overallPercentage: result.overallPercentage,
              profileLabel: result.profileLabel,
              categoryScores: result.categoryScores.map((cs) => ({
                category: cs.label,
                percentage: cs.percentage,
                correct: cs.correct,
                total: cs.total,
              })),
              weakCategories: result.weakCategories,
            })
          }
          onDismiss={ai.reset}
        />
      </div>
    );
  }

  // Questions phase
  const isCorrect = selectedOption === currentQuestion.correctIndex;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finance Self-Assessment</h1>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progressPercent} className="flex-1" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {currentIndex + 1} / {totalQuestions}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardDescription className="text-xs uppercase tracking-wider">
            {getCategoryLabel(currentQuestion.category)}
          </CardDescription>
          <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.options.map((option, i) => {
            let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
            if (showExplanation) {
              if (i === currentQuestion.correctIndex) variant = "default";
              else if (i === selectedOption && !isCorrect) variant = "destructive";
              else variant = "secondary";
            }

            return (
              <Button
                key={i}
                variant={variant}
                className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal"
                onClick={() => handleSelectOption(i)}
                disabled={showExplanation}
              >
                <span className="mr-3 font-mono text-xs shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                {option}
                {showExplanation && i === currentQuestion.correctIndex && (
                  <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-green-400" />
                )}
                {showExplanation && i === selectedOption && !isCorrect && (
                  <XCircle className="ml-auto h-4 w-4 shrink-0" />
                )}
              </Button>
            );
          })}

          {showExplanation && (
            <div className="mt-4 p-3 rounded-md bg-muted/50 border border-border/50">
              <p className="text-sm font-medium mb-1">
                {isCorrect ? "Correct!" : "Not quite."}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          {showExplanation && (
            <Button className="w-full mt-2" onClick={handleNext}>
              {currentIndex < totalQuestions - 1 ? (
                <>
                  Next Question
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  See Results
                  <Trophy className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getCategoryLabel(category: QuizCategory): string {
  const labels: Record<QuizCategory, string> = {
    "financial-statements": "Financial Statements",
    valuation: "Valuation",
    "cash-management": "Cash Management",
    fundraising: "Fundraising",
    compliance: "Compliance",
  };
  return labels[category];
}

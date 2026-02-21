"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { ResultCard } from "@/components/shared/result-card";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { formatPHP } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import {
  Lock,
  FlaskConical,
  Lightbulb,
  HandCoins,
  Settings,
  Rocket,
  FileText,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { TOOLS } from "@/lib/constants";
import {
  type FundraisingStage,
  type ChecklistItem,
  getStageInfo,
  getStageChecklist,
  computeStageSummary,
  areDependenciesMet,
  STAGE_ORDER,
  STAGE_LABELS,
  STAGE_COLORS,
} from "@/lib/calculations/fundraising-guide";

const STORAGE_KEY_PREFIX = "fundraising-guide-";

const STAGE_ICONS = {
  research: FlaskConical,
  "proof-of-concept": Lightbulb,
  fundraising: HandCoins,
  operations: Settings,
  scaling: Rocket,
} as const;

const STAGE_DESCRIPTIONS: Record<FundraisingStage, string> = {
  research: "Validate problem & prototype",
  "proof-of-concept": "MVP, first revenue, retention",
  fundraising: "Pitch, negotiate, close round",
  operations: "Team, processes, break-even",
  scaling: "Expand, hire leaders, Series A",
};

function loadCompleted(stage: FundraisingStage): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + stage);
    if (stored) return new Set(JSON.parse(stored));
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveCompleted(stage: FundraisingStage, ids: Set<string>) {
  try {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + stage,
      JSON.stringify([...ids])
    );
  } catch {
    /* ignore */
  }
}

export default function FundraisingGuidePage() {
  const [activeStage, setActiveStage] =
    useState<FundraisingStage>("research");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  const ai = useAiExplain("fundraising-guide");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setCompletedIds(loadCompleted(activeStage));
    }
  }, [activeStage, mounted]);

  const stageInfo = useMemo(() => getStageInfo(activeStage), [activeStage]);
  const stageItems = useMemo(
    () => getStageChecklist(activeStage),
    [activeStage]
  );
  const summary = useMemo(
    () => computeStageSummary(stageItems, completedIds),
    [stageItems, completedIds]
  );

  // Compute overall progress across all stages
  const overallProgress = useMemo(() => {
    if (!mounted) return { completed: 0, total: 0, percent: 0 };
    let completed = 0;
    let total = 0;
    for (const stage of STAGE_ORDER) {
      const items = getStageChecklist(stage);
      total += items.length;
      const saved = loadCompleted(stage);
      completed += items.filter((i) => saved.has(i.id)).length;
    }
    return {
      completed,
      total,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  }, [mounted, completedIds]);

  const toggleItem = useCallback(
    (itemId: string) => {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        saveCompleted(activeStage, next);
        return next;
      });
    },
    [activeStage]
  );

  const progressVariant =
    summary.progressPercent >= 80
      ? "success"
      : summary.progressPercent >= 40
        ? "warning"
        : "default";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Fundraising Stage Guide</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Navigate the startup lifecycle from R&D to Scaling. Track your
          progress at each stage with checklists, key metrics, and funding
          sources.
        </p>
      </div>

      {/* Stage Selector */}
      <div>
        <p className="text-sm font-medium mb-3">Select your current stage:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAGE_ORDER.map((stage) => {
            const Icon = STAGE_ICONS[stage];
            const isActive = activeStage === stage;
            return (
              <button
                key={stage}
                onClick={() => setActiveStage(stage)}
                className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : ""}`}
                />
                <div>
                  <p className="text-sm font-medium">{STAGE_LABELS[stage]}</p>
                  <p className="text-xs text-muted-foreground">
                    {STAGE_DESCRIPTIONS[stage]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ResultCard
          label="Stage Progress"
          value={`${summary.completedItems}/${summary.totalItems}`}
          sublabel={`${summary.progressPercent}% complete`}
          variant={progressVariant}
        />
        <ResultCard
          label="Items Remaining"
          value={`${summary.itemsRemaining}`}
          sublabel={`in ${STAGE_LABELS[activeStage]}`}
        />
        <ResultCard
          label="Typical Valuation"
          value={
            stageInfo.valuationRange.min === 0
              ? `Up to ${formatPHP(stageInfo.valuationRange.max)}`
              : `${formatPHP(stageInfo.valuationRange.min)} – ${formatPHP(stageInfo.valuationRange.max)}`
          }
          sublabel="For PH startups at this stage"
        />
        <ResultCard
          label="Overall Progress"
          value={`${overallProgress.completed}/${overallProgress.total}`}
          sublabel={`${overallProgress.percent}% across all stages`}
          variant={overallProgress.percent >= 80 ? "success" : "default"}
        />
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">
              {STAGE_LABELS[activeStage]} Progress
            </p>
            <p className="text-sm text-muted-foreground">
              {summary.progressPercent}%
            </p>
          </div>
          <Progress value={summary.progressPercent} className="h-2" />
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
            {STAGE_ORDER.map((stage) => {
              const items = getStageChecklist(stage);
              const saved = mounted ? loadCompleted(stage) : new Set<string>();
              const done = items.filter((i) => saved.has(i.id)).length;
              return (
                <div key={stage} className="flex items-center gap-1.5">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${STAGE_COLORS[stage]}`}
                  />
                  <span>
                    {STAGE_LABELS[stage]}: {done}/{items.length}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {(() => {
              const Icon = STAGE_ICONS[activeStage];
              return <Icon className="h-5 w-5 text-primary" />;
            })()}
            {STAGE_LABELS[activeStage]} Stage
          </CardTitle>
          <CardDescription>{stageInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Funding Sources */}
          <div>
            <p className="text-sm font-medium mb-2">Typical Funding Sources</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {stageInfo.fundingSources.map((source) => (
                <div
                  key={source.name}
                  className="rounded-md border border-border/50 p-3"
                >
                  <p className="text-sm font-medium">{source.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {source.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div>
            <p className="text-sm font-medium mb-2">
              Key Metrics Investors Look For
            </p>
            <ul className="space-y-1">
              {stageInfo.keyMetrics.map((metric) => (
                <li
                  key={metric}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-primary mt-1.5 shrink-0">-</span>
                  {metric}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Accordion
        type="multiple"
        defaultValue={["checklist"]}
        className="space-y-3"
      >
        <AccordionItem value="checklist" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${STAGE_COLORS[activeStage]}`}
              />
              <span className="font-semibold">
                {STAGE_LABELS[activeStage]} Checklist
              </span>
              <Badge variant="secondary" className="text-xs">
                {summary.completedItems}/{summary.totalItems}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pb-2">
              {stageItems.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  isCompleted={completedIds.has(item.id)}
                  isLocked={
                    !areDependenciesMet(item, completedIds, stageItems)
                  }
                  onToggle={toggleItem}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* AI Insights */}
      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
            stage: activeStage,
            stageLabel: STAGE_LABELS[activeStage],
            completedItems: [...completedIds],
            totalItems: summary.totalItems,
            completedCount: summary.completedItems,
            progressPercent: summary.progressPercent,
            valuationRange: `${formatPHP(stageInfo.valuationRange.min)} – ${formatPHP(stageInfo.valuationRange.max)}`,
            fundingSources: stageInfo.fundingSources.map((s) => s.name),
            keyMetrics: stageInfo.keyMetrics,
            overallProgress: overallProgress.percent,
          })
        }
        onDismiss={ai.reset}
      />

      <RelatedTools currentToolId="fundraising-guide" />
    </div>
  );
}

function ChecklistItemRow({
  item,
  isCompleted,
  isLocked,
  onToggle,
}: {
  item: ChecklistItem;
  isCompleted: boolean;
  isLocked: boolean;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isCompleted
          ? "border-green-500/30 bg-green-500/5"
          : isLocked
            ? "border-border/50 bg-muted/30 opacity-60"
            : "border-border hover:border-primary/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          {isLocked ? (
            <div className="h-4 w-4 flex items-center justify-center text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
            </div>
          ) : (
            <Checkbox
              id={item.id}
              checked={isCompleted}
              onCheckedChange={() => onToggle(item.id)}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => !isLocked && setExpanded(!expanded)}
            className="flex items-start justify-between w-full text-left gap-2"
          >
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  isCompleted ? "line-through text-muted-foreground" : ""
                }`}
              >
                {item.title}
              </p>
              {isLocked && (
                <p className="text-xs text-muted-foreground italic mt-1">
                  Complete prerequisites first
                </p>
              )}
            </div>
            {!isLocked && (
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            )}
          </button>

          {expanded && !isLocked && (
            <div className="mt-3 space-y-3 text-sm text-muted-foreground border-t border-border/50 pt-3">
              <p>{item.description}</p>
              {item.tips && (
                <div className="bg-primary/5 border border-primary/20 rounded-md p-2.5 text-xs">
                  <p className="font-medium text-primary mb-0.5">Tip:</p>
                  <p>{item.tips}</p>
                </div>
              )}
              {item.relatedToolId && (() => {
                const tool = TOOLS.find((t) => t.id === item.relatedToolId);
                if (!tool) return null;
                return (
                  <Link
                    href={tool.href}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Open {tool.name} <ArrowRight className="h-3 w-3" />
                  </Link>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

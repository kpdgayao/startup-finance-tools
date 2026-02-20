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
import { formatPHP } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import {
  Lock,
  Store,
  Users,
  Building2,
  FileText,
  Clock,
  Info,
} from "lucide-react";
import {
  type BusinessType,
  type ComplianceItem,
  type CompliancePhase,
  getFilteredChecklist,
  computeComplianceSummary,
  groupByPhase,
  areDependenciesMet,
  PHASE_LABELS,
  AGENCY_COLORS,
  DATA_LAST_UPDATED,
} from "@/lib/calculations/compliance-checklist";

const STORAGE_KEY_PREFIX = "compliance-checklist-";

const BUSINESS_TYPES: {
  value: BusinessType;
  label: string;
  description: string;
  icon: typeof Store;
}[] = [
  {
    value: "sole-proprietorship",
    label: "Sole Proprietorship",
    description: "DTI-registered, single owner",
    icon: Store,
  },
  {
    value: "partnership",
    label: "Partnership",
    description: "SEC-registered, 2+ partners",
    icon: Users,
  },
  {
    value: "corporation",
    label: "Corporation",
    description: "SEC-registered, stockholders",
    icon: Building2,
  },
];

const PHASE_COLORS: Record<CompliancePhase, string> = {
  registration: "bg-blue-500",
  "post-registration": "bg-amber-500",
  ongoing: "bg-green-500",
};

function loadCompleted(businessType: BusinessType): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + businessType);
    if (stored) return new Set(JSON.parse(stored));
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveCompleted(businessType: BusinessType, ids: Set<string>) {
  try {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + businessType,
      JSON.stringify([...ids])
    );
  } catch {
    /* ignore */
  }
}

export default function ComplianceChecklistPage() {
  const [businessType, setBusinessType] =
    useState<BusinessType>("sole-proprietorship");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  const ai = useAiExplain("compliance-checklist");

  // Load from localStorage on mount and when business type changes
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setCompletedIds(loadCompleted(businessType));
    }
  }, [businessType, mounted]);

  const filteredItems = useMemo(
    () => getFilteredChecklist(businessType),
    [businessType]
  );
  const summary = useMemo(
    () => computeComplianceSummary(filteredItems, completedIds),
    [filteredItems, completedIds]
  );
  const grouped = useMemo(() => groupByPhase(filteredItems), [filteredItems]);

  const toggleItem = useCallback(
    (itemId: string) => {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        saveCompleted(businessType, next);
        return next;
      });
    },
    [businessType]
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
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">PH Startup Compliance Checklist</h1>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            <Info className="h-3 w-3 mr-1" />
            As of {DATA_LAST_UPDATED}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Step-by-step guide to SEC, DTI, BIR, and LGU registration for Filipino
          founders. Progress is saved automatically.
        </p>
      </div>

      {/* Business Type Selector */}
      <div>
        <p className="text-sm font-medium mb-3">Select your business type:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BUSINESS_TYPES.map((bt) => {
            const Icon = bt.icon;
            const isActive = businessType === bt.value;
            return (
              <button
                key={bt.value}
                onClick={() => setBusinessType(bt.value)}
                className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
                <div>
                  <p className="text-sm font-medium">{bt.label}</p>
                  <p className="text-xs text-muted-foreground">{bt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ResultCard
          label="Progress"
          value={`${summary.completedItems}/${summary.totalItems}`}
          sublabel={`${summary.progressPercent}% complete`}
          variant={progressVariant}
        />
        <ResultCard
          label="Estimated Total Cost"
          value={
            summary.costMax === summary.costMin
              ? formatPHP(summary.costMin)
              : `${formatPHP(summary.costMin)} – ${formatPHP(summary.costMax)}`
          }
          sublabel={`${formatPHP(summary.completedCostMax)} spent so far`}
        />
        <ResultCard
          label="Estimated Remaining Days"
          value={`${summary.remainingDays} days`}
          sublabel="For registration steps"
        />
        <ResultCard
          label="Next Steps Ready"
          value={`${summary.nextSteps.length}`}
          sublabel={
            summary.nextSteps.length > 0
              ? summary.nextSteps[0].title
              : "All done!"
          }
          variant={summary.nextSteps.length > 0 ? "default" : "success"}
        />
      </div>

      {/* Phase Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Overall Progress</p>
            <p className="text-sm text-muted-foreground">
              {summary.progressPercent}%
            </p>
          </div>
          <Progress value={summary.progressPercent} className="h-2" />
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
            {(
              ["registration", "post-registration", "ongoing"] as CompliancePhase[]
            ).map((phase) => {
              const p = summary.byPhase[phase];
              return (
                <div key={phase} className="flex items-center gap-1.5">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${PHASE_COLORS[phase]}`}
                  />
                  <span>
                    {PHASE_LABELS[phase]}: {p.completed}/{p.total}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Checklist Accordion */}
      <Accordion
        type="multiple"
        defaultValue={["registration", "post-registration", "ongoing"]}
        className="space-y-3"
      >
        {(
          ["registration", "post-registration", "ongoing"] as CompliancePhase[]
        ).map((phase) => {
          const phaseItems = grouped[phase];
          if (phaseItems.length === 0) return null;
          const phaseProgress = summary.byPhase[phase];
          return (
            <AccordionItem key={phase} value={phase} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${PHASE_COLORS[phase]}`}
                  />
                  <span className="font-semibold">
                    {PHASE_LABELS[phase]}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {phaseProgress.completed}/{phaseProgress.total}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pb-2">
                  {phaseItems.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      isCompleted={completedIds.has(item.id)}
                      isLocked={
                        !areDependenciesMet(item, completedIds, filteredItems)
                      }
                      onToggle={toggleItem}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* AI Insights */}
      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
            businessType,
            completedItems: [...completedIds],
            totalItems: summary.totalItems,
            completedCount: summary.completedItems,
            progressPercent: summary.progressPercent,
            remainingCostRange: `${formatPHP(summary.costMin - summary.completedCostMin)} – ${formatPHP(summary.costMax - summary.completedCostMax)}`,
            nextSteps: summary.nextSteps.map((s) => s.title),
            byPhase: summary.byPhase,
          })
        }
        onDismiss={ai.reset}
      />
    </div>
  );
}

function ChecklistItem({
  item,
  isCompleted,
  isLocked,
  onToggle,
}: {
  item: ComplianceItem;
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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${AGENCY_COLORS[item.agency]}`}
                >
                  {item.agency}
                </Badge>
                {item.costMax > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {item.costMin === item.costMax
                      ? formatPHP(item.costMin)
                      : `${formatPHP(item.costMin)}–${formatPHP(item.costMax)}`}
                  </span>
                )}
                {item.estimatedDays > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {item.estimatedDays}d
                  </span>
                )}
                {isLocked && (
                  <span className="text-xs text-muted-foreground italic">
                    Complete prerequisites first
                  </span>
                )}
              </div>
            </div>
            {!isLocked && (
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            )}
          </button>

          {expanded && !isLocked && (
            <div className="mt-3 space-y-3 text-sm text-muted-foreground border-t border-border/50 pt-3">
              <p>{item.description}</p>
              {item.requiredDocuments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">
                    Required Documents:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {item.requiredDocuments.map((doc) => (
                      <li key={doc}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}
              {item.tips && (
                <div className="bg-primary/5 border border-primary/20 rounded-md p-2.5 text-xs">
                  <p className="font-medium text-primary mb-0.5">Tip:</p>
                  <p>{item.tips}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

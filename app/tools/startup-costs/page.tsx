"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/shared/currency-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { EcosystemBanner } from "@/components/shared/ecosystem-banner";
import { formatPHP } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import { type BusinessType } from "@/lib/calculations/compliance-checklist";
import {
  type CostCategory,
  type CostLineItem,
  calculateRegistrationCosts,
  calculateTotalStartupCosts,
  getDefaultCategories,
} from "@/lib/calculations/startup-costs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import {
  Plus,
  Trash2,
  ExternalLink,
  Store,
  Users,
  Building2,
} from "lucide-react";
import Link from "next/link";

const BUSINESS_TYPES: {
  value: BusinessType;
  label: string;
  icon: typeof Store;
}[] = [
  { value: "sole-proprietorship", label: "Sole Proprietorship", icon: Store },
  { value: "partnership", label: "Partnership", icon: Users },
  { value: "corporation", label: "Corporation", icon: Building2 },
];

export default function StartupCostsPage() {
  const [businessType, setBusinessType] =
    useState<BusinessType>("corporation");
  const [categories, setCategories] = useState<CostCategory[]>(
    getDefaultCategories
  );
  const [bufferMonths, setBufferMonths] = useState(3);

  const ai = useAiExplain("startup-costs");

  const regCosts = useMemo(
    () => calculateRegistrationCosts(businessType),
    [businessType]
  );

  const result = useMemo(
    () =>
      calculateTotalStartupCosts({
        businessType,
        categories,
        bufferMonths,
        contingencyPercent: 20,
      }),
    [businessType, categories, bufferMonths]
  );

  const updateItem = useCallback(
    (
      catId: string,
      itemId: string,
      field: keyof CostLineItem,
      value: unknown
    ) => {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === catId
            ? {
                ...cat,
                items: cat.items.map((item) =>
                  item.id === itemId ? { ...item, [field]: value } : item
                ),
              }
            : cat
        )
      );
    },
    []
  );

  const addItem = useCallback((catId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? {
              ...cat,
              items: [
                ...cat.items,
                {
                  id: `${catId}-${Date.now()}`,
                  name: "",
                  amount: 0,
                  isRecurring: false,
                },
              ],
            }
          : cat
      )
    );
  }, []);

  const removeItem = useCallback((catId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) }
          : cat
      )
    );
  }, []);

  const chartData = result.byCategory.map((c) => ({
    category: c.category.replace(" & ", "\n& "),
    "One-Time": c.oneTime,
    Recurring: c.recurring * bufferMonths,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Startup Cost Estimator</h1>
        <p className="text-muted-foreground mt-1">
          Estimate your total startup capital with PH-specific registration
          costs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Business Type
            <InfoTooltip content="Your business type determines registration requirements and costs. These are pulled directly from the PH Compliance Checklist." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {BUSINESS_TYPES.map((bt) => {
              const Icon = bt.icon;
              const isSelected = businessType === bt.value;
              return (
                <button
                  key={bt.value}
                  onClick={() => setBusinessType(bt.value)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/50"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 mb-2 ${
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <p className="text-sm font-medium">{bt.label}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Registration & Legal — read-only from compliance checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration & Legal</CardTitle>
          <CardDescription>
            Costs pulled from{" "}
            <Link
              href="/tools/compliance-checklist"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              PH Compliance Checklist <ExternalLink className="h-3 w-3" />
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {regCosts.items.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between py-1.5 text-sm border-b border-border/30 last:border-0"
              >
                <span className="text-muted-foreground">{item.name}</span>
                <span>
                  {item.costMin === item.costMax
                    ? formatPHP(item.costMin)
                    : `${formatPHP(item.costMin)} – ${formatPHP(item.costMax)}`}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex justify-between text-sm font-medium">
            <span>Estimated Registration Total</span>
            <span>
              {formatPHP(regCosts.costMin)} – {formatPHP(regCosts.costMax)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Editable categories */}
      {categories
        .filter((cat) => cat.id !== "registration")
        .map((cat) => (
          <Card key={cat.id}>
            <CardHeader>
              <CardTitle className="text-base">{cat.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cat.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <Input
                    value={item.name}
                    onChange={(e) =>
                      updateItem(cat.id, item.id, "name", e.target.value)
                    }
                    placeholder="Item name"
                    className="flex-1"
                  />
                  <CurrencyInput
                    label=""
                    value={item.amount}
                    onChange={(v) => updateItem(cat.id, item.id, "amount", v)}
                  />
                  <button
                    onClick={() =>
                      updateItem(
                        cat.id,
                        item.id,
                        "isRecurring",
                        !item.isRecurring
                      )
                    }
                    className="shrink-0"
                  >
                    <Badge
                      variant={item.isRecurring ? "default" : "secondary"}
                    >
                      {item.isRecurring ? "Monthly" : "One-time"}
                    </Badge>
                  </button>
                  <button
                    onClick={() => removeItem(cat.id, item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addItem(cat.id)}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add item
              </Button>
            </CardContent>
          </Card>
        ))}

      {/* Buffer months slider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Working Capital Buffer
            <InfoTooltip content="How many months of recurring costs to include as working capital. 3 months is bare minimum; 6 months recommended if pre-revenue." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <Label>Buffer months</Label>
            <span className="font-medium">{bufferMonths} months</span>
          </div>
          <Slider
            value={[bufferMonths]}
            onValueChange={([v]) => setBufferMonths(v)}
            min={3}
            max={6}
            step={1}
          />
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultCard
          label="Total One-Time Costs"
          value={formatPHP(result.totalOneTime)}
        />
        <ResultCard
          label="Monthly Recurring"
          value={formatPHP(result.totalMonthlyRecurring)}
        />
        <ResultCard
          label={`Buffer (${bufferMonths} months)`}
          value={formatPHP(result.bufferAmount)}
        />
        <ResultCard
          label="Recommended Capital"
          value={formatPHP(result.recommendedCapital)}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ResultCard
          label="20% Contingency"
          value={formatPHP(result.contingencyAmount)}
        />
        <ResultCard
          label="Registration Range"
          value={`${formatPHP(result.registrationCostMin)} – ${formatPHP(result.registrationCostMax)}`}
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Cost Breakdown by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => formatPHP(Number(value))}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={120}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                }}
                formatter={(value) => formatPHP(Number(value))}
              />
              <Legend />
              <Bar
                dataKey="One-Time"
                fill={CHART_COLORS[0]}
                stackId="costs"
              />
              <Bar
                dataKey="Recurring"
                fill={CHART_COLORS[1]}
                stackId="costs"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
            businessType,
            totalOneTime: result.totalOneTime,
            totalMonthlyRecurring: result.totalMonthlyRecurring,
            recommendedCapital: result.recommendedCapital,
            contingencyAmount: result.contingencyAmount,
            bufferMonths,
            registrationCostMin: result.registrationCostMin,
            registrationCostMax: result.registrationCostMax,
            byCategory: result.byCategory,
          })
        }
        onDismiss={ai.reset}
      />

      <EcosystemBanner toolId="startup-costs" />

      <RelatedTools currentToolId="startup-costs" />
    </div>
  );
}

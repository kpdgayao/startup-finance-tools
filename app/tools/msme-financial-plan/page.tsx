"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { ResultCard } from "@/components/shared/result-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { EcosystemBanner } from "@/components/shared/ecosystem-banner";
import { LearnLink } from "@/components/shared/learn-link";
import { ExportPDFButton, summaryCard, section, table } from "@/components/shared/export-pdf-button";
import { formatPHP } from "@/lib/utils";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import { Download, RotateCcw } from "lucide-react";
import {
  buildMsmeFinancialPlan,
  exportMsmePlanCSV,
  entityCapitalLabel,
  entityDistributionLabel,
  DEFAULT_SCENARIOS,
  SCENARIO_KEYS,
  OPEX_LINES,
  type AnnualRow,
  type BalanceSheetSeed,
  type EntityType,
  type RevenueModel,
  type ScenarioKey,
  type ScenarioOutput,
  type SCERow,
  type ScenarioMultipliers,
} from "@/lib/calculations/msme-financial-plan";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  conservative: "Conservative",
  base: "Base",
  optimistic: "Optimistic",
};

const SCENARIO_DESCRIPTIONS: Record<ScenarioKey, string> = {
  conservative: "Slower growth, higher costs — plan for the worst",
  base: "Your most likely outcome — the realistic plan",
  optimistic: "Stronger growth, leaner costs — best case",
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-medium text-sm mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono font-medium">{formatPHP(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

const tickFormatter = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₱${(v / 1_000).toFixed(0)}K`;
  return `₱${v}`;
};

function PLTable({ annual, distLabel }: { annual: AnnualRow[]; distLabel: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">P&L Item</th>
            {annual.map((a) => (
              <th key={a.year} className="text-right py-3 px-2 font-medium text-muted-foreground">
                Year {a.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2">Revenue</td>
            {annual.map((a) => (
              <td key={a.year} className="py-2.5 px-2 text-right font-mono">
                {formatPHP(a.revenue)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2">Cost of Goods Sold</td>
            {annual.map((a) => (
              <td key={a.year} className="py-2.5 px-2 text-right font-mono">
                {formatPHP(a.cogs)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50 bg-muted/20">
            <td className="py-2.5 px-2 font-semibold">Gross Profit</td>
            {annual.map((a) => (
              <td key={a.year} className="py-2.5 px-2 text-right font-mono font-semibold">
                {formatPHP(a.grossProfit)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2 text-muted-foreground italic">Gross Margin %</td>
            {annual.map((a) => (
              <td key={a.year} className="py-2.5 px-2 text-right font-mono text-muted-foreground">
                {a.grossMarginPercent.toFixed(1)}%
              </td>
            ))}
          </tr>
          <tr>
            <td colSpan={annual.length + 1} className="pt-3 pb-1 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Operating Expenses
            </td>
          </tr>
          {OPEX_LINES.map((line) => (
            <tr key={line.key} className="border-b border-border/50">
              <td className="py-2 px-2 pl-6 text-muted-foreground">{line.label}</td>
              {annual.map((a) => (
                <td key={a.year} className="py-2 px-2 text-right font-mono text-muted-foreground">
                  {formatPHP(a.opex[line.key])}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-b border-border/50 bg-muted/10">
            <td className="py-2.5 px-2 font-medium">Total Operating Expenses</td>
            {annual.map((a) => (
              <td key={a.year} className="py-2.5 px-2 text-right font-mono font-medium">
                {formatPHP(a.opex.total)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50 bg-muted/20">
            <td className="py-2.5 px-2 font-semibold">EBITDA</td>
            {annual.map((a) => (
              <td key={a.year} className={`py-2.5 px-2 text-right font-mono font-semibold ${a.ebitda < 0 ? "text-red-400" : ""}`}>
                {formatPHP(a.ebitda)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2">Depreciation</td>
            {annual.map((a) => (
              <td key={a.year} className="py-2.5 px-2 text-right font-mono">
                {formatPHP(a.depreciation)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50 bg-muted/20">
            <td className="py-2.5 px-2 font-semibold">EBIT (Operating Profit)</td>
            {annual.map((a) => (
              <td key={a.year} className={`py-2.5 px-2 text-right font-mono font-semibold ${a.ebit < 0 ? "text-red-400" : ""}`}>
                {formatPHP(a.ebit)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2">Interest Expense</td>
            {annual.map((a) => (
              <td key={a.year} className="py-2.5 px-2 text-right font-mono">
                {formatPHP(a.interestExpense)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2">Pre-tax Income</td>
            {annual.map((a) => (
              <td key={a.year} className={`py-2.5 px-2 text-right font-mono ${a.preTaxIncome < 0 ? "text-red-400" : ""}`}>
                {formatPHP(a.preTaxIncome)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2">Tax</td>
            {annual.map((a) => (
              <td key={a.year} className="py-2.5 px-2 text-right font-mono">
                {formatPHP(a.tax)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50 bg-muted/20">
            <td className="py-2.5 px-2 font-semibold">Net Income</td>
            {annual.map((a) => (
              <td key={a.year} className={`py-2.5 px-2 text-right font-mono font-semibold ${a.netIncome < 0 ? "text-red-400" : ""}`}>
                {formatPHP(a.netIncome)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2 text-muted-foreground italic">Net Margin %</td>
            {annual.map((a) => (
              <td key={a.year} className={`py-2.5 px-2 text-right font-mono ${a.netMarginPercent < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                {a.netMarginPercent.toFixed(1)}%
              </td>
            ))}
          </tr>
          <tr>
            <td className="py-2.5 px-2 text-muted-foreground italic">{distLabel}</td>
            {annual.map((a) => (
              <td key={a.year} className="py-2.5 px-2 text-right font-mono text-muted-foreground">
                {formatPHP(a.distributions)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BSTable({
  annual,
  seed,
  capitalLabel,
}: {
  annual: AnnualRow[];
  seed: BalanceSheetSeed;
  capitalLabel: string;
}) {
  type BSKey = keyof BalanceSheetSeed;
  const sections: { heading: string; rows: { label: string; key: BSKey; bold?: boolean }[] }[] = [
    {
      heading: "Assets",
      rows: [
        { label: "Cash", key: "cash" },
        { label: "Accounts Receivable", key: "accountsReceivable" },
        { label: "Inventory", key: "inventory" },
        { label: "Net PP&E", key: "netPPE" },
        { label: "Total Assets", key: "totalAssets", bold: true },
      ],
    },
    {
      heading: "Liabilities",
      rows: [
        { label: "Accounts Payable", key: "accountsPayable" },
        { label: "Loan Balance", key: "loanBalance" },
        { label: "Total Liabilities", key: "totalLiabilities", bold: true },
      ],
    },
    {
      heading: "Equity",
      rows: [
        { label: capitalLabel, key: "capital" },
        { label: "Retained Earnings", key: "retainedEarnings" },
        { label: "Total Equity", key: "totalEquity", bold: true },
      ],
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">Balance Sheet</th>
            <th className="text-right py-3 px-2 font-medium text-muted-foreground">Year 0</th>
            {annual.map((a) => (
              <th key={a.year} className="text-right py-3 px-2 font-medium text-muted-foreground">
                Year {a.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((sec) => (
            <Fragment key={sec.heading}>
              <tr>
                <td colSpan={annual.length + 2} className="pt-3 pb-1 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {sec.heading}
                </td>
              </tr>
              {sec.rows.map((row) => (
                <tr key={row.key} className={`border-b border-border/50 ${row.bold ? "bg-muted/20" : ""}`}>
                  <td className={`py-2.5 px-2 ${row.bold ? "font-semibold" : ""}`}>{row.label}</td>
                  <td className={`py-2.5 px-2 text-right font-mono ${row.bold ? "font-semibold" : ""}`}>
                    {formatPHP(seed[row.key])}
                  </td>
                  {annual.map((a) => (
                    <td
                      key={a.year}
                      className={`py-2.5 px-2 text-right font-mono ${row.bold ? "font-semibold" : ""} ${a[row.key] < 0 ? "text-red-400" : ""}`}
                    >
                      {formatPHP(a[row.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CFTable({ annual, distLabel }: { annual: AnnualRow[]; distLabel: string }) {
  const rows: { label: string; key: keyof AnnualRow; bold?: boolean; muted?: boolean }[] = [
    { label: "Operating Cash Flow", key: "operatingCF", bold: true },
    { label: "Investing Cash Flow (CapEx)", key: "investingCF" },
    { label: "Financing Cash Flow", key: "financingCF" },
    { label: `  of which ${distLabel}`, key: "distributions", muted: true },
    { label: "Net Cash Flow", key: "netCashFlow", bold: true },
    { label: "Ending Cash", key: "cash", bold: true },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">Cash Flow</th>
            {annual.map((a) => (
              <th key={a.year} className="text-right py-3 px-2 font-medium text-muted-foreground">
                Year {a.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={`border-b border-border/50 ${row.bold ? "bg-muted/20" : ""}`}>
              <td className={`py-2.5 px-2 ${row.bold ? "font-semibold" : ""} ${row.muted ? "text-muted-foreground italic" : ""}`}>
                {row.label}
              </td>
              {annual.map((a) => {
                const val = a[row.key] as number;
                const display = row.key === "distributions" ? -val : val;
                return (
                  <td
                    key={a.year}
                    className={`py-2.5 px-2 text-right font-mono ${row.bold ? "font-semibold" : ""} ${row.muted ? "text-muted-foreground" : ""} ${display < 0 ? "text-red-400" : ""}`}
                  >
                    {formatPHP(display)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SCETable({ sce, capitalLabel }: { sce: SCERow[]; capitalLabel: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">Statement of Changes in Equity</th>
            {sce.map((r) => (
              <th key={r.year} className="text-right py-3 px-2 font-medium text-muted-foreground">
                Year {r.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2">Beginning {capitalLabel}</td>
            {sce.map((r) => (
              <td key={r.year} className="py-2.5 px-2 text-right font-mono">
                {formatPHP(r.beginningCapital)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2">Add: Contributions</td>
            {sce.map((r) => (
              <td key={r.year} className="py-2.5 px-2 text-right font-mono">
                {formatPHP(r.contributions)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2">Add: Net Income</td>
            {sce.map((r) => (
              <td key={r.year} className={`py-2.5 px-2 text-right font-mono ${r.netIncome < 0 ? "text-red-400" : ""}`}>
                {formatPHP(r.netIncome)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2">Less: Distributions</td>
            {sce.map((r) => (
              <td key={r.year} className="py-2.5 px-2 text-right font-mono">
                ({formatPHP(r.distributions)})
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50 bg-muted/20">
            <td className="py-2.5 px-2 font-semibold">Ending {capitalLabel}</td>
            {sce.map((r) => (
              <td key={r.year} className="py-2.5 px-2 text-right font-mono font-semibold">
                {formatPHP(r.endingCapital)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ScenarioCard({
  scenarioKey,
  output,
  active,
  onClick,
}: {
  scenarioKey: ScenarioKey;
  output: ScenarioOutput;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-lg border transition-all ${
        active
          ? "border-primary bg-primary/5 shadow-[0_0_15px_-3px] shadow-primary/30"
          : "border-border/50 hover:border-border hover:shadow-[0_0_15px_-3px] hover:shadow-primary/15"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>
          {SCENARIO_LABELS[scenarioKey]}
        </span>
        {active && <span className="text-xs text-primary">● Active</span>}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{SCENARIO_DESCRIPTIONS[scenarioKey]}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Final yr revenue</span>
          <span className="font-mono">{formatPHP(output.annual[output.annual.length - 1].revenue)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Final yr net income</span>
          <span className={`font-mono ${output.summary.finalYearNetIncome < 0 ? "text-red-400" : ""}`}>
            {formatPHP(output.summary.finalYearNetIncome)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Final yr cash</span>
          <span className={`font-mono ${output.summary.finalYearCash < 0 ? "text-red-400" : ""}`}>
            {formatPHP(output.summary.finalYearCash)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Break-even year</span>
          <span className="font-mono">{output.summary.breakEvenYear ?? "—"}</span>
        </div>
      </div>
    </button>
  );
}

const DEFAULTS = {
  entityType: "cooperative" as EntityType,
  startingCapital: 500_000,
  horizonYears: 5,
  revenueModel: "lump-sum" as RevenueModel,
  startingAnnualRevenue: 2_400_000,
  annualGrowthRate: 15,
  startingUnits: 12_000,
  unitPrice: 200,
  unitGrowthRate: 12,
  priceGrowthRate: 3,
  cogsPercent: 45,
  opex: {
    rent: 120_000,
    utilities: 48_000,
    salaries: 540_000,
    marketing: 50_000,
    transportation: 36_000,
    supplies: 30_000,
    insurance: 24_000,
    other: 24_000,
  },
  opexAnnualGrowth: 5,
  daysToCollect: 30,
  daysToPay: 30,
  inventoryDays: 45,
  capExSchedule: [300_000, 50_000, 100_000, 0, 50_000, 0, 0],
  usefulLifeYears: 7,
  loanEnabled: true,
  loanPrincipal: 500_000,
  loanInterestRate: 8,
  loanTermYears: 5,
  loanGracePeriodYears: 1,
  taxRate: 20,
  distributionPercent: 25,
};

export default function MsmeFinancialPlanPage() {
  const [entityType, setEntityType] = useState<EntityType>(DEFAULTS.entityType);
  const [startingCapital, setStartingCapital] = useState(DEFAULTS.startingCapital);
  const [horizonYears, setHorizonYears] = useState(DEFAULTS.horizonYears);

  const [revenueModel, setRevenueModel] = useState<RevenueModel>(DEFAULTS.revenueModel);
  const [startingAnnualRevenue, setStartingAnnualRevenue] = useState(DEFAULTS.startingAnnualRevenue);
  const [annualGrowthRate, setAnnualGrowthRate] = useState(DEFAULTS.annualGrowthRate);
  const [startingUnits, setStartingUnits] = useState(DEFAULTS.startingUnits);
  const [unitPrice, setUnitPrice] = useState(DEFAULTS.unitPrice);
  const [unitGrowthRate, setUnitGrowthRate] = useState(DEFAULTS.unitGrowthRate);
  const [priceGrowthRate, setPriceGrowthRate] = useState(DEFAULTS.priceGrowthRate);

  const [cogsPercent, setCogsPercent] = useState(DEFAULTS.cogsPercent);
  const [opexRent, setOpexRent] = useState(DEFAULTS.opex.rent);
  const [opexUtilities, setOpexUtilities] = useState(DEFAULTS.opex.utilities);
  const [opexSalaries, setOpexSalaries] = useState(DEFAULTS.opex.salaries);
  const [opexMarketing, setOpexMarketing] = useState(DEFAULTS.opex.marketing);
  const [opexTransportation, setOpexTransportation] = useState(DEFAULTS.opex.transportation);
  const [opexSupplies, setOpexSupplies] = useState(DEFAULTS.opex.supplies);
  const [opexInsurance, setOpexInsurance] = useState(DEFAULTS.opex.insurance);
  const [opexOther, setOpexOther] = useState(DEFAULTS.opex.other);
  const [opexAnnualGrowth, setOpexAnnualGrowth] = useState(DEFAULTS.opexAnnualGrowth);

  const [daysToCollect, setDaysToCollect] = useState(DEFAULTS.daysToCollect);
  const [daysToPay, setDaysToPay] = useState(DEFAULTS.daysToPay);
  const [inventoryDays, setInventoryDays] = useState(DEFAULTS.inventoryDays);

  const [capExSchedule, setCapExSchedule] = useState<number[]>(DEFAULTS.capExSchedule);
  const [usefulLifeYears, setUsefulLifeYears] = useState(DEFAULTS.usefulLifeYears);

  const [loanEnabled, setLoanEnabled] = useState(DEFAULTS.loanEnabled);
  const [loanPrincipal, setLoanPrincipal] = useState(DEFAULTS.loanPrincipal);
  const [loanInterestRate, setLoanInterestRate] = useState(DEFAULTS.loanInterestRate);
  const [loanTermYears, setLoanTermYears] = useState(DEFAULTS.loanTermYears);
  const [loanGracePeriodYears, setLoanGracePeriodYears] = useState(DEFAULTS.loanGracePeriodYears);

  const [taxRate, setTaxRate] = useState(DEFAULTS.taxRate);
  const [distributionPercent, setDistributionPercent] = useState(DEFAULTS.distributionPercent);

  const [scenarioMultipliers, setScenarioMultipliers] = useState<Record<ScenarioKey, ScenarioMultipliers>>(DEFAULT_SCENARIOS);

  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("base");

  const inputs = useMemo(
    () => ({
      entityType,
      startingCapital,
      horizonYears,
      revenueModel,
      startingAnnualRevenue,
      annualGrowthRate,
      startingUnits,
      unitPrice,
      unitGrowthRate,
      priceGrowthRate,
      cogsPercent,
      opex: {
        rent: opexRent,
        utilities: opexUtilities,
        salaries: opexSalaries,
        marketing: opexMarketing,
        transportation: opexTransportation,
        supplies: opexSupplies,
        insurance: opexInsurance,
        other: opexOther,
      },
      opexAnnualGrowth,
      daysToCollect,
      daysToPay,
      inventoryDays,
      capExSchedule,
      usefulLifeYears,
      loanEnabled,
      loanPrincipal,
      loanInterestRate,
      loanTermYears,
      loanGracePeriodYears,
      taxRate,
      distributionPercent,
      scenarios: scenarioMultipliers,
    }),
    [
      entityType,
      startingCapital,
      horizonYears,
      revenueModel,
      startingAnnualRevenue,
      annualGrowthRate,
      startingUnits,
      unitPrice,
      unitGrowthRate,
      priceGrowthRate,
      cogsPercent,
      opexRent,
      opexUtilities,
      opexSalaries,
      opexMarketing,
      opexTransportation,
      opexSupplies,
      opexInsurance,
      opexOther,
      opexAnnualGrowth,
      daysToCollect,
      daysToPay,
      inventoryDays,
      capExSchedule,
      usefulLifeYears,
      loanEnabled,
      loanPrincipal,
      loanInterestRate,
      loanTermYears,
      loanGracePeriodYears,
      taxRate,
      distributionPercent,
      scenarioMultipliers,
    ]
  );

  const result = useMemo(() => buildMsmeFinancialPlan(inputs), [inputs]);
  const active = result.scenarios[activeScenario];
  const capitalLabel = entityCapitalLabel(entityType);
  const distLabel = entityDistributionLabel(entityType);

  const ai = useAiExplain("msme-financial-plan");

  const handleReset = () => {
    setEntityType(DEFAULTS.entityType);
    setStartingCapital(DEFAULTS.startingCapital);
    setHorizonYears(DEFAULTS.horizonYears);
    setRevenueModel(DEFAULTS.revenueModel);
    setStartingAnnualRevenue(DEFAULTS.startingAnnualRevenue);
    setAnnualGrowthRate(DEFAULTS.annualGrowthRate);
    setStartingUnits(DEFAULTS.startingUnits);
    setUnitPrice(DEFAULTS.unitPrice);
    setUnitGrowthRate(DEFAULTS.unitGrowthRate);
    setPriceGrowthRate(DEFAULTS.priceGrowthRate);
    setCogsPercent(DEFAULTS.cogsPercent);
    setOpexRent(DEFAULTS.opex.rent);
    setOpexUtilities(DEFAULTS.opex.utilities);
    setOpexSalaries(DEFAULTS.opex.salaries);
    setOpexMarketing(DEFAULTS.opex.marketing);
    setOpexTransportation(DEFAULTS.opex.transportation);
    setOpexSupplies(DEFAULTS.opex.supplies);
    setOpexInsurance(DEFAULTS.opex.insurance);
    setOpexOther(DEFAULTS.opex.other);
    setOpexAnnualGrowth(DEFAULTS.opexAnnualGrowth);
    setDaysToCollect(DEFAULTS.daysToCollect);
    setDaysToPay(DEFAULTS.daysToPay);
    setInventoryDays(DEFAULTS.inventoryDays);
    setCapExSchedule(DEFAULTS.capExSchedule);
    setUsefulLifeYears(DEFAULTS.usefulLifeYears);
    setLoanEnabled(DEFAULTS.loanEnabled);
    setLoanPrincipal(DEFAULTS.loanPrincipal);
    setLoanInterestRate(DEFAULTS.loanInterestRate);
    setLoanTermYears(DEFAULTS.loanTermYears);
    setLoanGracePeriodYears(DEFAULTS.loanGracePeriodYears);
    setTaxRate(DEFAULTS.taxRate);
    setDistributionPercent(DEFAULTS.distributionPercent);
    setScenarioMultipliers(DEFAULT_SCENARIOS);
    setActiveScenario("base");
  };

  const handleExportCSV = () => {
    const csv = exportMsmePlanCSV(result, inputs);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "msme-financial-plan.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const setCapExYear = (yearIdx: number, value: number) => {
    setCapExSchedule((prev) => {
      const next = [...prev];
      next[yearIdx] = value;
      return next;
    });
  };

  const plChartData = useMemo(
    () =>
      active.annual.map((a) => ({
        name: `Year ${a.year}`,
        Revenue: a.revenue,
        "Gross Profit": a.grossProfit,
        "Net Income": a.netIncome,
      })),
    [active]
  );

  const bsChartData = useMemo(
    () => [
      {
        name: "Year 0",
        Cash: active.seed.cash,
        AR: active.seed.accountsReceivable,
        Inventory: active.seed.inventory,
        "Net PP&E": active.seed.netPPE,
      },
      ...active.annual.map((a) => ({
        name: `Year ${a.year}`,
        Cash: a.cash,
        AR: a.accountsReceivable,
        Inventory: a.inventory,
        "Net PP&E": a.netPPE,
      })),
    ],
    [active]
  );

  const cfChartData = useMemo(
    () =>
      active.annual.map((a) => ({
        name: `Year ${a.year}`,
        Operating: a.operatingCF,
        Investing: a.investingCF,
        Financing: a.financingCF,
        "Net CF": a.netCashFlow,
      })),
    [active]
  );

  const sceChartData = useMemo(
    () =>
      active.sce.map((r) => ({
        name: `Year ${r.year}`,
        "Beginning Capital": r.beginningCapital,
        "Net Income": r.netIncome,
        Distributions: -r.distributions,
        "Ending Capital": r.endingCapital,
      })),
    [active]
  );

  const buildPdfContent = () => {
    const parts: string[] = [];
    const N = horizonYears;
    const yearHeaders = Array.from({ length: N }, (_, i) => `Year ${i + 1}`);

    parts.push(
      section(
        "Plan Overview",
        `<div class="summary-grid">
          ${summaryCard("Entity Type", entityType.replace("-", " "))}
          ${summaryCard("Horizon", `${N} years`)}
          ${summaryCard("Starting Capital", formatPHP(startingCapital))}
          ${summaryCard("Loan", loanEnabled ? `${formatPHP(loanPrincipal)} @ ${loanInterestRate}%` : "None")}
        </div>`
      )
    );

    parts.push(
      section(
        "Assumptions",
        `<div class="summary-grid">
          ${summaryCard("Revenue Model", revenueModel)}
          ${summaryCard(revenueModel === "lump-sum" ? "Starting Revenue" : "Starting Units × Price", revenueModel === "lump-sum" ? formatPHP(startingAnnualRevenue) : `${startingUnits.toLocaleString()} × ${formatPHP(unitPrice)}`)}
          ${summaryCard("Annual Growth", `${revenueModel === "lump-sum" ? annualGrowthRate : unitGrowthRate}%`)}
          ${summaryCard("COGS %", `${cogsPercent}%`)}
          ${summaryCard("OpEx Growth %", `${opexAnnualGrowth}%`)}
          ${summaryCard("Tax Rate", `${taxRate}%`)}
          ${summaryCard(`${distLabel} %`, `${distributionPercent}%`)}
          ${summaryCard("Days to Collect / Pay / Inv", `${daysToCollect} / ${daysToPay} / ${inventoryDays}`)}
        </div>`
      )
    );

    const scenarioRows: string[][] = [
      ["Final-Year Revenue", ...SCENARIO_KEYS.map((k) => formatPHP(result.scenarios[k].annual[N - 1].revenue))],
      ["Final-Year Net Income", ...SCENARIO_KEYS.map((k) => formatPHP(result.scenarios[k].summary.finalYearNetIncome))],
      ["Final-Year Cash", ...SCENARIO_KEYS.map((k) => formatPHP(result.scenarios[k].summary.finalYearCash))],
      ["Avg Gross Margin", ...SCENARIO_KEYS.map((k) => `${result.scenarios[k].summary.avgGrossMargin.toFixed(1)}%`)],
      ["Cumulative Net Income", ...SCENARIO_KEYS.map((k) => formatPHP(result.scenarios[k].summary.cumulativeNetIncome))],
      ["Break-even Year", ...SCENARIO_KEYS.map((k) => `${result.scenarios[k].summary.breakEvenYear ?? "—"}`)],
    ];
    parts.push(
      section(
        "Scenario Comparison Summary",
        table(["Metric", "Conservative", "Base", "Optimistic"], scenarioRows)
      )
    );

    for (const key of SCENARIO_KEYS) {
      const out = result.scenarios[key];
      parts.push(
        section(
          `${SCENARIO_LABELS[key]} Scenario — Profit & Loss`,
          table(
            ["P&L Item", ...yearHeaders],
            [
              ["Revenue", ...out.annual.map((a) => formatPHP(a.revenue))],
              ["COGS", ...out.annual.map((a) => formatPHP(a.cogs))],
              ["Gross Profit", ...out.annual.map((a) => formatPHP(a.grossProfit))],
              ["Gross Margin %", ...out.annual.map((a) => `${a.grossMarginPercent.toFixed(1)}%`)],
              ["Total OpEx", ...out.annual.map((a) => formatPHP(a.opex.total))],
              ["EBITDA", ...out.annual.map((a) => formatPHP(a.ebitda))],
              ["Depreciation", ...out.annual.map((a) => formatPHP(a.depreciation))],
              ["EBIT", ...out.annual.map((a) => formatPHP(a.ebit))],
              ["Interest Expense", ...out.annual.map((a) => formatPHP(a.interestExpense))],
              ["Pre-tax Income", ...out.annual.map((a) => formatPHP(a.preTaxIncome))],
              ["Tax", ...out.annual.map((a) => formatPHP(a.tax))],
              ["Net Income", ...out.annual.map((a) => formatPHP(a.netIncome))],
              ["Net Margin %", ...out.annual.map((a) => `${a.netMarginPercent.toFixed(1)}%`)],
            ]
          )
        )
      );
      parts.push(
        section(
          `${SCENARIO_LABELS[key]} Scenario — Balance Sheet`,
          table(
            ["Item", "Year 0", ...yearHeaders],
            [
              ["Cash", formatPHP(out.seed.cash), ...out.annual.map((a) => formatPHP(a.cash))],
              ["AR", formatPHP(out.seed.accountsReceivable), ...out.annual.map((a) => formatPHP(a.accountsReceivable))],
              ["Inventory", formatPHP(out.seed.inventory), ...out.annual.map((a) => formatPHP(a.inventory))],
              ["Net PP&E", formatPHP(out.seed.netPPE), ...out.annual.map((a) => formatPHP(a.netPPE))],
              ["Total Assets", formatPHP(out.seed.totalAssets), ...out.annual.map((a) => formatPHP(a.totalAssets))],
              ["AP", formatPHP(out.seed.accountsPayable), ...out.annual.map((a) => formatPHP(a.accountsPayable))],
              ["Loan Balance", formatPHP(out.seed.loanBalance), ...out.annual.map((a) => formatPHP(a.loanBalance))],
              ["Total Liabilities", formatPHP(out.seed.totalLiabilities), ...out.annual.map((a) => formatPHP(a.totalLiabilities))],
              [capitalLabel, formatPHP(out.seed.capital), ...out.annual.map((a) => formatPHP(a.capital))],
              ["Retained Earnings", formatPHP(out.seed.retainedEarnings), ...out.annual.map((a) => formatPHP(a.retainedEarnings))],
              ["Total Equity", formatPHP(out.seed.totalEquity), ...out.annual.map((a) => formatPHP(a.totalEquity))],
            ]
          )
        )
      );
      parts.push(
        section(
          `${SCENARIO_LABELS[key]} Scenario — Cash Flow`,
          table(
            ["Item", ...yearHeaders],
            [
              ["Operating CF", ...out.annual.map((a) => formatPHP(a.operatingCF))],
              ["Investing CF", ...out.annual.map((a) => formatPHP(a.investingCF))],
              ["Financing CF", ...out.annual.map((a) => formatPHP(a.financingCF))],
              ["Net Cash Flow", ...out.annual.map((a) => formatPHP(a.netCashFlow))],
              ["Ending Cash", ...out.annual.map((a) => formatPHP(a.cash))],
            ]
          )
        )
      );
      parts.push(
        section(
          `${SCENARIO_LABELS[key]} Scenario — Statement of Changes in Equity`,
          table(
            ["Item", ...yearHeaders],
            [
              [`Beginning ${capitalLabel}`, ...out.sce.map((r) => formatPHP(r.beginningCapital))],
              ["Contributions", ...out.sce.map((r) => formatPHP(r.contributions))],
              ["Net Income", ...out.sce.map((r) => formatPHP(r.netIncome))],
              ["Distributions", ...out.sce.map((r) => formatPHP(r.distributions))],
              [`Ending ${capitalLabel}`, ...out.sce.map((r) => formatPHP(r.endingCapital))],
            ]
          )
        )
      );
    }

    return parts.join("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">MSME {horizonYears}-Year Financial Plan</h1>
          <p className="text-muted-foreground mt-1">
            Build a realistic {horizonYears}-year financial plan with conservative, base, and optimistic scenarios. Designed for MSMEs and cooperatives.
          </p>
          <LearnLink toolHref="/tools/msme-financial-plan" />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} title="Reset to defaults">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <ExportPDFButton filename="MSME Financial Plan" enableEmailCapture buildPrintContent={buildPdfContent} />
        </div>
      </div>

      {/* Entity & Horizon */}
      <Card>
        <CardHeader>
          <CardTitle>Entity & Horizon</CardTitle>
          <CardDescription>What kind of business is this and how far are we projecting?</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>
              Entity Type
              <InfoTooltip content="Choose the legal form of your business. The capital and distribution labels in the statements adapt accordingly." />
            </Label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sole-prop">Sole Proprietorship</SelectItem>
                <SelectItem value="cooperative">Cooperative</SelectItem>
                <SelectItem value="corporation">Corporation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CurrencyInput
            label={capitalLabel}
            value={startingCapital}
            onChange={setStartingCapital}
          />
          <div className="space-y-2">
            <Label>
              Planning Horizon
              <InfoTooltip content="How many years to project. 5 years is the DTI-recommended planning horizon for MSME growth plans." />
            </Label>
            <Select value={String(horizonYears)} onValueChange={(v) => setHorizonYears(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 years</SelectItem>
                <SelectItem value="5">5 years</SelectItem>
                <SelectItem value="7">7 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>How will your business earn money? Pick the model that matches how you sell.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={revenueModel} onValueChange={(v) => setRevenueModel(v as RevenueModel)}>
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="lump-sum">Annual Revenue</TabsTrigger>
              <TabsTrigger value="units-x-price">Units × Price</TabsTrigger>
            </TabsList>
            <TabsContent value="lump-sum">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CurrencyInput
                  label="Starting Annual Revenue"
                  value={startingAnnualRevenue}
                  onChange={setStartingAnnualRevenue}
                />
                <PercentageInput
                  label="Annual Growth Rate"
                  value={annualGrowthRate}
                  onChange={setAnnualGrowthRate}
                  max={100}
                />
              </div>
            </TabsContent>
            <TabsContent value="units-x-price">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Starting Units (per year)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={startingUnits}
                    onChange={(e) => setStartingUnits(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <CurrencyInput label="Unit Price" value={unitPrice} onChange={setUnitPrice} />
                <PercentageInput
                  label="Unit Growth Rate (per year)"
                  value={unitGrowthRate}
                  onChange={setUnitGrowthRate}
                  max={100}
                />
                <PercentageInput
                  label="Price Growth Rate (per year)"
                  value={priceGrowthRate}
                  onChange={setPriceGrowthRate}
                  max={50}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Costs</CardTitle>
          <CardDescription>What does it cost to make and run your business?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PercentageInput
            label="Cost of Goods Sold (% of revenue)"
            value={cogsPercent}
            onChange={setCogsPercent}
            max={100}
          />
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Operating Expenses (annual)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyInput label="Rent" value={opexRent} onChange={setOpexRent} />
              <CurrencyInput label="Utilities" value={opexUtilities} onChange={setOpexUtilities} />
              <CurrencyInput label="Salaries & Wages" value={opexSalaries} onChange={setOpexSalaries} />
              <CurrencyInput label="Marketing" value={opexMarketing} onChange={setOpexMarketing} />
              <CurrencyInput label="Transportation" value={opexTransportation} onChange={setOpexTransportation} />
              <CurrencyInput label="Supplies" value={opexSupplies} onChange={setOpexSupplies} />
              <CurrencyInput label="Insurance" value={opexInsurance} onChange={setOpexInsurance} />
              <CurrencyInput label="Other" value={opexOther} onChange={setOpexOther} />
            </div>
          </div>
          <PercentageInput
            label="Annual OpEx Growth (inflation)"
            value={opexAnnualGrowth}
            onChange={setOpexAnnualGrowth}
            max={50}
          />
        </CardContent>
      </Card>

      {/* Working Capital */}
      <Card>
        <CardHeader>
          <CardTitle>Working Capital</CardTitle>
          <CardDescription>How fast does cash move through your business?</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>
              Days to Collect (from customers)
              <InfoTooltip content="Average days before customers pay you after a sale. 30 = paid within a month. Higher = cash tied up in receivables." />
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={180}
                value={daysToCollect}
                onChange={(e) => setDaysToCollect(parseInt(e.target.value) || 0)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">days</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              Days to Pay (suppliers)
              <InfoTooltip content="Average days before you pay suppliers. Higher days = you keep more cash on hand longer." />
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={180}
                value={daysToPay}
                onChange={(e) => setDaysToPay(parseInt(e.target.value) || 0)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">days</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              Inventory Days
              <InfoTooltip content="Average days inventory sits before being sold. 0 if you don't hold inventory (services)." />
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={365}
                value={inventoryDays}
                onChange={(e) => setInventoryDays(parseInt(e.target.value) || 0)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">days</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CapEx */}
      <Card>
        <CardHeader>
          <CardTitle>Capital Expenditures</CardTitle>
          <CardDescription>Equipment, machines, leasehold improvements — when will you invest?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: horizonYears }, (_, i) => (
              <CurrencyInput
                key={i}
                label={`Year ${i + 1} Investment`}
                value={capExSchedule[i] ?? 0}
                onChange={(v) => setCapExYear(i, v)}
              />
            ))}
          </div>
          <div className="space-y-2 max-w-xs">
            <Label>
              Useful Life (years)
              <InfoTooltip content="How many years assets are depreciated over. Equipment typically 5-10 years, leasehold improvements 3-5 years." />
            </Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={usefulLifeYears}
              onChange={(e) => setUsefulLifeYears(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loan / Financing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Bank Loan / Financing
            <Switch checked={loanEnabled} onCheckedChange={setLoanEnabled} />
          </CardTitle>
          <CardDescription>
            {loanEnabled
              ? "Loan proceeds appear in Year 0 cash. Interest expense flows through P&L; principal payment flows through Cash Flow."
              : "Toggle on to add a bank loan to your plan."}
          </CardDescription>
        </CardHeader>
        {loanEnabled && (
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CurrencyInput label="Loan Principal" value={loanPrincipal} onChange={setLoanPrincipal} />
            <PercentageInput
              label="Annual Interest Rate"
              value={loanInterestRate}
              onChange={setLoanInterestRate}
              max={50}
            />
            <div className="space-y-2">
              <Label>Term (years)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={loanTermYears}
                onChange={(e) => setLoanTermYears(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Grace Period (years)
                <InfoTooltip content="Years before principal payments begin. Interest accrues during grace. Common in DTI / DA loan programs." />
              </Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={loanGracePeriodYears}
                onChange={(e) => setLoanGracePeriodYears(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tax & Distributions */}
      <Card>
        <CardHeader>
          <CardTitle>Tax & {distLabel}</CardTitle>
          <CardDescription>How much of profits are taxed and how much is distributed to {entityType === "cooperative" ? "members" : entityType === "sole-prop" ? "the owner" : "shareholders"}?</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PercentageInput
            label="Tax Rate"
            value={taxRate}
            onChange={setTaxRate}
            max={50}
          />
          <PercentageInput
            label={`${distLabel} % of Net Income`}
            value={distributionPercent}
            onChange={setDistributionPercent}
            max={100}
          />
        </CardContent>
      </Card>

      {/* Scenario Strip */}
      <Card>
        <CardHeader>
          <CardTitle>
            Scenarios
            <InfoTooltip content="Click a scenario to view its detailed statements below. PDF export includes all three." />
          </CardTitle>
          <CardDescription>
            Three projections from the same assumptions. Conservative trims growth and adds cost pressure; Optimistic does the opposite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SCENARIO_KEYS.map((key) => (
              <ScenarioCard
                key={key}
                scenarioKey={key}
                output={result.scenarios[key]}
                active={activeScenario === key}
                onClick={() => setActiveScenario(key)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultCard
          label={`${horizonYears}-Year Revenue`}
          value={formatPHP(active.summary.horizonRevenue)}
          sublabel={`Total ${SCENARIO_LABELS[activeScenario]} scenario`}
        />
        <ResultCard
          label="Avg Gross Margin"
          value={`${active.summary.avgGrossMargin.toFixed(1)}%`}
          sublabel="Average across the plan"
          variant={active.summary.avgGrossMargin >= 50 ? "success" : active.summary.avgGrossMargin >= 30 ? "warning" : "danger"}
        />
        <ResultCard
          label={`Year ${horizonYears} EBIT`}
          value={formatPHP(active.summary.finalYearEbit)}
          sublabel="Operating profit"
          variant={active.summary.finalYearEbit > 0 ? "success" : "danger"}
        />
        <ResultCard
          label={`Year ${horizonYears} Cash`}
          value={formatPHP(active.summary.finalYearCash)}
          sublabel={active.summary.breakEvenYear ? `Break-even Year ${active.summary.breakEvenYear}` : "Did not break even"}
          variant={active.summary.finalYearCash > 0 ? "success" : "danger"}
        />
      </div>

      {/* Statement Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="pnl">
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
              <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
              <TabsTrigger value="cf">Cash Flow</TabsTrigger>
              <TabsTrigger value="sce">Changes in Equity</TabsTrigger>
            </TabsList>

            <TabsContent value="pnl" className="space-y-4">
              <PLTable annual={active.annual} distLabel={distLabel} />
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={plChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={tickFormatter} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Bar dataKey="Gross Profit" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Line type="monotone" dataKey="Net Income" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 5, fill: "#f59e0b" }} />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center">
                Revenue and Gross Profit (bars). Net Income trajectory (line).
              </p>
            </TabsContent>

            <TabsContent value="bs" className="space-y-4">
              <BSTable annual={active.annual} seed={active.seed} capitalLabel={capitalLabel} />
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={bsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={tickFormatter} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Cash" stackId="assets" fill="#3b82f6" opacity={0.85} />
                  <Bar dataKey="AR" stackId="assets" fill="#22c55e" opacity={0.85} />
                  <Bar dataKey="Inventory" stackId="assets" fill="#f59e0b" opacity={0.85} />
                  <Bar dataKey="Net PP&E" stackId="assets" fill="#8b5cf6" opacity={0.85} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center">
                Stacked bar shows asset composition over the plan.
              </p>
            </TabsContent>

            <TabsContent value="cf" className="space-y-4">
              <CFTable annual={active.annual} distLabel={distLabel} />
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={cfChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={tickFormatter} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Operating" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Bar dataKey="Investing" fill="#ef4444" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Bar dataKey="Financing" fill="#8b5cf6" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Bar dataKey="Net CF" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center">
                Cash flow by activity: Operating (green), Investing (red), Financing (purple), and Net (blue).
              </p>
            </TabsContent>

            <TabsContent value="sce" className="space-y-4">
              <SCETable sce={active.sce} capitalLabel={capitalLabel} />
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={sceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={tickFormatter} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Net Income" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Bar dataKey="Distributions" fill="#ef4444" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Bar dataKey="Ending Capital" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center">
                Net income added (green) minus distributions (red) compounds into ending capital (blue).
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
            entityType,
            horizonYears,
            startingCapital,
            loanEnabled,
            loanPrincipal: loanEnabled ? loanPrincipal : 0,
            activeScenario,
            horizonRevenue: active.summary.horizonRevenue,
            avgGrossMargin: active.summary.avgGrossMargin.toFixed(1),
            finalYearNetIncome: active.summary.finalYearNetIncome,
            finalYearCash: active.summary.finalYearCash,
            breakEvenYear: active.summary.breakEvenYear ?? "not within horizon",
            cumulativeNetIncome: active.summary.cumulativeNetIncome,
            conservativeFinalCash: result.scenarios.conservative.summary.finalYearCash,
            optimisticFinalCash: result.scenarios.optimistic.summary.finalYearCash,
          })
        }
        onDismiss={ai.reset}
      />

      <EcosystemBanner toolId="msme-financial-plan" />

      <RelatedTools currentToolId="msme-financial-plan" />
    </div>
  );
}

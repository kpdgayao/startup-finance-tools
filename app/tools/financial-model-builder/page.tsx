"use client";

import { useState, useMemo } from "react";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { EcosystemBanner } from "@/components/shared/ecosystem-banner";
import {
  buildFinancialModel,
  exportFinancialModelCSV,
} from "@/lib/calculations/financial-model";
import { FinancialModelActions } from "./components/financial-model-actions";
import { FinancialModelInputs } from "./components/financial-model-inputs";
import { FinancialModelResults } from "./components/financial-model-results";

export default function FinancialModelBuilderPage() {
  // Revenue
  const [startingRevenue, setStartingRevenue] = useState(200_000);
  const [monthlyGrowthRate, setMonthlyGrowthRate] = useState(8);
  // Costs
  const [cogsPercent, setCogsPercent] = useState(25);
  const [fixedOpEx, setFixedOpEx] = useState(500_000);
  const [variableOpExPercent, setVariableOpExPercent] = useState(10);
  // Balance Sheet
  const [startingCash, setStartingCash] = useState(5_000_000);
  const [dso, setDso] = useState(30);
  const [dpo, setDpo] = useState(15);
  const [taxRate, setTaxRate] = useState(25);
  const [annualCapEx, setAnnualCapEx] = useState(500_000);
  const [depreciationYears, setDepreciationYears] = useState(5);

  const inputs = useMemo(
    () => ({
      startingRevenue,
      monthlyGrowthRate,
      cogsPercent,
      fixedOpEx,
      variableOpExPercent,
      startingCash,
      dso,
      dpo,
      taxRate,
      annualCapEx,
      depreciationYears,
    }),
    [
      startingRevenue,
      monthlyGrowthRate,
      cogsPercent,
      fixedOpEx,
      variableOpExPercent,
      startingCash,
      dso,
      dpo,
      taxRate,
      annualCapEx,
      depreciationYears,
    ]
  );

  const { annual, seed, summary } = useMemo(
    () => buildFinancialModel(inputs),
    [inputs]
  );

  const ai = useAiExplain("financial-model-builder");

  const handleReset = () => {
    setStartingRevenue(200_000);
    setMonthlyGrowthRate(8);
    setCogsPercent(25);
    setFixedOpEx(500_000);
    setVariableOpExPercent(10);
    setStartingCash(5_000_000);
    setDso(30);
    setDpo(15);
    setTaxRate(25);
    setAnnualCapEx(500_000);
    setDepreciationYears(5);
  };

  const handleExportCSV = () => {
    const csv = exportFinancialModelCSV(annual, seed);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "financial-model.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart data
  const plChartData = useMemo(() => annual.map((a) => ({
    name: `Year ${a.year}`,
    Revenue: a.revenue,
    "Gross Profit": a.grossProfit,
    "Net Income": a.netIncome,
  })), [annual]);

  const bsChartData = useMemo(() => [
    {
      name: "Year 0",
      Cash: seed.cash,
      "Accounts Receivable": seed.accountsReceivable,
      "Net PP&E": seed.netPPE,
    },
    ...annual.map((a) => ({
      name: `Year ${a.year}`,
      Cash: a.cash,
      "Accounts Receivable": a.accountsReceivable,
      "Net PP&E": a.netPPE,
    })),
  ], [annual, seed]);

  const cfChartData = useMemo(() => annual.map((a) => ({
    name: `Year ${a.year}`,
    "Operating CF": a.operatingCF,
    "CapEx": a.investingCF,
    "Net CF": a.netCashFlow,
  })), [annual]);

  return (
    <div className="space-y-6">
      <FinancialModelActions
        onReset={handleReset}
        onExportCSV={handleExportCSV}
        startingRevenue={startingRevenue}
        monthlyGrowthRate={monthlyGrowthRate}
        cogsPercent={cogsPercent}
        fixedOpEx={fixedOpEx}
        variableOpExPercent={variableOpExPercent}
        startingCash={startingCash}
        dso={dso}
        dpo={dpo}
        taxRate={taxRate}
        annualCapEx={annualCapEx}
        depreciationYears={depreciationYears}
        annual={annual}
        seed={seed}
        summary={summary}
      />

      <FinancialModelInputs
        startingRevenue={startingRevenue}
        setStartingRevenue={setStartingRevenue}
        monthlyGrowthRate={monthlyGrowthRate}
        setMonthlyGrowthRate={setMonthlyGrowthRate}
        cogsPercent={cogsPercent}
        setCogsPercent={setCogsPercent}
        fixedOpEx={fixedOpEx}
        setFixedOpEx={setFixedOpEx}
        variableOpExPercent={variableOpExPercent}
        setVariableOpExPercent={setVariableOpExPercent}
        startingCash={startingCash}
        setStartingCash={setStartingCash}
        dso={dso}
        setDso={setDso}
        dpo={dpo}
        setDpo={setDpo}
        taxRate={taxRate}
        setTaxRate={setTaxRate}
        annualCapEx={annualCapEx}
        setAnnualCapEx={setAnnualCapEx}
        depreciationYears={depreciationYears}
        setDepreciationYears={setDepreciationYears}
      />

      <FinancialModelResults
        summary={summary}
        annual={annual}
        seed={seed}
        plChartData={plChartData}
        bsChartData={bsChartData}
        cfChartData={cfChartData}
      />

      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        onExplain={() =>
          ai.explain({
            startingRevenue,
            monthlyGrowthRate,
            cogsPercent,
            fixedOpEx,
            variableOpExPercent,
            startingCash,
            dso,
            dpo,
            taxRate,
            annualCapEx,
            depreciationYears,
            threeYearRevenue: summary.threeYearRevenue,
            avgGrossMargin: summary.avgGrossMargin.toFixed(1),
            year1NetIncome: annual[0].netIncome,
            year2NetIncome: annual[1].netIncome,
            year3NetIncome: annual[2].netIncome,
            year3Ebitda: summary.year3Ebitda,
            year3Cash: annual[2].cash,
            year1OperatingCF: annual[0].operatingCF,
            year3OperatingCF: annual[2].operatingCF,
          })
        }
        onDismiss={ai.reset}
      />

      <EcosystemBanner toolId="financial-model-builder" />

      <RelatedTools currentToolId="financial-model-builder" />
    </div>
  );
}
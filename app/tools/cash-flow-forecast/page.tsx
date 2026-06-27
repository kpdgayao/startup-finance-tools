"use client";

import { useState, useMemo } from "react";
import { useAiExplain } from "@/lib/ai/use-ai-explain";
import { AiInsightsPanel } from "@/components/shared/ai-insights-panel";
import { RelatedTools } from "@/components/shared/related-tools";
import { validateFinancialAmount, validatePercentage, sanitizeFinancialAmount, sanitizePercentage } from "@/lib/validation";
import {
  projectMonthlyCashFlow,
  calculateSummary,
  exportToCSV,
  type CashFlowInputs,
} from "@/lib/calculations/cash-flow";
import { CashFlowActions } from "./components/cash-flow-actions";
import { CashFlowInputs as CashFlowInputsForm } from "./components/cash-flow-inputs";
import { CashFlowSummaryCards } from "./components/cash-flow-summary-cards";
import { CashFlowCharts } from "./components/cash-flow-charts";
import { CashFlowProjectionTable } from "./components/cash-flow-projection-table";

export default function CashFlowForecastPage() {
  const [startingBalance, setStartingBalance] = useState(3000000);
  const [mrr, setMrr] = useState(500000);
  const [fixedCosts, setFixedCosts] = useState(400000);
  const [variableCostPercent, setVariableCostPercent] = useState(20);
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [payableTerms, setPayableTerms] = useState(15);
  const [oneTimeIncome, setOneTimeIncome] = useState<number[]>(Array(12).fill(0));

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const startingBalanceError = touched.startingBalance ? validateFinancialAmount(startingBalance).error : undefined;
  const mrrError = touched.mrr ? validateFinancialAmount(mrr).error : undefined;
  const fixedCostsError = touched.fixedCosts ? validateFinancialAmount(fixedCosts).error : undefined;
  const variableCostPercentError = touched.variableCostPercent ? validatePercentage(variableCostPercent).error : undefined;

  const hasErrors = !!(startingBalanceError || mrrError || fixedCostsError || variableCostPercentError);

  const safeStartingBalance = sanitizeFinancialAmount(startingBalance);
  const safeMrr = sanitizeFinancialAmount(mrr);
  const safeFixedCosts = sanitizeFinancialAmount(fixedCosts);
  const safeVariableCostPercent = sanitizePercentage(variableCostPercent);

  const inputs: CashFlowInputs = useMemo(() => ({
    monthlyRecurringRevenue: safeMrr,
    monthlyOneTimeIncome: oneTimeIncome,
    fixedCosts: safeFixedCosts,
    variableCostPercent: safeVariableCostPercent,
    paymentTermsDays: paymentTerms,
    payableTermsDays: payableTerms,
  }), [safeMrr, oneTimeIncome, safeFixedCosts, safeVariableCostPercent, paymentTerms, payableTerms]);

  const projections = useMemo(
    () => projectMonthlyCashFlow(inputs, safeStartingBalance),
    [inputs, safeStartingBalance]
  );

  const stats = useMemo(
    () => calculateSummary(projections, safeStartingBalance, paymentTerms, payableTerms),
    [projections, safeStartingBalance, paymentTerms, payableTerms]
  );

  // Overview chart: inflow and outflow as POSITIVE bars side by side + balance line
  const overviewChartData = useMemo(() => [
    { month: "Start", "Cash Inflow": 0, "Cash Outflow": 0, "Cash Balance": safeStartingBalance },
    ...projections.map((p) => ({
      month: p.monthLabel,
      "Cash Inflow": p.cashInflow,
      "Cash Outflow": p.cashOutflow,
      "Cash Balance": p.closingBalance,
    })),
  ], [projections, safeStartingBalance]);

  // Net flow chart data
  const netFlowChartData = useMemo(() => projections.map((p) => ({
    month: p.monthLabel,
    "Net Cash Flow": p.netCashFlow,
    isPositive: p.netCashFlow >= 0,
  })), [projections]);

  // Balance chart includes Month 0 (starting balance)
  const balanceChartData = useMemo(() => [
    { month: "Start", Balance: safeStartingBalance },
    ...projections.map((p) => ({ month: p.monthLabel, Balance: p.closingBalance })),
  ], [projections, safeStartingBalance]);

  // Breakdown chart — clearly labeled as accrual basis
  const breakdownChartData = useMemo(() => projections.map((p) => ({
    month: p.monthLabel,
    "Fixed Costs": p.fixedCosts,
    "Variable Costs": p.variableCosts,
    "Revenue (Accrual)": p.revenue,
  })), [projections]);

  const handleReset = () => {
    setStartingBalance(3000000);
    setMrr(500000);
    setFixedCosts(400000);
    setVariableCostPercent(20);
    setPaymentTerms(30);
    setPayableTerms(15);
    setOneTimeIncome(Array(12).fill(0));
    setTouched({});
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(projections);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cash-flow-forecast.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const ai = useAiExplain("cash-flow-forecast");

  const hasWorkingCapitalImpact = stats.workingCapitalImpact > 0;

  const monthLabels = projections.map((p) => p.monthLabel);

  return (
    <div className="space-y-6">
      <CashFlowActions
        onReset={handleReset}
        onExportCSV={handleExportCSV}
        startingBalance={startingBalance}
        mrr={mrr}
        fixedCosts={fixedCosts}
        variableCostPercent={variableCostPercent}
        paymentTerms={paymentTerms}
        payableTerms={payableTerms}
        projections={projections}
        stats={stats}
      />

      <CashFlowInputsForm
        startingBalance={startingBalance}
        setStartingBalance={setStartingBalance}
        mrr={mrr}
        setMrr={setMrr}
        fixedCosts={fixedCosts}
        setFixedCosts={setFixedCosts}
        variableCostPercent={variableCostPercent}
        setVariableCostPercent={setVariableCostPercent}
        paymentTerms={paymentTerms}
        setPaymentTerms={setPaymentTerms}
        payableTerms={payableTerms}
        setPayableTerms={setPayableTerms}
        oneTimeIncome={oneTimeIncome}
        setOneTimeIncome={setOneTimeIncome}
        monthLabels={monthLabels}
        errors={{
          startingBalance: startingBalanceError,
          mrr: mrrError,
          fixedCosts: fixedCostsError,
          variableCostPercent: variableCostPercentError,
        }}
        onBlur={markTouched}
      />

      <CashFlowSummaryCards
        stats={stats}
        startingBalance={startingBalance}
        paymentTerms={paymentTerms}
        payableTerms={payableTerms}
        hasWorkingCapitalImpact={hasWorkingCapitalImpact}
      />

      <CashFlowCharts
        overviewChartData={overviewChartData}
        netFlowChartData={netFlowChartData}
        balanceChartData={balanceChartData}
        breakdownChartData={breakdownChartData}
        peakBalance={stats.peakBalance}
        lowestBalance={stats.lowestBalance}
      />

      <CashFlowProjectionTable
        projections={projections}
        stats={stats}
      />

      <AiInsightsPanel
        explanation={ai.explanation}
        isLoading={ai.isLoading}
        error={ai.error}
        disabled={hasErrors}
        onExplain={() =>
          ai.explain({
            startingBalance: safeStartingBalance,
            monthlyRecurringRevenue: safeMrr,
            fixedCosts: safeFixedCosts,
            variableCostPercent: safeVariableCostPercent,
            paymentTermsDSO: paymentTerms,
            payableTermsDPO: payableTerms,
            totalInflow: stats.totalInflow,
            totalOutflow: stats.totalOutflow,
            finalBalance: stats.finalBalance,
            negativeMonths: stats.negativeMonths,
            avgNetFlow: stats.avgNetFlow,
            cashConversionCycle: stats.cashConversionCycle,
            peakBalance: stats.peakBalance,
            lowestBalance: stats.lowestBalance,
          })
        }
        onDismiss={ai.reset}
      />

      <RelatedTools currentToolId="cash-flow-forecast" />
    </div>
  );
}
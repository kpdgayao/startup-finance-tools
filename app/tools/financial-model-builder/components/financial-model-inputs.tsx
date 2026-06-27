"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { InfoTooltip } from "@/components/shared/info-tooltip";

interface FinancialModelInputsProps {
  startingRevenue: number;
  setStartingRevenue: (value: number) => void;
  monthlyGrowthRate: number;
  setMonthlyGrowthRate: (value: number) => void;
  cogsPercent: number;
  setCogsPercent: (value: number) => void;
  fixedOpEx: number;
  setFixedOpEx: (value: number) => void;
  variableOpExPercent: number;
  setVariableOpExPercent: (value: number) => void;
  startingCash: number;
  setStartingCash: (value: number) => void;
  dso: number;
  setDso: (value: number) => void;
  dpo: number;
  setDpo: (value: number) => void;
  taxRate: number;
  setTaxRate: (value: number) => void;
  annualCapEx: number;
  setAnnualCapEx: (value: number) => void;
  depreciationYears: number;
  setDepreciationYears: (value: number) => void;
}

export function FinancialModelInputs({
  startingRevenue,
  setStartingRevenue,
  monthlyGrowthRate,
  setMonthlyGrowthRate,
  cogsPercent,
  setCogsPercent,
  fixedOpEx,
  setFixedOpEx,
  variableOpExPercent,
  setVariableOpExPercent,
  startingCash,
  setStartingCash,
  dso,
  setDso,
  dpo,
  setDpo,
  taxRate,
  setTaxRate,
  annualCapEx,
  setAnnualCapEx,
  depreciationYears,
  setDepreciationYears,
}: FinancialModelInputsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Assumptions
          <InfoTooltip content="Enter your startup's financial assumptions. The model calculates 36 months internally and displays annual summaries." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Revenue */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Revenue
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Starting Monthly Revenue"
              value={startingRevenue}
              onChange={setStartingRevenue}
            />
            <PercentageInput
              label="Monthly Growth Rate"
              value={monthlyGrowthRate}
              onChange={setMonthlyGrowthRate}
              max={50}
            />
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Costs */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Costs
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PercentageInput
              label="COGS %"
              value={cogsPercent}
              onChange={setCogsPercent}
            />
            <CurrencyInput
              label="Fixed OpEx (monthly)"
              value={fixedOpEx}
              onChange={setFixedOpEx}
            />
            <PercentageInput
              label="Variable OpEx %"
              value={variableOpExPercent}
              onChange={setVariableOpExPercent}
            />
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Balance Sheet */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Balance Sheet & Capital
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CurrencyInput
              label="Starting Cash"
              value={startingCash}
              onChange={setStartingCash}
            />
            <div className="space-y-2">
              <Label>
                DSO (Days Sales Outstanding)
                <InfoTooltip content="Average days to collect payment from customers. DSO=30 means ~1 month delay." />
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={dso}
                  onChange={(e) => setDso(parseInt(e.target.value) || 0)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  days
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                DPO (Days Payable Outstanding)
                <InfoTooltip content="Average days before you pay suppliers. Higher DPO preserves cash." />
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={dpo}
                  onChange={(e) => setDpo(parseInt(e.target.value) || 0)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  days
                </span>
              </div>
            </div>
            <PercentageInput
              label="Tax Rate"
              value={taxRate}
              onChange={setTaxRate}
              max={50}
            />
            <CurrencyInput
              label="Annual CapEx"
              value={annualCapEx}
              onChange={setAnnualCapEx}
            />
            <div className="space-y-2">
              <Label>
                Depreciation (years)
                <InfoTooltip content="Useful life of assets for straight-line depreciation." />
              </Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={depreciationYears}
                onChange={(e) =>
                  setDepreciationYears(
                    Math.max(1, parseInt(e.target.value) || 1)
                  )
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
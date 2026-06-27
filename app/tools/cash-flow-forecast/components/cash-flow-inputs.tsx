"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { InfoTooltip } from "@/components/shared/info-tooltip";

interface CashFlowInputsProps {
  startingBalance: number;
  setStartingBalance: (value: number) => void;
  mrr: number;
  setMrr: (value: number) => void;
  fixedCosts: number;
  setFixedCosts: (value: number) => void;
  variableCostPercent: number;
  setVariableCostPercent: (value: number) => void;
  paymentTerms: number;
  setPaymentTerms: (value: number) => void;
  payableTerms: number;
  setPayableTerms: (value: number) => void;
  oneTimeIncome: number[];
  setOneTimeIncome: (value: number[]) => void;
  monthLabels: string[];
  errors?: Record<string, string | undefined>;
  onBlur?: (field: string) => void;
}

export function CashFlowInputs({
  startingBalance,
  setStartingBalance,
  mrr,
  setMrr,
  fixedCosts,
  setFixedCosts,
  variableCostPercent,
  setVariableCostPercent,
  paymentTerms,
  setPaymentTerms,
  payableTerms,
  setPayableTerms,
  oneTimeIncome,
  setOneTimeIncome,
  monthLabels,
  errors = {},
  onBlur,
}: CashFlowInputsProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Revenue & Cost Inputs
            <InfoTooltip content="DSO (Days Sales Outstanding) = average days to collect payment from customers. DPO (Days Payable Outstanding) = average days before you pay suppliers. Higher DSO means slower cash collection; higher DPO means you hold cash longer." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CurrencyInput label="Starting Cash Balance" value={startingBalance} onChange={setStartingBalance} onBlur={() => onBlur?.("startingBalance")} error={errors.startingBalance} />
            <CurrencyInput label="Monthly Recurring Revenue" value={mrr} onChange={setMrr} onBlur={() => onBlur?.("mrr")} error={errors.mrr} />
            <CurrencyInput label="Fixed Costs (monthly)" value={fixedCosts} onChange={setFixedCosts} onBlur={() => onBlur?.("fixedCosts")} error={errors.fixedCosts} />
            <PercentageInput label="Variable Cost (% of revenue)" value={variableCostPercent} onChange={setVariableCostPercent} onBlur={() => onBlur?.("variableCostPercent")} error={errors.variableCostPercent} />
            <div className="space-y-2">
              <Label>
                Payment Terms (DSO)
                <InfoTooltip content="Days Sales Outstanding — average days to collect payment from customers. DSO=0 means immediate collection. DSO=30 means ~1 month delay. DSO=60 means ~2 month delay." />
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(parseInt(e.target.value) || 0)}
                  onBlur={() => onBlur?.("paymentTerms")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">days</span>
              </div>
              {errors.paymentTerms && <p className="text-xs text-red-500 mt-1">{errors.paymentTerms}</p>}
            </div>
            <div className="space-y-2">
              <Label>
                Payable Terms (DPO)
                <InfoTooltip content="Days Payable Outstanding — average days before you pay your suppliers. DPO=0 means you pay immediately. DPO=30 means you hold cash ~1 month before paying." />
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={payableTerms}
                  onChange={(e) => setPayableTerms(parseInt(e.target.value) || 0)}
                  onBlur={() => onBlur?.("payableTerms")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">days</span>
              </div>
              {errors.payableTerms && <p className="text-xs text-red-500 mt-1">{errors.payableTerms}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* One-Time Income */}
      <Card>
        <CardHeader>
          <CardTitle>One-Time Income by Month</CardTitle>
          <CardDescription>Add any one-time income (grants, contract payments, etc.) per month. Subject to same DSO collection delay.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {oneTimeIncome.map((val, i) => (
              <div key={i} className="space-y-1">
                <Label className="text-xs">{monthLabels[i] || `M${i + 1}`}</Label>
                <Input
                  type="number"
                  min={0}
                  className="text-sm"
                  value={val || ""}
                  onChange={(e) => {
                    const next = [...oneTimeIncome];
                    next[i] = parseFloat(e.target.value) || 0;
                    setOneTimeIncome(next);
                  }}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
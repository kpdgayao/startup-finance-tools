"use client";

import { Fragment } from "react";
import { formatPHP } from "@/lib/utils";
import type { AnnualRow, BalanceSheetSeed } from "@/lib/calculations/financial-model";

export function PLTable({ annual }: { annual: AnnualRow[] }) {
  const rows = [
    { label: "Revenue", key: "revenue" as const, bold: false },
    { label: "COGS", key: "cogs" as const, bold: false },
    { label: "Gross Profit", key: "grossProfit" as const, bold: true },
    { label: "Fixed OpEx", key: "fixedOpEx" as const, bold: false },
    { label: "Variable OpEx", key: "variableOpEx" as const, bold: false },
    { label: "Total OpEx", key: "totalOpEx" as const, bold: false },
    { label: "EBITDA", key: "ebitda" as const, bold: true },
    { label: "Depreciation", key: "depreciation" as const, bold: false },
    { label: "EBIT", key: "ebit" as const, bold: true },
    { label: "Tax", key: "tax" as const, bold: false },
    { label: "Net Income", key: "netIncome" as const, bold: true },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">
              P&L Item
            </th>
            {annual.map((a) => (
              <th
                key={a.year}
                className="text-right py-3 px-2 font-medium text-muted-foreground"
              >
                Year {a.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={`border-b border-border/50 ${row.bold ? "bg-muted/20" : ""}`}
            >
              <td
                className={`py-2.5 px-2 ${row.bold ? "font-semibold" : ""}`}
              >
                {row.label}
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
          <tr className="border-b border-border/50">
            <td className="py-2.5 px-2 text-muted-foreground italic">
              Gross Margin %
            </td>
            {annual.map((a) => (
              <td
                key={a.year}
                className="py-2.5 px-2 text-right font-mono text-muted-foreground"
              >
                {a.grossMarginPercent.toFixed(1)}%
              </td>
            ))}
          </tr>
          <tr>
            <td className="py-2.5 px-2 text-muted-foreground italic">
              Net Margin %
            </td>
            {annual.map((a) => (
              <td
                key={a.year}
                className={`py-2.5 px-2 text-right font-mono ${a.netMarginPercent < 0 ? "text-red-400" : "text-muted-foreground"}`}
              >
                {a.netMarginPercent.toFixed(1)}%
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function BSTable({
  annual,
  seed,
}: {
  annual: AnnualRow[];
  seed: BalanceSheetSeed;
}) {
  type BSKey = keyof BalanceSheetSeed;
  const sections: {
    heading: string;
    rows: { label: string; key: BSKey; bold?: boolean }[];
  }[] = [
    {
      heading: "Assets",
      rows: [
        { label: "Cash", key: "cash" },
        { label: "Accounts Receivable", key: "accountsReceivable" },
        { label: "Net PP&E", key: "netPPE" },
        { label: "Total Assets", key: "totalAssets", bold: true },
      ],
    },
    {
      heading: "Liabilities",
      rows: [
        { label: "Accounts Payable", key: "accountsPayable" },
        { label: "Total Liabilities", key: "totalLiabilities", bold: true },
      ],
    },
    {
      heading: "Equity",
      rows: [
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
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">
              Balance Sheet
            </th>
            <th className="text-right py-3 px-2 font-medium text-muted-foreground">
              Year 0
            </th>
            {annual.map((a) => (
              <th
                key={a.year}
                className="text-right py-3 px-2 font-medium text-muted-foreground"
              >
                Year {a.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.heading}>
              <tr>
                <td
                  colSpan={5}
                  className="pt-3 pb-1 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {section.heading}
                </td>
              </tr>
              {section.rows.map((row) => (
                <tr
                  key={row.key}
                  className={`border-b border-border/50 ${row.bold ? "bg-muted/20" : ""}`}
                >
                  <td
                    className={`py-2.5 px-2 ${row.bold ? "font-semibold" : ""}`}
                  >
                    {row.label}
                  </td>
                  <td
                    className={`py-2.5 px-2 text-right font-mono ${row.bold ? "font-semibold" : ""}`}
                  >
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

export function CFTable({ annual }: { annual: AnnualRow[] }) {
  const rows: { label: string; key: keyof AnnualRow; bold?: boolean }[] = [
    { label: "Operating Cash Flow", key: "operatingCF", bold: true },
    { label: "Investing Cash Flow (CapEx)", key: "investingCF" },
    { label: "Net Cash Flow", key: "netCashFlow", bold: true },
    { label: "Ending Cash", key: "cash", bold: true },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-muted-foreground">
              Cash Flow
            </th>
            {annual.map((a) => (
              <th
                key={a.year}
                className="text-right py-3 px-2 font-medium text-muted-foreground"
              >
                Year {a.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={`border-b border-border/50 ${row.bold ? "bg-muted/20" : ""}`}
            >
              <td
                className={`py-2.5 px-2 ${row.bold ? "font-semibold" : ""}`}
              >
                {row.label}
              </td>
              {annual.map((a) => {
                const val = a[row.key] as number;
                return (
                  <td
                    key={a.year}
                    className={`py-2.5 px-2 text-right font-mono ${row.bold ? "font-semibold" : ""} ${val < 0 ? "text-red-400" : ""}`}
                  >
                    {formatPHP(val)}
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

export function CustomTooltip({
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
        <div
          key={i}
          className="flex items-center justify-between gap-4 text-sm"
        >
          <span className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-mono font-medium">
            {formatPHP(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
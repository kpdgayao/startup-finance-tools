"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/currency-input";
import { PercentageInput } from "@/components/shared/percentage-input";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatPHP, formatPercent } from "@/lib/utils";
import {
  simulateCapTable,
  type Founder,
  type FundingRound,
} from "@/lib/calculations/equity";
import { CHART_COLORS } from "@/lib/constants";
import { Trash2, Plus, UserPlus } from "lucide-react";
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

let nextFounderId = 3;
let nextRoundId = 1;

export default function EquitySimulatorPage() {
  const [founders, setFounders] = useState<Founder[]>([
    { id: "f1", name: "Founder A", equity: 50 },
    { id: "f2", name: "Founder B", equity: 30 },
    { id: "f3", name: "Founder C", equity: 20 },
  ]);

  const [rounds, setRounds] = useState<FundingRound[]>([
    { id: "r1", name: "Seed Round", investment: 5000000, preMoneyValuation: 20000000, esopPool: 10 },
  ]);

  const totalFounderEquity = founders.reduce((sum, f) => sum + f.equity, 0);
  const results = simulateCapTable(founders, rounds);
  const latestRound = results[results.length - 1];

  // Build stacked bar chart data
  const allStakeholders = new Set<string>();
  results.forEach((r) => r.entries.forEach((e) => allStakeholders.add(e.stakeholder)));
  const stakeholderList = Array.from(allStakeholders);

  const chartData = results.map((r) => {
    const row: Record<string, string | number> = { round: r.roundName };
    stakeholderList.forEach((s) => {
      const entry = r.entries.find((e) => e.stakeholder === s);
      row[s] = entry ? parseFloat(entry.percentage.toFixed(2)) : 0;
    });
    return row;
  });

  const addFounder = () => {
    if (founders.length >= 5) return;
    nextFounderId++;
    setFounders([...founders, { id: `f${nextFounderId}`, name: `Founder ${String.fromCharCode(64 + founders.length + 1)}`, equity: 0 }]);
  };

  const addRound = () => {
    nextRoundId++;
    const roundNames = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C"];
    const name = roundNames[rounds.length] || `Round ${rounds.length + 1}`;
    setRounds([...rounds, { id: `r${nextRoundId}`, name, investment: 0, preMoneyValuation: 0, esopPool: 0 }]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Equity & Cap Table Simulator</h1>
        <p className="text-muted-foreground mt-1">
          Set up founders, add funding rounds, and visualize ownership dilution.
        </p>
      </div>

      {/* Founder Setup */}
      <Card>
        <CardHeader>
          <CardTitle>
            Founders
            <InfoTooltip content="Set initial equity split. Total should equal 100%. Based on Kevin's exercise: 3 founders splitting equity before raising capital." />
          </CardTitle>
          <CardDescription>
            Total equity: {formatPercent(totalFounderEquity)}{" "}
            {Math.abs(totalFounderEquity - 100) > 0.01 && (
              <span className="text-destructive">(should be 100%)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {founders.map((founder, i) => (
            <div key={founder.id} className="flex items-end gap-3">
              <div className="flex-1">
                <Label>Name</Label>
                <Input
                  value={founder.name}
                  onChange={(e) => {
                    const next = [...founders];
                    next[i] = { ...founder, name: e.target.value };
                    setFounders(next);
                  }}
                />
              </div>
              <div className="w-32">
                <PercentageInput
                  label="Equity %"
                  value={founder.equity}
                  onChange={(v) => {
                    const next = [...founders];
                    next[i] = { ...founder, equity: v };
                    setFounders(next);
                  }}
                />
              </div>
              {founders.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="mb-0.5"
                  onClick={() => setFounders(founders.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {founders.length < 5 && (
            <Button variant="outline" size="sm" onClick={addFounder}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Founder
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Funding Rounds */}
      <Card>
        <CardHeader>
          <CardTitle>Funding Rounds</CardTitle>
          <CardDescription>Add investment rounds to see dilution effects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {rounds.map((round, i) => (
            <div key={round.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label>Round Name</Label>
                  <Input
                    value={round.name}
                    onChange={(e) => {
                      const next = [...rounds];
                      next[i] = { ...round, name: e.target.value };
                      setRounds(next);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-6"
                  onClick={() => setRounds(rounds.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CurrencyInput
                  label="Investment Amount"
                  value={round.investment}
                  onChange={(v) => {
                    const next = [...rounds];
                    next[i] = { ...round, investment: v };
                    setRounds(next);
                  }}
                />
                <CurrencyInput
                  label="Pre-Money Valuation"
                  value={round.preMoneyValuation}
                  onChange={(v) => {
                    const next = [...rounds];
                    next[i] = { ...round, preMoneyValuation: v };
                    setRounds(next);
                  }}
                />
                <PercentageInput
                  label="ESOP Pool %"
                  value={round.esopPool || 0}
                  onChange={(v) => {
                    const next = [...rounds];
                    next[i] = { ...round, esopPool: v };
                    setRounds(next);
                  }}
                  max={30}
                />
              </div>
              {round.investment > 0 && round.preMoneyValuation > 0 && (
                <p className="text-sm text-muted-foreground">
                  Post-money: {formatPHP(round.preMoneyValuation + round.investment)} | Investor gets:{" "}
                  {formatPercent((round.investment / (round.preMoneyValuation + round.investment)) * 100)}
                </p>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRound}>
            <Plus className="h-4 w-4 mr-2" />
            Add Funding Round
          </Button>
        </CardContent>
      </Card>

      {/* Cap Table Chart */}
      {results.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Ownership Across Rounds</CardTitle>
            <CardDescription>Stacked bar chart showing how equity changes with each round.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="round" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${v}%`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                  formatter={(value) => `${Number(value).toFixed(2)}%`}
                />
                <Legend />
                {stakeholderList.map((stakeholder, index) => (
                  <Bar key={stakeholder} dataKey={stakeholder} stackId="ownership" fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Cap Table Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Final Cap Table</CardTitle>
          <CardDescription>Current ownership after all rounds.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Stakeholder</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-right py-2 px-3">Ownership %</th>
                  <th className="text-left py-2 px-3">Round Added</th>
                </tr>
              </thead>
              <tbody>
                {latestRound.entries.map((entry, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{entry.stakeholder}</td>
                    <td className="py-2 px-3 capitalize text-muted-foreground">{entry.type}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatPercent(entry.percentage)}</td>
                    <td className="py-2 px-3 text-muted-foreground">{entry.roundAdded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Vesting Explainer */}
      <Card>
        <CardHeader>
          <CardTitle>Vesting Schedule Primer</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong className="text-foreground">Standard 4-year vesting with 1-year cliff:</strong> Founders and employees earn equity over 4 years. No equity vests in the first year (the cliff). After the cliff, equity vests monthly.</p>
          <p><strong className="text-foreground">Why it matters:</strong> Vesting protects co-founders from a partner leaving early with a full equity share. It also aligns incentives with long-term commitment.</p>
          <p><strong className="text-foreground">ESOP (Employee Stock Option Pool):</strong> Typically 10-20% set aside before a funding round to attract key hires. This dilutes existing shareholders proportionally.</p>
        </CardContent>
      </Card>
    </div>
  );
}

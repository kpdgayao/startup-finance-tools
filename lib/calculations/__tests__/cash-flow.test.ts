import { describe, it, expect } from "vitest";
import {
  projectMonthlyCashFlow,
  calculateSummary,
  calculateDSO,
  calculateDPO,
  exportToCSV,
  type CashFlowInputs,
} from "../cash-flow";

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeInputs(overrides: Partial<CashFlowInputs> = {}): CashFlowInputs {
  return {
    monthlyRecurringRevenue: 500_000,
    monthlyOneTimeIncome: Array(12).fill(0),
    fixedCosts: 400_000,
    variableCostPercent: 20,
    paymentTermsDays: 30,
    payableTermsDays: 15,
    ...overrides,
  };
}

const STARTING_BALANCE = 3_000_000;

// ─── Basic Structure ───────────────────────────────────────────────────────

describe("projectMonthlyCashFlow", () => {
  it("returns exactly 12 monthly projections", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    expect(result).toHaveLength(12);
  });

  it("months are numbered 1-12", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    expect(result.map((p) => p.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("month labels start from correct offset", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE, 3); // start from April
    expect(result[0].monthLabel).toBe("Apr");
    expect(result[11].monthLabel).toBe("Mar");
  });

  it("month 1 opening balance equals starting balance", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    expect(result[0].openingBalance).toBe(STARTING_BALANCE);
  });
});

// ─── Balance Chain Integrity ───────────────────────────────────────────────

describe("balance chain integrity", () => {
  it("each month's closing = opening + net cash flow", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    for (const p of result) {
      expect(p.closingBalance).toBeCloseTo(p.openingBalance + p.netCashFlow, 2);
    }
  });

  it("each month's opening = previous month's closing", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].openingBalance).toBeCloseTo(result[i - 1].closingBalance, 2);
    }
  });

  it("net cash flow = cash inflow - cash outflow", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    for (const p of result) {
      expect(p.netCashFlow).toBeCloseTo(p.cashInflow - p.cashOutflow, 2);
    }
  });

  it("final closing balance = starting + sum of all net cash flows", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    const totalNet = result.reduce((s, p) => s + p.netCashFlow, 0);
    expect(result[11].closingBalance).toBeCloseTo(STARTING_BALANCE + totalNet, 2);
  });
});

// ─── DSO = 0 (Immediate Collection) ───────────────────────────────────────

describe("DSO=0 (immediate collection)", () => {
  it("cash inflow equals revenue every month", () => {
    const result = projectMonthlyCashFlow(
      makeInputs({ paymentTermsDays: 0 }),
      STARTING_BALANCE
    );
    for (const p of result) {
      expect(p.cashInflow).toBeCloseTo(p.revenue, 2);
    }
  });

  it("AR is always zero", () => {
    const result = projectMonthlyCashFlow(
      makeInputs({ paymentTermsDays: 0 }),
      STARTING_BALANCE
    );
    for (const p of result) {
      expect(p.accountsReceivable).toBe(0);
    }
  });
});

// ─── DPO = 0 (Immediate Payment) ──────────────────────────────────────────

describe("DPO=0 (immediate payment)", () => {
  it("cash outflow equals total expenses every month", () => {
    const result = projectMonthlyCashFlow(
      makeInputs({ payableTermsDays: 0 }),
      STARTING_BALANCE
    );
    for (const p of result) {
      expect(p.cashOutflow).toBeCloseTo(p.totalExpenses, 2);
    }
  });

  it("AP is always zero", () => {
    const result = projectMonthlyCashFlow(
      makeInputs({ payableTermsDays: 0 }),
      STARTING_BALANCE
    );
    for (const p of result) {
      expect(p.accountsPayable).toBe(0);
    }
  });
});

// ─── DSO = 0 and DPO = 0 (No Timing Effects) ─────────────────────────────

describe("DSO=0 DPO=0 (no timing effects)", () => {
  it("cash basis equals accrual basis exactly", () => {
    const result = projectMonthlyCashFlow(
      makeInputs({ paymentTermsDays: 0, payableTermsDays: 0 }),
      STARTING_BALANCE
    );
    for (const p of result) {
      expect(p.cashInflow).toBeCloseTo(p.revenue, 2);
      expect(p.cashOutflow).toBeCloseTo(p.totalExpenses, 2);
    }
  });

  it("all months have identical net cash flow when revenue is flat", () => {
    const result = projectMonthlyCashFlow(
      makeInputs({ paymentTermsDays: 0, payableTermsDays: 0 }),
      STARTING_BALANCE
    );
    const netFlows = result.map((p) => p.netCashFlow);
    for (const nf of netFlows) {
      expect(nf).toBeCloseTo(netFlows[0], 2);
    }
  });
});

// ─── DSO = 30 (Full Month Delay) ──────────────────────────────────────────

describe("DSO=30 (one full month delay)", () => {
  const inputs = makeInputs({ paymentTermsDays: 30, payableTermsDays: 0 });

  it("month 1 cash inflow is zero (building AR)", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    expect(result[0].cashInflow).toBe(0);
  });

  it("month 2+ cash inflow equals revenue (collecting previous month AR)", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].cashInflow).toBeCloseTo(result[i].revenue, 2);
    }
  });

  it("AR equals one month of revenue throughout", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    for (const p of result) {
      expect(p.accountsReceivable).toBeCloseTo(p.revenue, 2);
    }
  });
});

// ─── DSO = 60 (Two Month Delay) ───────────────────────────────────────────

describe("DSO=60 (two month delay)", () => {
  const inputs = makeInputs({ paymentTermsDays: 60, payableTermsDays: 0 });

  it("month 1 cash inflow is zero", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    expect(result[0].cashInflow).toBe(0);
  });

  it("AR equals two months of revenue (DSO/30 * revenue)", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    // With constant revenue, endingAR = 2 * 500K = 1M
    for (const p of result) {
      expect(p.accountsReceivable).toBeCloseTo(2 * p.revenue, 2);
    }
  });
});

// ─── DSO = 15 (Fractional Month) ──────────────────────────────────────────

describe("DSO=15 (half-month delay)", () => {
  const inputs = makeInputs({ paymentTermsDays: 15, payableTermsDays: 0 });

  it("month 1 collects 50% of revenue", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    // arRatio = 0.5, endingAR = 0.5 * 500K = 250K
    // cashInflow = 0 + 500K - 250K = 250K
    expect(result[0].cashInflow).toBeCloseTo(250_000, 2);
  });

  it("months 2+ collect full revenue (steady state)", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    for (let i = 1; i < result.length; i++) {
      // beginningAR = 250K, + 500K revenue - 250K endingAR = 500K
      expect(result[i].cashInflow).toBeCloseTo(500_000, 2);
    }
  });
});

// ─── One-Time Income ───────────────────────────────────────────────────────

describe("one-time income", () => {
  it("increases revenue in the specified month", () => {
    const oneTime = Array(12).fill(0);
    oneTime[2] = 1_000_000; // month 3 gets 1M extra
    const result = projectMonthlyCashFlow(
      makeInputs({ monthlyOneTimeIncome: oneTime }),
      STARTING_BALANCE
    );
    expect(result[2].revenue).toBe(500_000 + 1_000_000);
    expect(result[0].revenue).toBe(500_000); // other months unaffected
    expect(result[3].revenue).toBe(500_000);
  });

  it("one-time income is subject to DSO delay", () => {
    const oneTime = Array(12).fill(0);
    oneTime[2] = 1_000_000;
    const result = projectMonthlyCashFlow(
      makeInputs({ monthlyOneTimeIncome: oneTime, paymentTermsDays: 30 }),
      STARTING_BALANCE
    );
    // Month 3 (index 2): revenue = 1.5M, endingAR = 1.5M
    // cashInflow = beginningAR(500K from month 2) + 1.5M - 1.5M = 500K (only collects prior AR)
    expect(result[2].cashInflow).toBeCloseTo(500_000, 2);
    // Month 4 (index 3): revenue = 500K, endingAR = 500K
    // cashInflow = beginningAR(1.5M) + 500K - 500K = 1.5M (collects month 3's large AR)
    expect(result[3].cashInflow).toBeCloseTo(1_500_000, 2);
  });
});

// ─── Variable Costs ────────────────────────────────────────────────────────

describe("variable costs", () => {
  it("variable cost = variableCostPercent% of revenue", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    for (const p of result) {
      expect(p.variableCosts).toBeCloseTo(p.revenue * 0.2, 2);
    }
  });

  it("total expenses = fixed + variable", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    for (const p of result) {
      expect(p.totalExpenses).toBeCloseTo(p.fixedCosts + p.variableCosts, 2);
    }
  });

  it("0% variable cost means expenses = fixed costs only", () => {
    const result = projectMonthlyCashFlow(
      makeInputs({ variableCostPercent: 0 }),
      STARTING_BALANCE
    );
    for (const p of result) {
      expect(p.variableCosts).toBe(0);
      expect(p.totalExpenses).toBe(400_000);
    }
  });
});

// ─── Edge Cases ────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("zero revenue and zero costs — balance stays flat", () => {
    const result = projectMonthlyCashFlow(
      makeInputs({
        monthlyRecurringRevenue: 0,
        fixedCosts: 0,
        variableCostPercent: 0,
        paymentTermsDays: 0,
        payableTermsDays: 0,
      }),
      STARTING_BALANCE
    );
    for (const p of result) {
      expect(p.closingBalance).toBe(STARTING_BALANCE);
    }
  });

  it("starting balance of zero", () => {
    const result = projectMonthlyCashFlow(makeInputs({ paymentTermsDays: 0, payableTermsDays: 0 }), 0);
    expect(result[0].openingBalance).toBe(0);
    // revenue 500K, expenses 500K (400K fixed + 100K variable), net = 0
    expect(result[0].netCashFlow).toBeCloseTo(0, 2);
  });

  it("expenses exceed revenue — balance declines", () => {
    const result = projectMonthlyCashFlow(
      makeInputs({
        monthlyRecurringRevenue: 200_000,
        fixedCosts: 500_000,
        paymentTermsDays: 0,
        payableTermsDays: 0,
      }),
      STARTING_BALANCE
    );
    // variable costs = 200K * 20% = 40K, total expenses = 540K
    // net = 200K - 540K = -340K per month
    expect(result[0].netCashFlow).toBeCloseTo(-340_000, 2);
    expect(result[11].closingBalance).toBeCloseTo(STARTING_BALANCE + 12 * (-340_000), 2);
  });

  it("DSO capped at 12 months (360 days)", () => {
    const result = projectMonthlyCashFlow(
      makeInputs({ paymentTermsDays: 500 }),
      STARTING_BALANCE
    );
    // arRatio = min(500/30, 12) = 12
    // endingAR = 12 * 500K = 6M
    expect(result[0].accountsReceivable).toBeCloseTo(12 * 500_000, 2);
  });

  it("cash inflow never goes negative (clamped to 0)", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    for (const p of result) {
      expect(p.cashInflow).toBeGreaterThanOrEqual(0);
    }
  });

  it("cash outflow never goes negative (clamped to 0)", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    for (const p of result) {
      expect(p.cashOutflow).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Steady State Verification ─────────────────────────────────────────────

describe("steady state (months 2-12 with flat revenue)", () => {
  it("all months from 2-12 have identical cash flows", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    for (let i = 2; i < 12; i++) {
      expect(result[i].cashInflow).toBeCloseTo(result[1].cashInflow, 2);
      expect(result[i].cashOutflow).toBeCloseTo(result[1].cashOutflow, 2);
      expect(result[i].netCashFlow).toBeCloseTo(result[1].netCashFlow, 2);
    }
  });
});

// ─── Default Values Manual Trace ───────────────────────────────────────────

describe("manual trace with defaults (MRR=500K, Fixed=400K, Var=20%, DSO=30, DPO=15)", () => {
  const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);

  it("revenue = 500K each month", () => {
    expect(result[0].revenue).toBe(500_000);
  });

  it("variable costs = 100K each month", () => {
    expect(result[0].variableCosts).toBe(100_000);
  });

  it("total expenses = 500K each month", () => {
    expect(result[0].totalExpenses).toBe(500_000);
  });

  it("month 1: cashInflow=0, cashOutflow=250K, net=-250K", () => {
    // arRatio=1.0, endingAR=500K, cashInflow = 0+500K-500K = 0
    // apRatio=0.5, endingAP=250K, cashOutflow = 0+500K-250K = 250K
    expect(result[0].cashInflow).toBe(0);
    expect(result[0].cashOutflow).toBe(250_000);
    expect(result[0].netCashFlow).toBe(-250_000);
    expect(result[0].closingBalance).toBe(2_750_000);
  });

  it("month 2: cashInflow=500K, cashOutflow=500K, net=0", () => {
    expect(result[1].cashInflow).toBe(500_000);
    expect(result[1].cashOutflow).toBe(500_000);
    expect(result[1].netCashFlow).toBe(0);
    expect(result[1].closingBalance).toBe(2_750_000);
  });

  it("final balance = 3M - 250K = 2.75M", () => {
    expect(result[11].closingBalance).toBe(2_750_000);
  });
});

// ─── calculateSummary ──────────────────────────────────────────────────────

describe("calculateSummary", () => {
  const projections = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
  const stats = calculateSummary(projections, STARTING_BALANCE, 30, 15);

  it("totalInflow = sum of all cashInflow", () => {
    const expected = projections.reduce((s, p) => s + p.cashInflow, 0);
    expect(stats.totalInflow).toBeCloseTo(expected, 2);
  });

  it("totalOutflow = sum of all cashOutflow", () => {
    const expected = projections.reduce((s, p) => s + p.cashOutflow, 0);
    expect(stats.totalOutflow).toBeCloseTo(expected, 2);
  });

  it("totalNetFlow = totalInflow - totalOutflow", () => {
    expect(stats.totalNetFlow).toBeCloseTo(stats.totalInflow - stats.totalOutflow, 2);
  });

  it("finalBalance = last month closing balance", () => {
    expect(stats.finalBalance).toBe(projections[11].closingBalance);
  });

  it("peakBalance includes starting balance", () => {
    // Starting balance is 3M, all closing balances are <= 2.75M
    expect(stats.peakBalance).toBe(STARTING_BALANCE);
  });

  it("lowestBalance includes starting balance", () => {
    // Lowest closing is 2.75M, starting is 3M
    expect(stats.lowestBalance).toBe(2_750_000);
  });

  it("cashConversionCycle = DSO - DPO", () => {
    expect(stats.cashConversionCycle).toBe(15); // 30 - 15
  });

  it("workingCapitalImpact = AR - AP from month 1", () => {
    // AR = 500K (1.0 * 500K), AP = 250K (0.5 * 500K)
    expect(stats.workingCapitalImpact).toBe(250_000);
  });

  it("negativeMonths counts months with negative net flow", () => {
    // Only month 1 has net=-250K
    expect(stats.negativeMonths).toBe(1);
  });

  it("negativeBalanceMonths counts months ending with negative balance", () => {
    expect(stats.negativeBalanceMonths).toBe(0);
  });

  it("bestMonth is the month with highest net cash flow", () => {
    // Months 2-12 have net=0, month 1 has net=-250K
    // bestMonth should be one of months 2-12
    expect(stats.bestMonth.netCashFlow).toBe(0);
  });

  it("worstMonth is month 1 (net=-250K)", () => {
    expect(stats.worstMonth.month).toBe(1);
    expect(stats.worstMonth.netCashFlow).toBe(-250_000);
  });
});

// ─── Summary with DSO=0 DPO=0 ─────────────────────────────────────────────

describe("calculateSummary with no timing effects", () => {
  const projections = projectMonthlyCashFlow(
    makeInputs({ paymentTermsDays: 0, payableTermsDays: 0 }),
    STARTING_BALANCE
  );
  const stats = calculateSummary(projections, STARTING_BALANCE, 0, 0);

  it("workingCapitalImpact is zero", () => {
    expect(stats.workingCapitalImpact).toBe(0);
  });

  it("CCC is zero", () => {
    expect(stats.cashConversionCycle).toBe(0);
  });

  it("no negative months when revenue equals expenses", () => {
    expect(stats.negativeMonths).toBe(0);
  });
});

// ─── DSO/DPO Helper Functions ──────────────────────────────────────────────

describe("calculateDSO", () => {
  it("returns 0 when revenue is 0", () => {
    expect(calculateDSO(100_000, 0)).toBe(0);
  });

  it("calculates correctly: (receivables/revenue) * 30", () => {
    expect(calculateDSO(250_000, 500_000)).toBe(15);
    expect(calculateDSO(500_000, 500_000)).toBe(30);
  });
});

describe("calculateDPO", () => {
  it("returns 0 when expenses is 0", () => {
    expect(calculateDPO(100_000, 0)).toBe(0);
  });

  it("calculates correctly: (payables/expenses) * 30", () => {
    expect(calculateDPO(250_000, 500_000)).toBe(15);
  });
});

// ─── CSV Export ────────────────────────────────────────────────────────────

describe("exportToCSV", () => {
  it("has correct number of rows (header + 12 months)", () => {
    const projections = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    const csv = exportToCSV(projections);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(13); // 1 header + 12 data rows
  });

  it("header has correct columns", () => {
    const projections = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    const csv = exportToCSV(projections);
    const header = csv.split("\n")[0];
    expect(header).toContain("Month");
    expect(header).toContain("Opening Balance");
    expect(header).toContain("Cash Inflow");
    expect(header).toContain("Cash Outflow");
    expect(header).toContain("Closing Balance");
  });
});

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

// ─── Steady-State Initialization ───────────────────────────────────────────

describe("steady-state AR/AP initialization", () => {
  it("month 1 has the same net cash flow as month 2 when revenue is flat", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    // With steady-state initialization and flat MRR, no month-1 anomaly
    expect(result[0].netCashFlow).toBeCloseTo(result[1].netCashFlow, 2);
  });

  it("no false month-1 cash dip with flat recurring revenue", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    // All months should have the same net flow when revenue/costs are constant
    const netFlows = result.map((p) => p.netCashFlow);
    for (let i = 1; i < netFlows.length; i++) {
      expect(netFlows[i]).toBeCloseTo(netFlows[0], 2);
    }
  });

  it("balance stays flat when accrual revenue equals accrual expenses", () => {
    // MRR=500K, fixed=400K, var=20% → expenses=500K, net accrual=0
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    for (const p of result) {
      expect(p.closingBalance).toBeCloseTo(STARTING_BALANCE, 2);
    }
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

  it("cash inflow equals revenue every month (steady-state initialized)", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    // With steady-state beginningAR, month 1 collects just like any other month
    for (const p of result) {
      expect(p.cashInflow).toBeCloseTo(p.revenue, 2);
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

  it("AR equals two months of revenue (DSO/30 * revenue)", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    for (const p of result) {
      expect(p.accountsReceivable).toBeCloseTo(2 * p.revenue, 2);
    }
  });

  it("steady state cash inflow equals revenue with flat MRR", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    // beginningAR = 2 * 500K = 1M, endingAR = 2 * 500K = 1M
    // cashInflow = 1M + 500K - 1M = 500K
    for (const p of result) {
      expect(p.cashInflow).toBeCloseTo(500_000, 2);
    }
  });
});

// ─── DSO = 15 (Fractional Month) ──────────────────────────────────────────

describe("DSO=15 (half-month delay)", () => {
  const inputs = makeInputs({ paymentTermsDays: 15, payableTermsDays: 0 });

  it("AR equals half a month of revenue", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    for (const p of result) {
      expect(p.accountsReceivable).toBeCloseTo(p.revenue * 0.5, 2);
    }
  });

  it("all months collect full revenue (steady-state)", () => {
    const result = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
    // beginningAR = 0.5 * 500K = 250K, endingAR = 0.5 * 500K = 250K
    // cashInflow = 250K + 500K - 250K = 500K
    for (const p of result) {
      expect(p.cashInflow).toBeCloseTo(500_000, 2);
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
    oneTime[2] = 1_000_000; // month 3 (index 2) gets 1M extra
    const result = projectMonthlyCashFlow(
      makeInputs({ monthlyOneTimeIncome: oneTime, paymentTermsDays: 30 }),
      STARTING_BALANCE
    );
    // Month 3 (index 2): revenue = 1.5M, endingAR = 1.0 * 1.5M = 1.5M
    // beginningAR = 500K (steady state from month 2)
    // cashInflow = 500K + 1.5M - 1.5M = 500K (only collects prior month's steady AR)
    expect(result[2].cashInflow).toBeCloseTo(500_000, 2);

    // Month 4 (index 3): revenue = 500K, endingAR = 500K
    // beginningAR = 1.5M (from month 3's large AR)
    // cashInflow = 1.5M + 500K - 500K = 1.5M (collects the one-time income now)
    expect(result[3].cashInflow).toBeCloseTo(1_500_000, 2);
  });

  it("one-time income collected in same month with DSO=0", () => {
    const oneTime = Array(12).fill(0);
    oneTime[2] = 1_000_000;
    const result = projectMonthlyCashFlow(
      makeInputs({ monthlyOneTimeIncome: oneTime, paymentTermsDays: 0 }),
      STARTING_BALANCE
    );
    expect(result[2].cashInflow).toBeCloseTo(1_500_000, 2);
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

  it("expenses exceed revenue — balance declines steadily", () => {
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

describe("steady state (all 12 months with flat revenue)", () => {
  it("ALL months have identical cash flows (no month-1 anomaly)", () => {
    const result = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    for (let i = 1; i < 12; i++) {
      expect(result[i].cashInflow).toBeCloseTo(result[0].cashInflow, 2);
      expect(result[i].cashOutflow).toBeCloseTo(result[0].cashOutflow, 2);
      expect(result[i].netCashFlow).toBeCloseTo(result[0].netCashFlow, 2);
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

  it("month 1: steady-state → cashInflow=500K, cashOutflow=500K, net=0", () => {
    // arRatio=1.0, beginningAR = 1.0*500K = 500K (steady state)
    // endingAR = 1.0*500K = 500K
    // cashInflow = 500K + 500K - 500K = 500K
    // apRatio=0.5, beginningAP = 0.5*500K = 250K (steady state)
    // endingAP = 0.5*500K = 250K
    // cashOutflow = 250K + 500K - 250K = 500K
    expect(result[0].cashInflow).toBe(500_000);
    expect(result[0].cashOutflow).toBe(500_000);
    expect(result[0].netCashFlow).toBe(0);
    expect(result[0].closingBalance).toBe(3_000_000);
  });

  it("all months identical — balance stays at 3M (break-even)", () => {
    for (const p of result) {
      expect(p.closingBalance).toBe(3_000_000);
    }
  });

  it("final balance = starting balance (no working capital leak)", () => {
    expect(result[11].closingBalance).toBe(STARTING_BALANCE);
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
    expect(stats.peakBalance).toBe(STARTING_BALANCE);
  });

  it("lowestBalance includes starting balance", () => {
    // With break-even, all balances = 3M
    expect(stats.lowestBalance).toBe(STARTING_BALANCE);
  });

  it("cashConversionCycle = DSO - DPO", () => {
    expect(stats.cashConversionCycle).toBe(15); // 30 - 15
  });

  it("workingCapitalImpact = AR - AP from month 1", () => {
    // AR = 500K (1.0 * 500K), AP = 250K (0.5 * 500K)
    expect(stats.workingCapitalImpact).toBe(250_000);
  });

  it("negativeMonths = 0 (all months break even)", () => {
    expect(stats.negativeMonths).toBe(0);
  });

  it("negativeBalanceMonths = 0", () => {
    expect(stats.negativeBalanceMonths).toBe(0);
  });
});

// ─── Summary when losing money ─────────────────────────────────────────────

describe("calculateSummary when expenses exceed revenue", () => {
  const inputs = makeInputs({
    monthlyRecurringRevenue: 200_000,
    fixedCosts: 500_000,
    paymentTermsDays: 0,
    payableTermsDays: 0,
  });
  const projections = projectMonthlyCashFlow(inputs, STARTING_BALANCE);
  const stats = calculateSummary(projections, STARTING_BALANCE, 0, 0);

  it("all 12 months have negative net flow", () => {
    expect(stats.negativeMonths).toBe(12);
  });

  it("peakBalance is starting balance", () => {
    expect(stats.peakBalance).toBe(STARTING_BALANCE);
  });

  it("lowestBalance is final closing", () => {
    expect(stats.lowestBalance).toBe(projections[11].closingBalance);
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
  it("has correct number of rows (meta + header + 12 months)", () => {
    const projections = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    const csv = exportToCSV(projections);
    const lines = csv.split("\n");
    // 3 meta lines (title, date, blank) + 1 header + 12 data rows = 16
    expect(lines).toHaveLength(16);
  });

  it("header has correct columns", () => {
    const projections = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    const csv = exportToCSV(projections);
    const lines = csv.split("\n");
    const header = lines[3]; // After 3 meta lines
    expect(header).toContain("Month");
    expect(header).toContain("Opening Balance");
    expect(header).toContain("Cash Inflow");
    expect(header).toContain("Cash Outflow");
    expect(header).toContain("Closing Balance");
  });

  it("includes branding in meta header", () => {
    const projections = projectMonthlyCashFlow(makeInputs(), STARTING_BALANCE);
    const csv = exportToCSV(projections);
    expect(csv).toContain("Startup Finance Toolkit");
  });
});

// ─── One-Time Income AR Behavior ───────────────────────────────────────────

describe("one-time income AR behavior with steady-state init", () => {
  it("total cash collected over 12 months equals total revenue when DSO < 12 months", () => {
    const oneTime = Array(12).fill(0);
    oneTime[3] = 2_000_000; // big one-time in month 4
    oneTime[8] = 500_000;   // another in month 9
    const result = projectMonthlyCashFlow(
      makeInputs({ monthlyOneTimeIncome: oneTime, paymentTermsDays: 30 }),
      STARTING_BALANCE
    );
    const totalRevenue = result.reduce((s, p) => s + p.revenue, 0);
    const totalCashIn = result.reduce((s, p) => s + p.cashInflow, 0);
    // With DSO=30 and 12 months, some AR from the last month won't be collected
    // Final AR should equal the last month's revenue (only MRR since no one-time in month 12)
    const finalAR = result[11].accountsReceivable;
    // Initial AR (steady state) = 1 * 500K = 500K
    const initialAR = 500_000;
    // totalCashIn = initialAR + totalRevenue - finalAR
    expect(totalCashIn).toBeCloseTo(initialAR + totalRevenue - finalAR, 2);
  });
});

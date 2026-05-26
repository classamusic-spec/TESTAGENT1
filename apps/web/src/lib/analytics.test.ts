import { describe, expect, it } from "vitest";

import { computeAnalytics } from "@/lib/analytics";
import type { PaperRun } from "@/lib/paper-sim";

function run(equities: number[], trades = 0): PaperRun {
  return {
    equityCurve: equities.map((equity, i) => ({ time: i * 1000, equity })),
    trades: Array.from({ length: trades }, (_, i) => ({
      time: i,
      side: "buy" as const,
      price: 1,
      notional: 1,
    })),
    positionNotional: 0,
    equity: equities[equities.length - 1] ?? 0,
    pnl: 0,
    pnlPct: 0,
  };
}

describe("computeAnalytics", () => {
  it("computes total return from the equity curve", () => {
    const stats = computeAnalytics(run([100, 110]));
    expect(stats.totalReturnPct).toBeCloseTo(10);
    expect(stats.cumulativePnl.at(-1)?.pnl).toBeCloseTo(10);
  });

  it("captures the worst peak-to-trough drawdown", () => {
    const stats = computeAnalytics(run([100, 120, 90, 130]));
    expect(stats.maxDrawdownPct).toBeCloseTo((120 - 90) / 120 * 100);
  });

  it("reports a positive Sharpe for a steady climb", () => {
    const stats = computeAnalytics(run([100, 101, 102, 103, 104]));
    expect(stats.sharpe).toBeGreaterThan(0);
    expect(stats.winRateBars).toBe(1);
  });

  it("passes through the trade count", () => {
    expect(computeAnalytics(run([100, 100], 3)).numTrades).toBe(3);
  });

  it("handles a flat curve without NaNs", () => {
    const stats = computeAnalytics(run([100, 100, 100]));
    expect(stats.sharpe).toBe(0);
    expect(stats.maxDrawdownPct).toBe(0);
    expect(stats.volatilityPct).toBe(0);
  });
});

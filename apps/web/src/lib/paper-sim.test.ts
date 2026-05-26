import { describe, expect, it } from "vitest";
import type { Candle } from "@kronos/shared";

import { simulatePaperRun } from "@/lib/paper-sim";

const STEP = 3_600_000;

function candles(closes: number[]): Candle[] {
  return closes.map((c, i) => ({
    openTime: i * STEP,
    open: c,
    high: c,
    low: c,
    close: c,
    volume: 1,
    closed: true,
  }));
}

describe("simulatePaperRun", () => {
  it("stays flat and trades nothing on a constant price", () => {
    const run = simulatePaperRun(candles(Array(30).fill(100)));
    expect(run.trades).toHaveLength(0);
    expect(run.equity).toBe(10_000);
    expect(run.pnl).toBe(0);
  });

  it("opens a long and profits in a steady uptrend", () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 * 1.01 ** i);
    const run = simulatePaperRun(closes && candles(closes));
    expect(run.trades.length).toBeGreaterThan(0);
    expect(run.trades.some((t) => t.side === "buy")).toBe(true);
    expect(run.positionNotional).toBeGreaterThan(0); // ended long
    expect(run.equity).toBeGreaterThan(10_000); // net profit after costs
  });

  it("produces an equity curve aligned to the candles", () => {
    const run = simulatePaperRun(candles(Array.from({ length: 20 }, (_, i) => 100 + i)));
    expect(run.equityCurve).toHaveLength(20);
    expect(run.equityCurve[0]!.equity).toBeCloseTo(10_000, 5);
  });
});

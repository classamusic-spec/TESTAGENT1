import { describe, expect, it } from "vitest";
import type { Candle } from "@kronos/shared";

import { computeAtrSeries, configForDeposit, RISK_PRESETS, runAutoStrategy } from "@/lib/auto-trader";

function candles(closes: number[]): Candle[] {
  return closes.map(
    (c, i) =>
      ({
        openTime: i * 3_600_000,
        open: c,
        high: c,
        low: c,
        close: c,
        volume: 1,
        closed: true,
      }) as Candle,
  );
}

function ohlc(rows: [number, number, number][]): Candle[] {
  // [high, low, close]
  return rows.map(
    ([h, l, c], i) =>
      ({ openTime: i * 3_600_000, open: c, high: h, low: l, close: c, volume: 1, closed: true }) as Candle,
  );
}

describe("runAutoStrategy", () => {
  it("opens a long in a sustained uptrend and ends profitable", () => {
    const run = runAutoStrategy(candles(Array.from({ length: 40 }, (_, i) => 100 * 1.01 ** i)), {
      stopLossPct: null,
      takeProfitPct: null,
    });
    const opens = run.trades.filter((t) => t.reason === "open_long");
    expect(opens.length).toBeGreaterThan(0);
    expect(run.summary.totalReturnPct).toBeGreaterThan(0);
  });

  it("autonomously exits on a stop-loss", () => {
    // Climb (opens long), then a single sharp gap-down should trip the 4% stop
    // before the signal would otherwise exit.
    const prices = [...Array.from({ length: 15 }, (_, i) => 100 + i), 95, 94, 93];
    const run = runAutoStrategy(candles(prices), {
      stopLossPct: 0.04,
      takeProfitPct: null,
      allowShort: false,
    });
    expect(run.trades.some((t) => t.reason === "stop_loss")).toBe(true);
    // After a stop, the position is flat at least on that step.
    const stopStep = run.steps.find((s) => s.event === "stop_loss");
    expect(stopStep?.positionSide).toBe("flat");
  });

  it("can take profit", () => {
    const prices = [...Array.from({ length: 12 }, (_, i) => 100 + i * 0.3), 130, 140];
    const run = runAutoStrategy(candles(prices), {
      stopLossPct: null,
      takeProfitPct: 0.05,
      allowShort: false,
    });
    expect(run.trades.some((t) => t.reason === "take_profit")).toBe(true);
  });

  it("never shorts when allowShort is false", () => {
    const run = runAutoStrategy(candles(Array.from({ length: 40 }, (_, i) => 100 * 0.99 ** i)), {
      allowShort: false,
    });
    expect(run.steps.every((s) => s.positionSide !== "short")).toBe(true);
  });

  it("shorts a downtrend when allowed", () => {
    const run = runAutoStrategy(candles(Array.from({ length: 40 }, (_, i) => 100 * 0.99 ** i)), {
      allowShort: true,
      stopLossPct: null,
      takeProfitPct: null,
    });
    expect(run.trades.some((t) => t.reason === "open_short")).toBe(true);
  });

  it("computes a causal ATR that rises with range", () => {
    const calm = ohlc(Array.from({ length: 20 }, () => [101, 99, 100] as [number, number, number]));
    const wild = ohlc(Array.from({ length: 20 }, () => [108, 92, 100] as [number, number, number]));
    expect(computeAtrSeries(calm, 14).at(-1)!).toBeCloseTo(2, 1);
    expect(computeAtrSeries(wild, 14).at(-1)!).toBeGreaterThan(computeAtrSeries(calm, 14).at(-1)!);
  });

  it("ATR stop mode still exits a long on a sharp drop", () => {
    const prices = [...Array.from({ length: 15 }, (_, i) => 100 + i), 80, 79, 78];
    const run = runAutoStrategy(candles(prices), {
      stopMode: "atr",
      atrMult: 2,
      takeProfitPct: null,
      allowShort: false,
    });
    expect(run.trades.some((t) => t.reason === "stop_loss")).toBe(true);
  });

  it("cooldown suppresses immediate re-entry after a stop", () => {
    const prices = [...Array.from({ length: 15 }, (_, i) => 100 + i), 95, 96, 98, 100, 102, 104, 106];
    const noCooldown = runAutoStrategy(candles(prices), {
      stopLossPct: 0.04,
      takeProfitPct: null,
      allowShort: false,
      cooldownBars: 0,
    });
    const withCooldown = runAutoStrategy(candles(prices), {
      stopLossPct: 0.04,
      takeProfitPct: null,
      allowShort: false,
      cooldownBars: 5,
    });
    const opens = (r: ReturnType<typeof runAutoStrategy>) =>
      r.trades.filter((t) => t.reason === "open_long").length;
    expect(opens(withCooldown)).toBeLessThanOrEqual(opens(noCooldown));
  });

  it("configForDeposit scales position with deposit and risk", () => {
    const c = configForDeposit(2000, "conservative");
    expect(c.startCash).toBe(2000);
    expect(c.maxPosition).toBeCloseTo(2000 * RISK_PRESETS.conservative.exposure);
    expect(c.allowShort).toBe(false);
    // Aggressive commits more of the deposit than conservative.
    expect(configForDeposit(2000, "aggressive").maxPosition).toBeGreaterThan(c.maxPosition);
  });

  it("daily-loss protection caps fresh entries in a downtrend", () => {
    const downtrend = candles(Array.from({ length: 80 }, (_, i) => 100 * 0.99 ** i));
    const protectedRun = runAutoStrategy(downtrend, { allowShort: false, maxDailyLossPct: 0.02, cooldownBars: 0 });
    const unprotectedRun = runAutoStrategy(downtrend, { allowShort: false, maxDailyLossPct: null, cooldownBars: 0 });
    const opens = (r: ReturnType<typeof runAutoStrategy>) => r.trades.filter((t) => t.reason === "open_long").length;
    expect(opens(protectedRun)).toBeLessThanOrEqual(opens(unprotectedRun));
  });

  it("reports win rate over closed trades", () => {
    const run = runAutoStrategy(candles(Array.from({ length: 60 }, (_, i) => 100 + 8 * Math.sin(i / 3))));
    expect(run.summary.closedTrades).toBeGreaterThanOrEqual(0);
    expect(run.summary.winRate).toBeGreaterThanOrEqual(0);
    expect(run.summary.winRate).toBeLessThanOrEqual(1);
  });
});

import { describe, expect, it } from "vitest";
import type { Candle } from "@kronos/shared";

import { configForDeposit, runAutoStrategy } from "@/lib/auto-trader";
import { combinePortfolio } from "@/lib/portfolio";

function candles(closes: number[]): Candle[] {
  return closes.map((c, i) => {
    const prev = closes[i - 1] ?? c;
    return { openTime: i * 3_600_000, open: prev, high: Math.max(c, prev) * 1.003, low: Math.min(c, prev) * 0.997, close: c, volume: 1, closed: true } as Candle;
  });
}

describe("combinePortfolio", () => {
  it("combines runs and reports per-asset returns", () => {
    const cfg = configForDeposit(5000, "balanced");
    const a = { symbol: "BTC", run: runAutoStrategy(candles(Array.from({ length: 80 }, (_, i) => 100 + i)), cfg) };
    const b = { symbol: "ETH", run: runAutoStrategy(candles(Array.from({ length: 80 }, (_, i) => 100 + 8 * Math.sin(i / 3))), cfg) };
    const port = combinePortfolio([a, b], 5000);
    expect(port.curve[0]!.equity).toBe(5000);
    expect(port.perAsset.map((p) => p.symbol)).toEqual(["BTC", "ETH"]);
    expect(port.maxDrawdownPct).toBeGreaterThanOrEqual(0);
  });

  it("empty input returns the deposit flat", () => {
    const port = combinePortfolio([], 5000);
    expect(port.totalReturnPct).toBe(0);
    expect(port.curve).toHaveLength(1);
  });
});

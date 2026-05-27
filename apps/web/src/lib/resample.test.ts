import { describe, expect, it } from "vitest";
import type { Candle } from "@kronos/shared";

import { resampleCandles, TIMEFRAME_FACTOR } from "@/lib/resample";

function candle(i: number, o: number, h: number, l: number, c: number): Candle {
  return { openTime: i * 3_600_000, open: o, high: h, low: l, close: c, volume: 2, closed: true } as Candle;
}

describe("resampleCandles", () => {
  it("aggregates OHLCV correctly", () => {
    const candles = [candle(0, 100, 110, 95, 105), candle(1, 105, 120, 100, 115), candle(2, 115, 118, 90, 92)];
    const agg = resampleCandles(candles, 3);
    expect(agg).toHaveLength(1);
    expect(agg[0]!.open).toBe(100);
    expect(agg[0]!.close).toBe(92);
    expect(agg[0]!.high).toBe(120);
    expect(agg[0]!.low).toBe(90);
    expect(agg[0]!.volume).toBe(6);
  });

  it("factor 1 is a no-op", () => {
    const candles = [candle(0, 1, 1, 1, 1), candle(1, 2, 2, 2, 2)];
    expect(resampleCandles(candles, 1)).toBe(candles);
  });

  it("daily factor reduces 48 hourly bars to 2", () => {
    const candles = Array.from({ length: 48 }, (_, i) => candle(i, 100, 101, 99, 100));
    expect(resampleCandles(candles, TIMEFRAME_FACTOR["1d"]).length).toBe(2);
  });
});

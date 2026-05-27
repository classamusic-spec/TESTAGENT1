import type { Candle } from "@kronos/shared";

/**
 * Aggregate candles to a higher timeframe (mirror of apps/api data/resample.py).
 * Trading on 4h / 1d instead of 1h is the biggest measured improvement — far
 * fewer bars means far less fee/slippage drag.
 */
export type Timeframe = "1h" | "4h" | "1d";

export const TIMEFRAME_FACTOR: Record<Timeframe, number> = { "1h": 1, "4h": 4, "1d": 24 };
export const TIMEFRAMES: Timeframe[] = ["1h", "4h", "1d"];

export function resampleCandles(candles: Candle[], factor: number): Candle[] {
  if (factor <= 1) return candles;
  const out: Candle[] = [];
  for (let i = 0; i + factor <= candles.length; i += factor) {
    const w = candles.slice(i, i + factor);
    out.push({
      openTime: w[0]!.openTime,
      open: w[0]!.open,
      high: Math.max(...w.map((c) => c.high)),
      low: Math.min(...w.map((c) => c.low)),
      close: w[w.length - 1]!.close,
      volume: w.reduce((a, c) => a + c.volume, 0),
      closed: true,
    });
  }
  return out;
}

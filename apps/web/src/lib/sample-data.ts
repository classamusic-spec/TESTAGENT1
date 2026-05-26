import { TRADEABLE_PAIRS, type Candle, type Forecast, type TradingPair } from "@kronos/shared";

/**
 * Deterministic sample market data for the dashboard. This is clearly-labeled
 * placeholder data so the visualization renders without the live data pipeline
 * and GPU forecast service. The `useForecast` hook is the seam where real
 * forecasts from apps/api get wired in (later phases).
 */

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR_MS = 3_600_000;

// Indicative base prices per asset so sample charts look plausible. Real prices
// arrive with the live data pipeline; these only seed the placeholder series.
const BASE_PRICE: Record<string, number> = {
  BTC: 64000,
  ETH: 3200,
  BNB: 580,
  SOL: 145,
  XRP: 0.52,
  ADA: 0.45,
  DOGE: 0.13,
  TRX: 0.12,
  AVAX: 28,
  LINK: 14,
  DOT: 6.4,
  MATIC: 0.58,
  TON: 5.6,
  SHIB: 0.000024,
  LTC: 72,
  BCH: 380,
  NEAR: 5.1,
  UNI: 7.3,
  APT: 8.2,
  ATOM: 7.1,
};

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seedFor(pair: TradingPair): { seed: number; base: number } {
  const symbol = pair.split("/")[0] ?? pair;
  return { seed: hashSeed(pair), base: BASE_PRICE[symbol] ?? 100 };
}

export interface SampleForecast {
  candles: Candle[];
  forecast: Forecast;
}

export function getSampleForecast(
  pair: TradingPair,
  interval = "1h",
  history = 120,
  horizon = 12,
): SampleForecast {
  const config = seedFor(pair);
  const rand = mulberry32(config.seed);

  // Anchor the last closed candle to the most recent completed hour.
  const now = Date.now();
  const lastClose = Math.floor(now / HOUR_MS) * HOUR_MS - HOUR_MS;
  const firstOpen = lastClose - (history - 1) * HOUR_MS;

  const candles: Candle[] = [];
  let price = config.base;
  let drift = 0;
  for (let i = 0; i < history; i++) {
    drift = 0.82 * drift + 0.18 * (rand() - 0.48) * 0.01;
    const ret = drift + (rand() - 0.5) * 0.012;
    const open = price;
    const close = open * (1 + ret);
    const high = Math.max(open, close) * (1 + rand() * 0.004);
    const low = Math.min(open, close) * (1 - rand() * 0.004);
    candles.push({
      openTime: firstOpen + i * HOUR_MS,
      open,
      high,
      low,
      close,
      volume: 50 + rand() * 200,
      closed: true,
    });
    price = close;
  }

  const last = candles[candles.length - 1]!;
  const recentReturns = candles
    .slice(-24)
    .map((c, i, arr) => (i === 0 ? 0 : c.close / arr[i - 1]!.close - 1));
  const mu = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
  const sigma =
    Math.sqrt(recentReturns.reduce((a, b) => a + (b - mu) ** 2, 0) / recentReturns.length) ||
    0.008;

  const steps = Array.from({ length: horizon }, (_, k) => {
    const step = k + 1;
    const median = last.close * (1 + mu) ** step;
    const band = median * 1.2816 * sigma * Math.sqrt(step);
    return {
      openTime: last.openTime + step * HOUR_MS,
      close: median,
      lower: median - band,
      upper: median + band,
    };
  });

  const pUp = 1 / (1 + Math.exp(-mu / (sigma || 1e-6)));

  const forecast: Forecast = {
    pair,
    interval: interval as Forecast["interval"],
    modelVersion: "stub-0.1",
    generatedAt: now,
    basedOnCandleTime: last.openTime,
    steps,
    pUp,
  };

  return { candles, forecast };
}

export const SAMPLE_PAIRS: readonly TradingPair[] = TRADEABLE_PAIRS;

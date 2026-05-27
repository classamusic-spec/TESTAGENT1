/** Deterministic mock market data for the marketing terminal + dashboard preview.
 * Not a live feed; values mirror the reference design for a polished showcase. */

export interface OHLCV {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

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

/** A plausible candlestick series via a gently mean-reverting random walk. */
export function genCandles(seed: number, n: number, start: number, vol = 0.012): OHLCV[] {
  const rand = mulberry32(seed);
  const out: OHLCV[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    const drift = Math.sin(i / 7) * vol * 0.4 + (rand() - 0.48) * vol;
    const o = price;
    const c = o * (1 + drift);
    const wick = o * vol * (0.4 + rand());
    const h = Math.max(o, c) + wick * rand();
    const l = Math.min(o, c) - wick * rand();
    const v = 0.4 + rand();
    out.push({ o, h, l, c, v });
    price = c;
  }
  return out;
}

export interface ForecastBand {
  median: number[];
  lower: number[];
  upper: number[];
}

/** A widening forecast cone continuing from the last close. */
export function genForecast(lastClose: number, steps: number, seed = 7): ForecastBand {
  const rand = mulberry32(seed);
  const median: number[] = [];
  const lower: number[] = [];
  const upper: number[] = [];
  let p = lastClose;
  for (let i = 1; i <= steps; i++) {
    p = p * (1 + 0.004 + (rand() - 0.5) * 0.002); // gentle upward drift
    const spread = lastClose * 0.006 * i;
    median.push(p);
    lower.push(p - spread);
    upper.push(p + spread);
  }
  return { median, lower, upper };
}

export interface TickerEntry {
  symbol: string;
  price: string;
  change: string;
  up: boolean;
}

/** Matches the reference design's bottom ticker. */
export const HERO_TICKER: TickerEntry[] = [
  { symbol: "BTC/USDT", price: "67,842.31", change: "+1.91%", up: true },
  { symbol: "ETH/USDT", price: "3,452.18", change: "+2.31%", up: true },
  { symbol: "SOL/USDT", price: "165.28", change: "+3.12%", up: true },
  { symbol: "BNB/USDT", price: "605.74", change: "+1.23%", up: true },
  { symbol: "XRP/USDT", price: "0.5287", change: "+1.05%", up: true },
  { symbol: "DOGE/USDT", price: "0.1351", change: "+2.45%", up: true },
  { symbol: "ADA/USDT", price: "0.4521", change: "+2.01%", up: true },
  { symbol: "LINK/USDT", price: "17.23", change: "+1.72%", up: true },
];

/** Token symbols shown in the supported-markets strip (matches the reference). */
export const SHOWCASE_TOKENS = [
  "BTC", "ETH", "USDT", "BNB", "XRP", "USDC", "SOL", "TRX", "DOGE", "HYPE",
  "ZEC", "LEO", "ADA", "XMR", "BCH", "LINK", "CC", "DAI", "XLM",
];

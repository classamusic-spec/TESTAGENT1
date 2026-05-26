import type { Candle } from "@kronos/shared";

import { deriveSignal } from "@/lib/signal";

/**
 * Lightweight paper-trading simulation for the dashboard preview. It mirrors the
 * authoritative engine in apps/api/src/execution (constant-notional target,
 * slippage + fees, human-set position cap) closely enough to visualize the loop,
 * but the Python engine remains the source of truth for anything that would run
 * live. This runs over the sample candle history to produce an equity curve.
 */

export interface PaperTrade {
  time: number;
  side: "buy" | "sell";
  price: number;
  notional: number;
}

export interface PaperRun {
  equityCurve: { time: number; equity: number }[];
  trades: PaperTrade[];
  positionNotional: number;
  equity: number;
  pnl: number;
  pnlPct: number;
}

export interface PaperConfig {
  startCash: number;
  maxPosition: number;
  feeBps: number;
  slippageBps: number;
}

const DEFAULTS: PaperConfig = { startCash: 10_000, maxPosition: 500, feeBps: 10, slippageBps: 5 };

/** Causal momentum -> directional probability, using only past closes. */
function momentumPUp(candles: Candle[], i: number): number {
  if (i < 6) return 0.5;
  const r = candles[i]!.close / candles[i - 6]!.close - 1;
  return 1 / (1 + Math.exp(-30 * r));
}

export function simulatePaperRun(candles: Candle[], config: Partial<PaperConfig> = {}): PaperRun {
  const { startCash, maxPosition, feeBps, slippageBps } = { ...DEFAULTS, ...config };
  let cash = startCash;
  let units = 0;
  const trades: PaperTrade[] = [];
  const equityCurve: { time: number; equity: number }[] = [];

  for (let i = 0; i < candles.length; i++) {
    const mark = candles[i]!.close;
    const side = deriveSignal(momentumPUp(candles, i));
    const targetNotional = (side === "long" ? 1 : side === "short" ? -1 : 0) * maxPosition;
    const currentNotional = units * mark;
    const delta = targetNotional - currentNotional;

    if (Math.abs(delta) > 1e-6 && i >= 6) {
      const buying = delta > 0;
      const fillPrice = mark * (1 + (buying ? 1 : -1) * (slippageBps / 10_000));
      const fee = Math.abs(delta) * (feeBps / 10_000);
      const tradedUnits = delta / mark;
      cash += -(tradedUnits * fillPrice) - fee;
      units += tradedUnits;
      trades.push({ time: candles[i]!.openTime, side: buying ? "buy" : "sell", price: fillPrice, notional: delta });
    }

    equityCurve.push({ time: candles[i]!.openTime, equity: cash + units * mark });
  }

  const equity = equityCurve.length ? equityCurve[equityCurve.length - 1]!.equity : startCash;
  const lastMark = candles.length ? candles[candles.length - 1]!.close : 0;
  return {
    equityCurve,
    trades,
    positionNotional: units * lastMark,
    equity,
    pnl: equity - startCash,
    pnlPct: (equity / startCash - 1) * 100,
  };
}

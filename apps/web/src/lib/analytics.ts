import type { PaperRun } from "@/lib/paper-sim";

export interface PnlAnalytics {
  startEquity: number;
  endEquity: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number; // per-bar, non-annualized (matches the backend engine convention)
  volatilityPct: number; // stdev of per-bar returns
  winRateBars: number; // fraction of bars with a positive return
  bestBarPct: number;
  worstBarPct: number;
  numTrades: number;
  cumulativePnl: { time: number; pnl: number }[];
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Derive PnL / risk analytics from a paper run's equity curve and trades. */
export function computeAnalytics(run: PaperRun): PnlAnalytics {
  const curve = run.equityCurve;
  const start = curve.length ? curve[0]!.equity : 0;
  const end = curve.length ? curve[curve.length - 1]!.equity : start;

  const returns: number[] = [];
  let peak = start;
  let maxDrawdown = 0;
  for (let i = 0; i < curve.length; i++) {
    const eq = curve[i]!.equity;
    peak = Math.max(peak, eq);
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - eq) / peak);
    if (i > 0) {
      const prev = curve[i - 1]!.equity;
      if (prev !== 0) returns.push(eq / prev - 1);
    }
  }

  const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const sigma = stdev(returns);
  const wins = returns.filter((r) => r > 0).length;

  return {
    startEquity: start,
    endEquity: end,
    totalReturnPct: start > 0 ? (end / start - 1) * 100 : 0,
    maxDrawdownPct: maxDrawdown * 100,
    sharpe: sigma > 0 ? mean / sigma : 0,
    volatilityPct: sigma * 100,
    winRateBars: returns.length ? wins / returns.length : 0,
    bestBarPct: returns.length ? Math.max(...returns) * 100 : 0,
    worstBarPct: returns.length ? Math.min(...returns) * 100 : 0,
    numTrades: run.trades.length,
    cumulativePnl: curve.map((p) => ({ time: p.time, pnl: p.equity - start })),
  };
}

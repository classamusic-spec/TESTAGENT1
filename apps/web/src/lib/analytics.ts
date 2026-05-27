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
  bestBarTime: number;
  worstBarTime: number;
  numTrades: number;
  spanDays: number;
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
  let best = -Infinity;
  let worst = Infinity;
  let bestTime = curve[0]?.time ?? 0;
  let worstTime = curve[0]?.time ?? 0;
  for (let i = 0; i < curve.length; i++) {
    const eq = curve[i]!.equity;
    peak = Math.max(peak, eq);
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - eq) / peak);
    if (i > 0) {
      const prev = curve[i - 1]!.equity;
      if (prev !== 0) {
        const r = eq / prev - 1;
        returns.push(r);
        if (r > best) {
          best = r;
          bestTime = curve[i]!.time;
        }
        if (r < worst) {
          worst = r;
          worstTime = curve[i]!.time;
        }
      }
    }
  }

  const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const sigma = stdev(returns);
  const wins = returns.filter((r) => r > 0).length;
  const spanMs = curve.length ? curve[curve.length - 1]!.time - curve[0]!.time : 0;

  return {
    startEquity: start,
    endEquity: end,
    totalReturnPct: start > 0 ? (end / start - 1) * 100 : 0,
    maxDrawdownPct: maxDrawdown * 100,
    sharpe: sigma > 0 ? mean / sigma : 0,
    volatilityPct: sigma * 100,
    winRateBars: returns.length ? wins / returns.length : 0,
    bestBarPct: returns.length ? best * 100 : 0,
    worstBarPct: returns.length ? worst * 100 : 0,
    bestBarTime: bestTime,
    worstBarTime: worstTime,
    numTrades: run.trades.length,
    spanDays: spanMs / 86_400_000,
    cumulativePnl: curve.map((p) => ({ time: p.time, pnl: p.equity - start })),
  };
}

export interface FillRow {
  side: "buy" | "sell";
  price: number;
  notional: number;
  time: number;
  pnl: number;
  pnlPct: number;
}

/** Per-fill P&L approximated from the equity change over each holding interval. */
export function fillRows(run: PaperRun): FillRow[] {
  const curve = run.equityCurve;
  const eqAt = (t: number): number => {
    let e = curve[0]?.equity ?? 0;
    for (const p of curve) {
      if (p.time <= t) e = p.equity;
      else break;
    }
    return e;
  };
  const lastT = curve.length ? curve[curve.length - 1]!.time : 0;
  return run.trades.map((tr, i) => {
    const e0 = eqAt(tr.time);
    const tEnd = run.trades[i + 1]?.time ?? lastT;
    const pnl = eqAt(tEnd) - e0;
    const pnlPct = Math.abs(tr.notional) > 0 ? (pnl / Math.abs(tr.notional)) * 100 : 0;
    return { side: tr.side, price: tr.price, notional: tr.notional, time: tr.time, pnl, pnlPct };
  });
}

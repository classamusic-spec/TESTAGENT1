import type { AutoRun } from "@/lib/auto-trader";

/**
 * Combine several single-asset bot runs into an equal-weight portfolio,
 * rebalanced per bar (mirror of apps/api backtest/portfolio.py). Diversifying
 * across assets lowers volatility and drawdown vs. any single asset.
 */
export interface PortfolioPoint {
  index: number;
  equity: number;
}

export interface PortfolioRun {
  curve: PortfolioPoint[];
  totalReturnPct: number;
  maxDrawdownPct: number;
  perAsset: { symbol: string; returnPct: number }[];
}

function returns(curve: { equity: number }[]): number[] {
  return curve.slice(1).map((p, i) => p.equity / curve[i]!.equity - 1);
}

export function combinePortfolio(runs: { symbol: string; run: AutoRun }[], startCash: number): PortfolioRun {
  if (runs.length === 0) {
    return { curve: [{ index: 0, equity: startCash }], totalReturnPct: 0, maxDrawdownPct: 0, perAsset: [] };
  }
  const perReturns = runs.map((r) => returns(r.run.steps.map((s) => ({ equity: s.equity }))));
  const horizon = Math.min(...perReturns.map((r) => r.length));
  const w = 1 / runs.length;

  let equity = startCash;
  let peak = startCash;
  let maxDd = 0;
  const curve: PortfolioPoint[] = [{ index: 0, equity }];
  for (let t = 0; t < horizon; t++) {
    const bar = perReturns.reduce((a, r) => a + w * r[t]!, 0);
    equity *= 1 + bar;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, (peak - equity) / peak);
    curve.push({ index: t + 1, equity });
  }
  return {
    curve,
    totalReturnPct: (equity / startCash - 1) * 100,
    maxDrawdownPct: maxDd * 100,
    perAsset: runs.map((r) => ({ symbol: r.symbol, returnPct: r.run.summary.totalReturnPct })),
  };
}

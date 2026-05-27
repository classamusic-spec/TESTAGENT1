"""Cross-sectional rotation sweep with a Deflated-Sharpe robustness check.

Sweeps score variants x rebalance frequency x long/short breadth on real
multi-asset data, then applies the Deflated Sharpe Ratio to the BEST config —
correcting for the fact that trying many configs inflates the best Sharpe by
chance. A low DSR means "the winner is probably an artifact of the search," not
a real edge. Honest by construction.

Usage (from apps/api):  python -m scripts.rotation_sweep
"""

from __future__ import annotations

from loguru import logger

from src.backtest.cross_sectional import run_cross_sectional
from src.backtest.costs import CostModel
from src.backtest.deflated_sharpe import deflated_sharpe_ratio
from src.data.resample import resample
from src.signals.cross_sectional import CrossSectionalConfig, make_score_fn

logger.remove()

SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LINKUSDT"]
COST = CostModel(fee_bps=10, slippage_bps=5)


def main() -> None:
    from scripts.real_data_test import load_candles

    raw = {s: resample(load_candles(s, 8000), 4) for s in SYMBOLS}  # 4h bars
    n = min(len(v) for v in raw.values())
    assets = {s: v[-n:] for s, v in raw.items()}
    days = n * 4 / 24
    print(f"Rotation sweep on {len(SYMBOLS)} coins, {n} 4h bars (~{days:.0f}d), 0.30% round-trip\n")

    grid = []
    for kind in ("momentum", "risk_adjusted"):
        for lb in (6, 12, 24):
            for every, every_label in ((6, "1d"), (18, "3d"), (42, "wk")):
                for k in (1, 2, 3):
                    grid.append((kind, lb, every, every_label, k))

    rows = []
    for kind, lb, every, every_label, k in grid:
        r = run_cross_sectional(
            assets, make_score_fn(kind, lb), COST,
            CrossSectionalConfig(long_k=k, short_k=k), rebalance_every=every, start=30,
        )
        rows.append({"label": f"{kind[:4]} lb{lb} {every_label} k{k}", "res": r, "sharpe": r.sharpe})

    rows.sort(key=lambda x: x["sharpe"], reverse=True)
    sharpes = [x["sharpe"] for x in rows]
    print("Top configs by per-bar Sharpe:")
    for x in rows[:6]:
        r = x["res"]
        daily = ((1 + r.total_return) ** (1 / days) - 1) * 100
        print(f"  {x['label']:<22} net {r.total_return * 100:+7.2f}%  sharpe {r.sharpe:+.3f}  maxDD {r.max_drawdown * 100:5.1f}%  rebals {r.n_rebalances:4d}  avg/day {daily:+.3f}%")

    best = rows[0]["res"]
    dsr = deflated_sharpe_ratio(best.sharpe, sharpes, best.n_bars)
    print(f"\nBest of {len(rows)} configs: sharpe {best.sharpe:+.3f}")
    print(f"Deflated Sharpe Ratio (P[true edge survives the search]): {dsr:.3f}")
    print("VERDICT:", "ROBUST edge (DSR > 0.95)" if dsr > 0.95 else "NOT robust — likely a search artifact, do not trade")


if __name__ == "__main__":
    main()

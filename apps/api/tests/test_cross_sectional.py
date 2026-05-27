from __future__ import annotations

import pytest

from src.backtest.cross_sectional import run_cross_sectional
from src.backtest.costs import CostModel
from src.data.ohlcv import Candle
from src.signals.cross_sectional import (
    CrossSectionalConfig,
    make_score_fn,
    momentum_score,
    rank_and_allocate,
    risk_adjusted_momentum,
)

STEP = 3_600_000


def _series(closes: list[float]) -> list[Candle]:
    return [
        Candle(open_time=i * STEP, open=c, high=c * 1.001, low=c * 0.999, close=c, volume=1.0, closed=True)
        for i, c in enumerate(closes)
    ]


# --- allocator -----------------------------------------------------------------


def test_long_top_short_bottom_dollar_neutral() -> None:
    scores = {"A": 0.9, "B": 0.7, "C": 0.5, "D": 0.3, "E": 0.1}
    w = rank_and_allocate(scores, CrossSectionalConfig(long_k=2, short_k=2))
    assert w["A"] > 0 and w["B"] > 0  # top two long
    assert w["D"] < 0 and w["E"] < 0  # bottom two short
    assert w["C"] == 0.0  # middle excluded
    assert abs(sum(w.values())) < 1e-9  # dollar-neutral
    assert sum(abs(v) for v in w.values()) == pytest.approx(1.0)  # gross 1.0


def test_long_only_when_short_disabled() -> None:
    scores = {"A": 0.9, "B": 0.6, "C": 0.2}
    w = rank_and_allocate(scores, CrossSectionalConfig(long_k=2, short_k=2, allow_short=False))
    assert all(v >= 0 for v in w.values())
    assert sum(w.values()) == pytest.approx(1.0)


def test_invalid_config() -> None:
    with pytest.raises(ValueError):
        CrossSectionalConfig(long_k=0, short_k=0)


# --- scoring -------------------------------------------------------------------


def test_momentum_score_sign() -> None:
    up = _series([100 + i for i in range(30)])
    down = _series([100 - i for i in range(30)])
    assert momentum_score(up, 6) > 0
    assert momentum_score(down, 6) < 0


def test_risk_adjusted_normalizes_by_vol() -> None:
    # Same momentum, different volatility -> calmer series scores higher.
    calm = _series([100 + 0.5 * i for i in range(40)])
    wild = _series([100 + 0.5 * i + 6 * ((-1) ** i) for i in range(40)])
    assert risk_adjusted_momentum(calm, 6) > risk_adjusted_momentum(wild, 6)


def test_make_score_fn() -> None:
    up = _series([100 * 1.01**i for i in range(40)])
    assert make_score_fn("momentum", 6)(up) > 0
    assert make_score_fn("risk_adjusted", 6)(up) > 0


# --- backtest ------------------------------------------------------------------


def _winner_forecast(context):  # type: ignore[no-untyped-def]
    # Score by recent momentum (a real cross-sectional signal): last vs 6 ago.
    if len(context) < 7:
        return 0.5
    return context[-1].close / context[-7].close


def test_rotation_runs_and_books_costs() -> None:
    assets = {
        "UP": _series([100 * 1.01**i for i in range(200)]),
        "DOWN": _series([100 * 0.99**i for i in range(200)]),
        "FLAT": _series([100 + (i % 3) for i in range(200)]),
        "CHOP": _series([100 + 5 * ((-1) ** i) for i in range(200)]),
    }
    res = run_cross_sectional(
        assets, _winner_forecast, CostModel(fee_bps=10, slippage_bps=5),
        CrossSectionalConfig(long_k=1, short_k=1), rebalance_every=6, start=20,
    )
    assert res.n_bars > 0
    assert res.n_rebalances > 0
    # Longing the persistent winner and shorting the loser should beat random:
    # gross return is positive on this separable setup.
    assert res.gross_return > 0
    assert res.total_costs > 0


def test_less_frequent_rebalancing_costs_less() -> None:
    assets = {
        "A": _series([100 * 1.005**i for i in range(300)]),
        "B": _series([100 * 0.995**i for i in range(300)]),
    }
    cost = CostModel(fee_bps=10, slippage_bps=5)
    cfg = CrossSectionalConfig(long_k=1, short_k=1)
    frequent = run_cross_sectional(assets, _winner_forecast, cost, cfg, rebalance_every=1, start=20)
    rare = run_cross_sectional(assets, _winner_forecast, cost, cfg, rebalance_every=20, start=20)
    assert rare.total_costs <= frequent.total_costs
    assert rare.n_rebalances <= frequent.n_rebalances


def test_requires_assets() -> None:
    with pytest.raises(ValueError):
        run_cross_sectional({}, _winner_forecast, CostModel(0, 0))

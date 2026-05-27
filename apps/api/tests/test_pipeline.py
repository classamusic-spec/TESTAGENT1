from __future__ import annotations

import pytest

from src.backtest.costs import CostModel
from src.backtest.engine import run_backtest
from src.backtest.folds import make_walk_forward_folds
from src.data.ohlcv import Candle
from src.signals.aggregate import aggregate_probabilities, temperature_scale
from src.signals.factors import FactorConfig
from src.signals.filters import FilterConfig, default_filters
from src.signals.pipeline import decide
from src.signals.policy import SignalConfig

STEP = 3_600_000


def _candles(rows: list[tuple[float, float, float]]) -> list[Candle]:
    return [
        Candle(open_time=i * STEP, open=c, high=h, low=low, close=c, volume=1.0, closed=True)
        for i, (h, low, c) in enumerate(rows)
    ]


def _trend(n: int) -> list[Candle]:
    return _candles([(100 * 1.01**i * 1.002, 100 * 1.01**i * 0.999, 100 * 1.01**i) for i in range(n)])


def _flat(n: int) -> list[Candle]:
    return _candles([(100.0, 100.0, 100.0) for _ in range(n)])


def _trend_small(n: int) -> list[Candle]:
    # Gentle drift with a small intrabar range (low expected move per bar).
    return _candles([(100 * 1.001**i * 1.001, 100 * 1.001**i * 0.999, 100 * 1.001**i) for i in range(n)])


def test_decide_passes_clean_long() -> None:
    cfg = FilterConfig(min_atr_pct=0.0, max_atr_pct=1.0, min_adx=5.0, block_high_vol_regime=False)
    d = decide(_trend(40), 0.8, signal_config=SignalConfig(), filters=default_filters(cfg))
    assert d.side == "long"
    assert d.vetoes == []


def test_decide_vetoes_in_dead_market() -> None:
    d = decide(_flat(40), 0.9, filters=default_filters())
    assert d.side == "flat"
    assert len(d.vetoes) >= 1


def test_factor_blend_adjusts_pup() -> None:
    candles = _trend(40)
    d = decide(candles, 0.55, factor_config=FactorConfig(momentum_weight=1.0, kronos_weight=0.0, reversion_weight=0.0))
    # Strong uptrend momentum pushes the adjusted probability above the raw one.
    assert d.adjusted_pup > 0.5
    assert d.raw_pup == 0.55


# --- aggregation ---------------------------------------------------------------


def test_aggregate_average_and_weights() -> None:
    assert aggregate_probabilities([0.4, 0.6]) == pytest.approx(0.5)
    assert aggregate_probabilities([0.2, 0.8], [3, 1]) == pytest.approx((0.2 * 3 + 0.8) / 4)


def test_aggregate_clamps_and_validates() -> None:
    assert 0.0 <= aggregate_probabilities([0.9, 0.95, 0.99]) <= 1.0
    with pytest.raises(ValueError):
        aggregate_probabilities([])


def test_temperature_scaling() -> None:
    assert temperature_scale(0.8, 1.0) == pytest.approx(0.8, abs=1e-6)  # no-op
    assert temperature_scale(0.8, 2.0) < 0.8  # softer -> toward 0.5
    assert temperature_scale(0.8, 0.5) > 0.8  # sharper -> toward 1


def test_filters_suppress_trades_in_dead_market() -> None:
    candles = _flat(120)
    folds = make_walk_forward_folds(len(candles), train_size=40, test_size=20)

    def always_long(_ctx):
        return 0.9

    base = run_backtest(candles, folds, always_long, CostModel(0, 0))
    filtered = run_backtest(candles, folds, always_long, CostModel(0, 0), filters=default_filters())
    assert base.n_trades >= 1  # unfiltered opens a position
    assert filtered.n_trades == 0  # filters veto every entry in a dead market
    assert filtered.n_trades <= base.n_trades


def test_cost_filter_suppresses_tiny_edge_trades() -> None:
    # Gentle drift -> small expected move; heavy costs -> cost gate should veto.
    candles = _trend_small(160)
    folds = make_walk_forward_folds(len(candles), train_size=60, test_size=30)

    def mild_long(_ctx):
        return 0.6  # clears threshold but a weak edge

    base = run_backtest(candles, folds, mild_long, CostModel(fee_bps=20, slippage_bps=10))
    gated = run_backtest(
        candles, folds, mild_long, CostModel(fee_bps=20, slippage_bps=10), cost_filter=True, cost_margin=2.0
    )
    assert gated.n_trades <= base.n_trades

from __future__ import annotations

from typing import Sequence

import pytest

from src.backtest.costs import CostModel
from src.backtest.engine import run_backtest
from src.backtest.folds import Fold, collect_test_indices, make_walk_forward_folds
from src.data.ohlcv import Candle

STEP = 3_600_000


def _candles(closes: Sequence[float]) -> list[Candle]:
    return [
        Candle(
            open_time=i * STEP,
            open=c,
            high=c,
            low=c,
            close=c,
            volume=1.0,
            closed=True,
        )
        for i, c in enumerate(closes)
    ]


# --- folds ------------------------------------------------------------------


def test_folds_place_test_strictly_after_train() -> None:
    folds = make_walk_forward_folds(n_samples=100, train_size=40, test_size=20)
    assert len(folds) >= 1
    for fold in folds:
        assert fold.train[1] == fold.test[0]  # contiguous
        assert fold.train[0] < fold.train[1] <= fold.test[0] < fold.test[1]


def test_default_step_gives_non_overlapping_tests() -> None:
    folds = make_walk_forward_folds(n_samples=100, train_size=40, test_size=20)
    seen: list[int] = []
    for fold in folds:
        seen.extend(range(*fold.test))
    assert len(seen) == len(set(seen))  # no bar tested twice


def test_too_little_data_raises() -> None:
    with pytest.raises(ValueError):
        make_walk_forward_folds(n_samples=10, train_size=40, test_size=20)


def test_indices_dedupes_overlapping_folds() -> None:
    folds = [Fold(train=(0, 2), test=(2, 5)), Fold(train=(1, 3), test=(3, 6))]
    assert collect_test_indices(folds) == [2, 3, 4, 5]


# --- engine: look-ahead guard (invariants 1 & 8) ----------------------------


def test_engine_never_shows_future_data_to_forecaster() -> None:
    candles = _candles([100.0 + i for i in range(30)])
    folds = make_walk_forward_folds(n_samples=30, train_size=10, test_size=10)
    decision_bars: list[int] = []

    def spy(context: Sequence[Candle]) -> float:
        # The forecaster must only ever see candles up to the decision bar.
        # Record the latest open_time it was given.
        decision_bars.append(context[-1].open_time)
        # It must never receive a candle at/after the bar it is predicting.
        assert context[-1].open_time == (len(context) - 1) * STEP
        return 0.5

    run_backtest(candles, folds, spy, CostModel())
    # The last decision bar cannot be the final candle (need t+1 to realize).
    assert max(decision_bars) <= (len(candles) - 2) * STEP


# --- engine: costs reduce returns (invariant 9) -----------------------------


def test_costs_make_net_worse_than_gross() -> None:
    candles = _candles([100.0 * (1.01**i) for i in range(30)])  # steady rise
    folds = make_walk_forward_folds(n_samples=30, train_size=10, test_size=10)

    always_long = lambda _context: 1.0  # noqa: E731 - tiny test stub
    result = run_backtest(candles, folds, always_long, CostModel(fee_bps=10, slippage_bps=5))

    assert result.n_trades == 1  # enter once, then hold
    assert result.total_costs > 0
    assert result.total_return < result.gross_return
    assert result.final_equity > 1.0  # rising market, still profitable net


def test_flipping_pays_more_costs() -> None:
    candles = _candles([100.0 + (i % 2) for i in range(30)])
    folds = make_walk_forward_folds(n_samples=30, train_size=10, test_size=10)

    flips = [0.9, 0.1]
    counter = {"i": 0}

    def alternating(_context: Sequence[Candle]) -> float:
        value = flips[counter["i"] % 2]
        counter["i"] += 1
        return value

    result = run_backtest(candles, folds, alternating, CostModel())
    assert result.n_trades > 1
    assert result.total_costs > 0


def test_flat_strategy_has_no_trades_or_pnl() -> None:
    candles = _candles([100.0 + i for i in range(30)])
    folds = make_walk_forward_folds(n_samples=30, train_size=10, test_size=10)

    result = run_backtest(candles, folds, lambda _c: 0.5, CostModel())
    assert result.n_trades == 0
    assert result.total_costs == 0.0
    assert result.total_return == pytest.approx(0.0)
    assert result.max_drawdown == pytest.approx(0.0)

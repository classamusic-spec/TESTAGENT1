from __future__ import annotations

import pytest

from src.backtest.costs import CostModel
from src.backtest.engine import run_backtest
from src.backtest.folds import make_walk_forward_folds
from src.backtest.metrics import trade_expectancy
from src.backtest.portfolio import combine_portfolio
from src.data.ohlcv import Candle
from src.data.resample import resample, resample_to
from src.model.ensemble import make_ensemble_forecast_fn, train_ensemble

STEP = 3_600_000


def _candles(closes: list[float]) -> list[Candle]:
    out = []
    for i, c in enumerate(closes):
        prev = closes[i - 1] if i > 0 else c
        out.append(Candle(open_time=i * STEP, open=prev, high=max(c, prev) * 1.003, low=min(c, prev) * 0.997, close=c, volume=2.0, closed=True))
    return out


# --- #1 resample ---------------------------------------------------------------


def test_resample_aggregates_ohlcv() -> None:
    candles = _candles([100, 110, 90, 105, 120, 95])  # 6 bars -> 2 of factor 3
    agg = resample(candles, 3)
    assert len(agg) == 2
    assert agg[0].open == candles[0].open
    assert agg[0].close == candles[2].close
    assert agg[0].high == max(c.high for c in candles[:3])
    assert agg[0].low == min(c.low for c in candles[:3])
    assert agg[0].volume == pytest.approx(sum(c.volume for c in candles[:3]))


def test_resample_to_hour_to_day() -> None:
    candles = _candles([100 + i for i in range(48)])
    daily = resample_to(candles, "1h", "1d")
    assert len(daily) == 2  # 48 hourly -> 2 daily
    with pytest.raises(ValueError):
        resample_to(candles, "1d", "1h")  # can't downsample


# --- #2 ensemble ---------------------------------------------------------------


def test_ensemble_trains_and_predicts_in_range() -> None:
    candles = _candles([100 * 1.005**i for i in range(160)])
    model = train_ensemble(candles, horizons=(6, 12), epochs=200)
    assert len(model.models) == 2
    p = model.predict_proba(candles[:120])
    assert 0.0 <= p <= 1.0


def test_ensemble_runs_in_backtest() -> None:
    candles = _candles([100 * 1.004**i for i in range(200)])
    model = train_ensemble(candles[:80], horizons=(6, 12), epochs=150)
    fn = make_ensemble_forecast_fn(model)
    folds = make_walk_forward_folds(len(candles), train_size=80, test_size=40)
    res = run_backtest(candles, folds, fn, CostModel(0, 0))
    assert res.n_bars > 0


# --- #3 expectancy -------------------------------------------------------------


def test_expectancy_rewards_good_reward_risk() -> None:
    # 40% win rate but 3:1 reward:risk => positive expectancy.
    pnls = [30, 30, -10, -10, -10]  # 2 wins of 30, 3 losses of 10
    stats = trade_expectancy(pnls)
    assert stats.win_rate == pytest.approx(0.4)
    assert stats.reward_risk == pytest.approx(3.0)
    assert stats.expectancy > 0
    assert stats.profit_factor == pytest.approx(60 / 30)


def test_expectancy_negative_for_bad_reward_risk() -> None:
    # 80% win rate but tiny wins vs big losses => negative expectancy.
    pnls = [1, 1, 1, 1, -10]
    stats = trade_expectancy(pnls)
    assert stats.win_rate == pytest.approx(0.8)
    assert stats.expectancy < 0


def test_expectancy_empty() -> None:
    assert trade_expectancy([]).n == 0


# --- #6 portfolio --------------------------------------------------------------


def test_portfolio_diversification_lowers_risk() -> None:
    # Two anti-correlated assets -> portfolio is steadier than either alone.
    up = _candles([100 + i for i in range(120)])
    chop = _candles([100 + 8 * ((-1) ** i) for i in range(120)])
    folds = make_walk_forward_folds(120, train_size=40, test_size=20)

    def long_bias(_ctx):
        return 0.7

    ra = run_backtest(up, folds, long_bias, CostModel(0, 0))
    rb = run_backtest(chop, folds, long_bias, CostModel(0, 0))
    port = combine_portfolio({"UP": ra, "CHOP": rb})
    assert port.n_bars > 0
    assert set(port.per_asset_return) == {"UP", "CHOP"}
    # Portfolio drawdown is no worse than the worst single asset.
    assert port.max_drawdown <= max(ra.max_drawdown, rb.max_drawdown) + 1e-9


def test_portfolio_requires_assets() -> None:
    with pytest.raises(ValueError):
        combine_portfolio({})

from __future__ import annotations

import pytest

from src.data.ohlcv import Candle
from src.improve.calibration import CalibrationBin, CalibrationReport
from src.signals.calibrated_sizing import calibrated_position_fraction, reliability_factor
from src.signals.cost_filter import expected_move_pct, round_trip_cost_pct, survives_costs
from src.signals.pipeline import decide
from src.signals.sizing import SizingConfig

STEP = 3_600_000


def _candles(closes: list[float]) -> list[Candle]:
    return [
        Candle(open_time=i * STEP, open=c, high=c * 1.01, low=c * 0.99, close=c, volume=1.0, closed=True)
        for i, c in enumerate(closes)
    ]


# --- cost filter ---------------------------------------------------------------


def test_round_trip_cost() -> None:
    assert round_trip_cost_pct(15.0) == pytest.approx(0.003)  # 15bps each leg


def test_survives_costs() -> None:
    # round-trip cost = 0.003; with margin 1.0 the edge must clear 0.006.
    assert survives_costs(0.01, 15.0, margin=1.0) is True
    assert survives_costs(0.004, 15.0, margin=1.0) is False


def test_expected_move_sign_and_scale() -> None:
    assert expected_move_pct(0.7, 0.02) > 0  # bullish edge
    assert expected_move_pct(0.3, 0.02) < 0  # bearish edge
    assert expected_move_pct(0.5, 0.02) == 0.0


def test_pipeline_vetoes_below_cost() -> None:
    candles = _candles([100 + i for i in range(40)])
    # Signal clears the long threshold (0.6) but the tiny expected move can't
    # clear the round-trip cost -> cost gate vetoes it.
    d = decide(candles, 0.6, cost_bps=15.0, typical_move_pct=0.003, cost_margin=1.0)
    assert d.side == "flat"
    assert "below cost threshold" in d.vetoes
    # A strong edge clears costs and survives.
    d2 = decide(candles, 0.85, cost_bps=15.0, typical_move_pct=0.02, cost_margin=1.0)
    assert d2.side == "long"


# --- calibrated sizing ---------------------------------------------------------


def _report(predicted: float, empirical: float, count: int) -> CalibrationReport:
    return CalibrationReport(
        bins=[CalibrationBin(lower=0.6, upper=0.7, predicted_mean=predicted, empirical_rate=empirical, count=count)],
        expected_calibration_error=abs(predicted - empirical),
        brier_score=0.2,
        n=count,
    )


def test_reliability_factor_full_when_calibrated() -> None:
    assert reliability_factor(0.65, _report(0.65, 0.65, 100)) == pytest.approx(1.0)


def test_reliability_factor_shrinks_when_miscalibrated() -> None:
    assert reliability_factor(0.65, _report(0.65, 0.35, 100)) < 1.0


def test_reliability_floor_for_thin_or_unseen_bins() -> None:
    assert reliability_factor(0.65, _report(0.65, 0.65, 3), floor=0.2) == 0.2  # too few samples
    assert reliability_factor(0.05, _report(0.65, 0.65, 100), floor=0.2) == 0.2  # no matching bin


def test_calibrated_fraction_scales_base() -> None:
    candles = _candles([100 + (i % 4) for i in range(40)])
    cfg = SizingConfig(target_vol=0.01, kelly_fraction=1.0)
    calibrated = calibrated_position_fraction(0.65, candles, _report(0.65, 0.45, 100), cfg)
    from src.signals.sizing import position_fraction

    base = position_fraction(0.65, candles, cfg)
    assert abs(calibrated) <= abs(base)  # reliability can only shrink

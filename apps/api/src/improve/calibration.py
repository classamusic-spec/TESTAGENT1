"""Calibration tracking: when the model says p_up=0.7, does it close up ~70%?"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from src.backtest.engine import ForecastFn
from src.data.ohlcv import Candle


@dataclass(frozen=True)
class CalibrationBin:
    lower: float
    upper: float
    predicted_mean: float
    empirical_rate: float
    count: int


@dataclass(frozen=True)
class CalibrationReport:
    bins: list[CalibrationBin]
    expected_calibration_error: float  # ECE, lower is better
    brier_score: float  # mean squared error of probabilities, lower is better
    n: int


def collect_predictions(
    candles: Sequence[Candle], forecast_fn: ForecastFn, start: int
) -> list[tuple[float, bool]]:
    """Return (p_up, went_up) pairs using only past candles for each prediction."""
    pairs: list[tuple[float, bool]] = []
    for t in range(start, len(candles) - 1):
        p_up = forecast_fn(candles[: t + 1])
        went_up = candles[t + 1].close > candles[t].close
        pairs.append((p_up, went_up))
    return pairs


def calibration_report(predictions: Sequence[tuple[float, bool]], n_bins: int = 10) -> CalibrationReport:
    if not predictions:
        raise ValueError("no predictions to calibrate")

    buckets: list[list[tuple[float, bool]]] = [[] for _ in range(n_bins)]
    for p, outcome in predictions:
        idx = min(int(p * n_bins), n_bins - 1)
        buckets[idx].append((p, outcome))

    total = len(predictions)
    bins: list[CalibrationBin] = []
    ece = 0.0
    for i, bucket in enumerate(buckets):
        if not bucket:
            continue
        predicted_mean = sum(p for p, _ in bucket) / len(bucket)
        empirical_rate = sum(1 for _, o in bucket if o) / len(bucket)
        bins.append(
            CalibrationBin(
                lower=i / n_bins,
                upper=(i + 1) / n_bins,
                predicted_mean=predicted_mean,
                empirical_rate=empirical_rate,
                count=len(bucket),
            )
        )
        ece += (len(bucket) / total) * abs(predicted_mean - empirical_rate)

    brier = sum((p - (1.0 if o else 0.0)) ** 2 for p, o in predictions) / total
    return CalibrationReport(bins=bins, expected_calibration_error=ece, brier_score=brier, n=total)

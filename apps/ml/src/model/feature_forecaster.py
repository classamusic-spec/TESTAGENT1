"""Trained-model forecaster: a real (logistic) p_up served behind the seam.

This is the production-shaped, GPU-free model: it derives p_up from engineered
features via a trained logistic model (weights persisted as JSON), and projects
the prediction interval from recent drift/volatility. It implements the same
Forecaster protocol as the stub and Kronos backends, so it is swappable by
config — the real Kronos transformer can replace it later with no API change.
"""

from __future__ import annotations

import math
import statistics
import time

from src.contracts import Candle, Forecast, ForecastStep
from src.model.base import interval_to_ms
from src.model.features import compute_features
from src.model.logistic import LogisticModel

_Z_80 = 1.2816
_RETURN_WINDOW = 50


class FeatureForecaster:
    name = "feature-0.1"

    def __init__(self, model: LogisticModel | None = None) -> None:
        self.model = model

    @classmethod
    def load(cls, weights_path: str) -> "FeatureForecaster":
        return cls(LogisticModel.load(weights_path) if weights_path else None)

    def forecast(self, pair: str, interval: str, candles: list[Candle], horizon: int) -> Forecast:
        if len(candles) < 2:
            raise ValueError("at least two candles are required to forecast")
        if horizon < 1:
            raise ValueError("horizon must be >= 1")

        closes = [c.close for c in candles]
        returns = [closes[i] / closes[i - 1] - 1.0 for i in range(1, len(closes))]
        window = returns[-_RETURN_WINDOW:]
        mu = statistics.fmean(window)
        sigma = statistics.pstdev(window) if len(window) > 1 else 0.0

        # p_up from the trained model (falls back to a neutral 0.5 if unloaded).
        p_up = self.model.predict_proba(compute_features(candles)) if self.model else 0.5
        # Tilt the projected drift toward the model's directional conviction.
        edge = (p_up - 0.5) * 2.0
        drift = mu + edge * (sigma if sigma > 0 else abs(mu))

        last = candles[-1]
        step_ms = interval_to_ms(interval)
        steps: list[ForecastStep] = []
        for k in range(1, horizon + 1):
            median = last.close * (1.0 + drift) ** k
            band = median * _Z_80 * sigma * math.sqrt(k)
            steps.append(
                ForecastStep(
                    open_time=last.open_time + k * step_ms,
                    close=median,
                    lower=median - band,
                    upper=median + band,
                )
            )

        version = self.name if self.model else f"{self.name}-untrained"
        return Forecast(
            pair=pair,
            interval=interval,
            model_version=version,
            generated_at=int(time.time() * 1000),
            based_on_candle_time=last.open_time,
            steps=steps,
            p_up=p_up,
        )

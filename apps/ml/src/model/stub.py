"""Deterministic stub forecaster for development and tests.

Projects a simple drift/volatility model from recent closed-candle returns. It
is NOT a trading model — it exists so the rest of the system (API, dashboard,
paper loop) can be built and tested without a GPU. The real model lives in
`KronosForecaster`.
"""

from __future__ import annotations

import math
import statistics
import time

from src.contracts import Candle, Forecast, ForecastStep
from src.model.base import interval_to_ms

# One-sided z for an ~80% central prediction interval.
_Z_80 = 1.2816
_RETURN_WINDOW = 50


class StubForecaster:
    name = "stub-0.1"

    def forecast(
        self,
        pair: str,
        interval: str,
        candles: list[Candle],
        horizon: int,
    ) -> Forecast:
        if len(candles) < 2:
            raise ValueError("at least two candles are required to forecast")
        if horizon < 1:
            raise ValueError("horizon must be >= 1")

        closes = [c.close for c in candles]
        returns = [closes[i] / closes[i - 1] - 1.0 for i in range(1, len(closes))]
        window = returns[-_RETURN_WINDOW:]
        mu = statistics.fmean(window)
        sigma = statistics.pstdev(window) if len(window) > 1 else 0.0

        last = candles[-1]
        step_ms = interval_to_ms(interval)
        steps: list[ForecastStep] = []
        for k in range(1, horizon + 1):
            median = last.close * (1.0 + mu) ** k
            band = median * _Z_80 * sigma * math.sqrt(k)
            steps.append(
                ForecastStep(
                    open_time=last.open_time + k * step_ms,
                    close=median,
                    lower=median - band,
                    upper=median + band,
                )
            )

        p_up = 1.0 / (1.0 + math.exp(-mu / sigma)) if sigma > 0 else 0.5

        return Forecast(
            pair=pair,
            interval=interval,
            model_version=self.name,
            generated_at=int(time.time() * 1000),
            based_on_candle_time=last.open_time,
            steps=steps,
            p_up=p_up,
        )

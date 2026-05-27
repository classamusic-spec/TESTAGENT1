"""Forecasting model layer.

`Forecaster` is the seam every backend implements. Tests and development use
`StubForecaster` (deterministic, no GPU). `KronosForecaster` wraps the real
model and is selected via configuration. Per invariant 1, every implementation
must consume closed candles only — the API enforces this before calling in.
"""

from __future__ import annotations

from src.config import settings
from src.model.base import Forecaster
from src.model.feature_forecaster import FeatureForecaster
from src.model.kronos import KronosForecaster
from src.model.stub import StubForecaster

__all__ = [
    "Forecaster",
    "FeatureForecaster",
    "KronosForecaster",
    "StubForecaster",
    "get_forecaster",
]


def get_forecaster() -> Forecaster:
    if settings.kronos_backend == "kronos":
        return KronosForecaster(checkpoint=settings.kronos_checkpoint)
    if settings.kronos_backend == "feature":
        return FeatureForecaster.load(settings.model_weights_path)
    return StubForecaster()

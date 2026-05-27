"""Ensemble of logistic forecasters across multiple barrier horizons.

Blending several models trained on different horizons reduces single-model
variance and gives a steadier p_up than any one head (the aggregation uses the
calibrated-blend helper). Still a deterministic forecasting model — no RL/LLM in
the decision path. The full Kronos transformer remains the GPU track in apps/ml;
this is the in-repo ensemble we can train and validate anywhere.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Sequence

from src.data.ohlcv import Candle
from src.model.forecaster import LogisticForecaster, build_dataset, fit_logistic
from src.signals.aggregate import aggregate_probabilities
from src.signals.features import FeatureConfig, compute_features
from src.signals.labels import BarrierConfig


@dataclass(frozen=True)
class EnsembleForecaster:
    models: list[LogisticForecaster]
    feature_config: FeatureConfig
    weights: list[float] | None = None

    def predict_proba(self, candles: Sequence[Candle]) -> float:
        feats = compute_features(candles, self.feature_config)
        probs = [m.predict_proba(feats) for m in self.models]
        return aggregate_probabilities(probs, self.weights)


def train_ensemble(
    candles: Sequence[Candle],
    horizons: Sequence[int] = (6, 12, 24),
    feature_config: FeatureConfig | None = None,
    weights: Sequence[float] | None = None,
    epochs: int = 400,
) -> EnsembleForecaster:
    """Train one logistic model per barrier horizon on the same features."""
    if not horizons:
        raise ValueError("need at least one horizon")
    fcfg = feature_config or FeatureConfig()
    models: list[LogisticForecaster] = []
    for h in horizons:
        rows, ys, keys = build_dataset(candles, fcfg, BarrierConfig(horizon=h))
        if not rows:
            continue
        models.append(fit_logistic(rows, ys, keys, epochs=epochs))
    if not models:
        raise ValueError("no horizon produced training data")
    return EnsembleForecaster(models, fcfg, list(weights) if weights else None)


def make_ensemble_forecast_fn(model: EnsembleForecaster) -> Callable[[Sequence[Candle]], float]:
    return lambda context: model.predict_proba(context)

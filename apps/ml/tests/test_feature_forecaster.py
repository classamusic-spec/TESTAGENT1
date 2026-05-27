from __future__ import annotations

import pytest

from src.contracts import Candle
from src.model import get_forecaster
from src.model.feature_forecaster import FeatureForecaster
from src.model.features import FEATURE_KEYS, compute_features
from src.model.logistic import LogisticModel, fit_logistic

STEP = 3_600_000


def _candles(closes: list[float]) -> list[Candle]:
    out = []
    for i, c in enumerate(closes):
        prev = closes[i - 1] if i > 0 else c
        out.append(Candle(openTime=i * STEP, open=prev, high=max(c, prev), low=min(c, prev), close=c, volume=1.0, closed=True))
    return out


def test_features_have_expected_keys() -> None:
    feats = compute_features(_candles([100 + i for i in range(40)]))
    assert set(feats) == set(FEATURE_KEYS)


def test_logistic_learns_and_persists(tmp_path) -> None:
    rows = [[2.0], [2.5], [3.0], [-2.0], [-2.5], [-3.0]]
    ys = [1, 1, 1, 0, 0, 0]
    model = fit_logistic(rows, ys, ["a"], epochs=500, lr=0.5)
    assert model.predict_proba({"a": 3.0}) > 0.7
    p = tmp_path / "w.json"
    model.save(p)
    loaded = LogisticModel.load(p)
    assert loaded is not None
    assert loaded.predict_proba({"a": 3.0}) == pytest.approx(model.predict_proba({"a": 3.0}))


def test_forecaster_untrained_is_neutral() -> None:
    fc = FeatureForecaster(model=None)
    out = fc.forecast("ETH/USDC", "1h", _candles([100 + i for i in range(40)]), horizon=12)
    assert out.p_up == 0.5
    assert len(out.steps) == 12
    assert "untrained" in out.model_version


def test_forecaster_with_model_returns_valid_forecast() -> None:
    rows, ys = [], []
    candles = _candles([100 * 1.01**i for i in range(120)])
    for i in range(24, len(candles) - 12):
        feats = compute_features(candles[: i + 1])
        rows.append([feats[k] for k in FEATURE_KEYS])
        ys.append(1 if candles[i + 12].close > candles[i].close else 0)
    model = fit_logistic(rows, ys, FEATURE_KEYS, epochs=200)
    out = FeatureForecaster(model).forecast("ETH/USDC", "1h", candles, horizon=8)
    assert 0.0 <= out.p_up <= 1.0
    assert len(out.steps) == 8
    assert out.model_version == "feature-0.1"


def test_get_forecaster_selects_feature_backend(monkeypatch) -> None:
    from src import config

    monkeypatch.setattr(config.settings, "kronos_backend", "feature")
    monkeypatch.setattr(config.settings, "model_weights_path", "")
    assert isinstance(get_forecaster(), FeatureForecaster)

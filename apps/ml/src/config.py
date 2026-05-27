"""ML service settings (pydantic-settings)."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=())

    # Which forecaster backend to use. "stub" is a deterministic projection for
    # development and tests; "feature" serves the in-repo trained logistic model
    # (GPU-free); "kronos" loads the real foundation model (requires torch+GPU).
    kronos_backend: str = "stub"
    # Default number of future steps to forecast.
    forecast_horizon: int = 12
    # Checkpoint identifier reported in forecasts (invariant 6 traceability).
    kronos_checkpoint: str = "NeoQuasar/Kronos-small"
    # Persisted weights for the "feature" backend (written by scripts/train.py).
    model_weights_path: str = "data/model_weights.json"


settings = Settings()

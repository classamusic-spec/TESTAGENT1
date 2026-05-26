"""ML service settings (pydantic-settings)."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=())

    # Which forecaster backend to use. "stub" is a deterministic projection for
    # development and tests; "kronos" loads the real model (requires torch+GPU).
    kronos_backend: str = "stub"
    # Default number of future steps to forecast.
    forecast_horizon: int = 12
    # Checkpoint identifier reported in forecasts (invariant 6 traceability).
    kronos_checkpoint: str = "NeoQuasar/Kronos-small"


settings = Settings()

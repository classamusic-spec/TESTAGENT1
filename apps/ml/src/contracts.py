"""Pydantic models for the forecast API.

These mirror the TypeScript contracts in packages/shared (single source of
truth for the wire format). JSON is camelCase to match the frontend; Python
attributes stay snake_case via an alias generator.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        protected_namespaces=(),
    )


class Candle(CamelModel):
    open_time: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    closed: bool


class ForecastStep(CamelModel):
    open_time: int
    close: float
    lower: float
    upper: float


class Forecast(CamelModel):
    pair: str
    interval: str
    model_version: str
    generated_at: int
    based_on_candle_time: int
    steps: list[ForecastStep]
    p_up: float


class ForecastRequest(CamelModel):
    interval: str
    horizon: int = 12
    candles: list[Candle]

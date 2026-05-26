"""SQLModel tables."""

from __future__ import annotations

from sqlmodel import Field, SQLModel, UniqueConstraint


class CandleRow(SQLModel, table=True):
    __tablename__ = "candles"
    __table_args__ = (UniqueConstraint("pair", "interval", "open_time", name="uq_candle"),)

    id: int | None = Field(default=None, primary_key=True)
    pair: str = Field(index=True)
    interval: str
    open_time: int = Field(index=True)
    open: float
    high: float
    low: float
    close: float
    volume: float
    closed: bool


class ForecastRow(SQLModel, table=True):
    __tablename__ = "forecasts"

    id: int | None = Field(default=None, primary_key=True)
    pair: str = Field(index=True)
    interval: str
    model_version: str
    generated_at: int = Field(index=True)
    based_on_candle_time: int
    p_up: float
    steps_json: str  # JSON-encoded list[ForecastStep]


class FillRow(SQLModel, table=True):
    __tablename__ = "fills"

    id: int | None = Field(default=None, primary_key=True)
    ts: int = Field(index=True)
    pair: str = Field(index=True)
    mode: str  # "paper" | "live"
    side: str  # "buy" | "sell"
    quantity: float
    price: float
    fee: float
    notional: float
    realized_pnl: float

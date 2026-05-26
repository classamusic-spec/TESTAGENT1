"""Repositories: the only place that translates domain <-> DB rows."""

from __future__ import annotations

import json

from sqlmodel import Session, select

from src.data.ohlcv import Candle
from src.db.models import CandleRow, FillRow, ForecastRow
from src.execution.models import Fill


class CandleRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def upsert_many(self, pair: str, interval: str, candles: list[Candle]) -> None:
        for candle in candles:
            existing = self.session.exec(
                select(CandleRow).where(
                    CandleRow.pair == pair,
                    CandleRow.interval == interval,
                    CandleRow.open_time == candle.open_time,
                )
            ).first()
            if existing is None:
                self.session.add(
                    CandleRow(
                        pair=pair,
                        interval=interval,
                        open_time=candle.open_time,
                        open=candle.open,
                        high=candle.high,
                        low=candle.low,
                        close=candle.close,
                        volume=candle.volume,
                        closed=candle.closed,
                    )
                )
            else:
                existing.close = candle.close
                existing.high = candle.high
                existing.low = candle.low
                existing.volume = candle.volume
                existing.closed = candle.closed
                self.session.add(existing)
        self.session.commit()

    def recent(self, pair: str, interval: str, limit: int = 200) -> list[Candle]:
        rows = self.session.exec(
            select(CandleRow)
            .where(CandleRow.pair == pair, CandleRow.interval == interval)
            .order_by(CandleRow.open_time.desc())  # type: ignore[attr-defined]
            .limit(limit)
        ).all()
        rows = sorted(rows, key=lambda r: r.open_time)
        return [
            Candle(
                open_time=r.open_time,
                open=r.open,
                high=r.high,
                low=r.low,
                close=r.close,
                volume=r.volume,
                closed=r.closed,
            )
            for r in rows
        ]


class ForecastRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, forecast: dict) -> None:
        self.session.add(
            ForecastRow(
                pair=forecast["pair"],
                interval=forecast["interval"],
                model_version=forecast["modelVersion"],
                generated_at=forecast["generatedAt"],
                based_on_candle_time=forecast["basedOnCandleTime"],
                p_up=forecast["pUp"],
                steps_json=json.dumps(forecast["steps"]),
            )
        )
        self.session.commit()

    def latest(self, pair: str) -> dict | None:
        row = self.session.exec(
            select(ForecastRow)
            .where(ForecastRow.pair == pair)
            .order_by(ForecastRow.generated_at.desc())  # type: ignore[attr-defined]
        ).first()
        if row is None:
            return None
        return {
            "pair": row.pair,
            "interval": row.interval,
            "modelVersion": row.model_version,
            "generatedAt": row.generated_at,
            "basedOnCandleTime": row.based_on_candle_time,
            "pUp": row.p_up,
            "steps": json.loads(row.steps_json),
        }


class FillRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, fill: Fill, mode: str) -> None:
        self.session.add(
            FillRow(
                ts=fill.ts,
                pair=fill.pair,
                mode=mode,
                side=fill.side,
                quantity=fill.quantity,
                price=fill.price,
                fee=fill.fee,
                notional=fill.notional,
                realized_pnl=fill.realized_pnl,
            )
        )
        self.session.commit()

    def recent(self, pair: str, limit: int = 50) -> list[FillRow]:
        return list(
            self.session.exec(
                select(FillRow)
                .where(FillRow.pair == pair)
                .order_by(FillRow.ts.desc())  # type: ignore[attr-defined]
                .limit(limit)
            ).all()
        )

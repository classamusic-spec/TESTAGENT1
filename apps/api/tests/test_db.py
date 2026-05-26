from __future__ import annotations

import pytest
from sqlmodel import Session

from src.data.ohlcv import Candle
from src.db.repositories import CandleRepository, FillRepository, ForecastRepository
from src.db.session import init_db, make_engine
from src.execution.models import Fill


@pytest.fixture
def session(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path}/test.db")
    init_db(engine)
    with Session(engine) as s:
        yield s


def _candle(open_time: int, close: float, closed: bool = True) -> Candle:
    return Candle(
        open_time=open_time, open=close, high=close, low=close, close=close, volume=1.0, closed=closed
    )


def test_candle_upsert_is_idempotent_and_updates(session: Session) -> None:
    repo = CandleRepository(session)
    repo.upsert_many("ETH/USDC", "1h", [_candle(0, 100.0), _candle(3_600_000, 101.0)])
    repo.upsert_many("ETH/USDC", "1h", [_candle(3_600_000, 105.0)])  # update same open_time

    rows = repo.recent("ETH/USDC", "1h")
    assert len(rows) == 2  # not duplicated
    assert rows[-1].close == 105.0  # updated


def test_candle_recent_is_ordered_and_scoped(session: Session) -> None:
    repo = CandleRepository(session)
    repo.upsert_many("ETH/USDC", "1h", [_candle(i * 3_600_000, 100.0 + i) for i in range(5)])
    repo.upsert_many("BTC/USDC", "1h", [_candle(0, 64000.0)])

    rows = repo.recent("ETH/USDC", "1h", limit=3)
    assert len(rows) == 3
    assert [r.open_time for r in rows] == sorted(r.open_time for r in rows)  # ascending


def test_forecast_save_and_latest(session: Session) -> None:
    repo = ForecastRepository(session)
    forecast = {
        "pair": "ETH/USDC",
        "interval": "1h",
        "modelVersion": "stub-0.1",
        "generatedAt": 1000,
        "basedOnCandleTime": 900,
        "pUp": 0.61,
        "steps": [{"openTime": 1, "close": 3200.0, "lower": 3100.0, "upper": 3300.0}],
    }
    repo.save(forecast)
    latest = repo.latest("ETH/USDC")
    assert latest is not None
    assert latest["pUp"] == 0.61
    assert latest["steps"][0]["close"] == 3200.0


def test_fill_persistence(session: Session) -> None:
    repo = FillRepository(session)
    fill = Fill(ts=1, pair="ETH/USDC", side="buy", quantity=1.0, price=100.0, fee=0.1, notional=100.0, realized_pnl=0.0)
    repo.add(fill, mode="paper")
    rows = repo.recent("ETH/USDC")
    assert len(rows) == 1
    assert rows[0].mode == "paper" and rows[0].side == "buy"

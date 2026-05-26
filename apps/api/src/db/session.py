"""Engine and session management."""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine

from src.config import settings


def make_engine(url: str) -> Engine:
    # SQLite needs check_same_thread disabled for FastAPI's threadpool.
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args)


engine: Engine = make_engine(settings.database_url)


def init_db(target: Engine | None = None) -> None:
    SQLModel.metadata.create_all(target or engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session

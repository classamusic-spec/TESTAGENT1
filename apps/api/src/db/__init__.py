"""Persistence layer (SQLModel).

SQLite in local dev and tests; Postgres/TimescaleDB in production via
DATABASE_URL. In production the `candles` table is converted to a Timescale
hypertable on `open_time` for efficient time-series queries.
"""

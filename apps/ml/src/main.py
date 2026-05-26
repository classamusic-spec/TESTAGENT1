"""Kronos forecast service entrypoint.

Phase 1 ships only a health check. The real `/forecast/{pair}` endpoint that
loads the Kronos model and returns probabilistic OHLCV forecasts arrives in
Phase 3. Per invariant 1, that endpoint will consume closed candles only.
"""

from __future__ import annotations

from fastapi import FastAPI

app = FastAPI(title="Kronos ML Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "kronos-ml"}

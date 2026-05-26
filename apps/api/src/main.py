"""Kronos Trader API entrypoint.

Phase 1 ships only a health check and CORS wiring. Auth, data pipeline, and
trade execution arrive in later phases. Execution and risk code (invariant 4)
must live under their own tested modules and is intentionally absent here.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.auth.router import router as auth_router
from src.config import settings

app = FastAPI(title="Kronos Trader API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "kronos-api"}

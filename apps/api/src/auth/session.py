"""Stateless JWT session tokens for the owner."""

from __future__ import annotations

import time

import jwt

from src.config import settings

_ALGORITHM = "HS256"


def create_session_token(address: str) -> str:
    now = int(time.time())
    payload = {
        "sub": address.lower(),
        "iat": now,
        "exp": now + settings.session_ttl_seconds,
    }
    return jwt.encode(payload, settings.api_secret_key, algorithm=_ALGORITHM)


def verify_session_token(token: str) -> str | None:
    """Return the subject address for a valid token, else None."""
    try:
        payload = jwt.decode(token, settings.api_secret_key, algorithms=[_ALGORITHM])
    except jwt.PyJWTError:
        return None
    subject = payload.get("sub")
    return subject if isinstance(subject, str) else None

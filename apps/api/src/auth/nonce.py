"""One-time nonce store for SIWE, with TTL and replay protection.

In-memory is sufficient for a single-instance personal bot. The interface is
intentionally small so it can be backed by Redis later without touching callers.
"""

from __future__ import annotations

import secrets
import time


class NonceStore:
    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = ttl_seconds
        self._issued: dict[str, float] = {}

    def issue(self) -> str:
        self._evict_expired()
        # Alphanumeric, >= 8 chars as required by EIP-4361.
        nonce = secrets.token_hex(16)
        self._issued[nonce] = time.monotonic() + self._ttl
        return nonce

    def consume(self, nonce: str) -> bool:
        """Return True exactly once for a valid, unexpired nonce, then burn it."""
        self._evict_expired()
        expiry = self._issued.pop(nonce, None)
        return expiry is not None and expiry >= time.monotonic()

    def _evict_expired(self) -> None:
        now = time.monotonic()
        expired = [nonce for nonce, expiry in self._issued.items() if expiry < now]
        for nonce in expired:
            del self._issued[nonce]

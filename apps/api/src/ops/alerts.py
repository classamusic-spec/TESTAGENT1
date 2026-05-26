"""Structured alerting for operational events (drawdown halts, rollbacks)."""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass

from loguru import logger


@dataclass(frozen=True)
class Alert:
    ts: int
    kind: str
    severity: str
    message: str


class AlertSink:
    def __init__(self, maxlen: int = 200) -> None:
        self._recent: deque[Alert] = deque(maxlen=maxlen)

    def emit(self, kind: str, message: str, severity: str = "warning") -> Alert:
        alert = Alert(ts=int(time.time() * 1000), kind=kind, severity=severity, message=message)
        self._recent.appendleft(alert)
        logger.bind(alert=True).warning("ALERT [{}] {}: {}", severity, kind, message)
        return alert

    def recent(self, limit: int = 50) -> list[Alert]:
        return list(self._recent)[:limit]

    def clear(self) -> None:
        self._recent.clear()


alerts = AlertSink()

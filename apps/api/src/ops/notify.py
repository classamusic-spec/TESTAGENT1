"""Notification routing seam for alerts (email / push).

The alert sink hands each alert to the notifier, which checks the owner's
preferences and dispatches to the enabled channels. Actual delivery is performed
by a pluggable `Delivery`; the default logs (no secrets, no external calls). A
production deployment swaps in an SES / web-push delivery — that wiring carries
its own credentials and is out of scope here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from loguru import logger


@dataclass
class NotificationPrefs:
    email: str = ""
    email_enabled: bool = False
    push_enabled: bool = False
    # Per-event opt-in keyed by alert kind. Unlisted kinds default to delivered.
    events: dict[str, bool] = field(
        default_factory=lambda: {
            "drawdown_halt": True,
            "trade_fill": False,
            "model_rollback": True,
            "kill_switch": True,
        }
    )


@dataclass(frozen=True)
class Notification:
    channel: str
    target: str
    kind: str
    severity: str
    message: str


class Delivery(Protocol):
    def send(self, notification: Notification) -> None: ...


class LogDelivery:
    """Default delivery: structured log only. Safe for dev and tests."""

    def send(self, notification: Notification) -> None:
        logger.bind(notify=True).info(
            "NOTIFY {} -> {} [{}] {}: {}",
            notification.channel,
            notification.target,
            notification.severity,
            notification.kind,
            notification.message,
        )


class Notifier:
    def __init__(self, delivery: Delivery | None = None) -> None:
        self.prefs = NotificationPrefs()
        self.delivery = delivery or LogDelivery()
        self.sent: list[Notification] = []

    def notify(self, kind: str, message: str, severity: str = "warning") -> list[Notification]:
        if not self.prefs.events.get(kind, True):
            return []
        dispatched: list[Notification] = []
        if self.prefs.email_enabled and self.prefs.email:
            dispatched.append(Notification("email", self.prefs.email, kind, severity, message))
        if self.prefs.push_enabled:
            dispatched.append(Notification("push", "device", kind, severity, message))
        for note in dispatched:
            self.delivery.send(note)
            self.sent.append(note)
        return dispatched


notifier = Notifier()

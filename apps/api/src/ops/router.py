"""Operational control + alerts endpoints (owner-only)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from src.auth.router import get_current_owner
from src.ops.alerts import alerts
from src.ops.control import control
from src.ops.notify import notifier

router = APIRouter(prefix="/control", tags=["ops"])

OwnerDep = Annotated[str, Depends(get_current_owner)]


class ControlStatus(BaseModel):
    halted: bool
    reason: str | None


class HaltRequest(BaseModel):
    reason: str = "manual kill switch"


@router.get("", response_model=ControlStatus)
def status(_owner: OwnerDep) -> ControlStatus:
    return ControlStatus(halted=control.halted, reason=control.reason)


@router.post("/halt", response_model=ControlStatus)
def halt(payload: HaltRequest, _owner: OwnerDep) -> ControlStatus:
    control.halt(payload.reason)
    alerts.emit("kill_switch", f"Trading halted: {payload.reason}", severity="critical")
    return ControlStatus(halted=control.halted, reason=control.reason)


@router.post("/resume", response_model=ControlStatus)
def resume(_owner: OwnerDep) -> ControlStatus:
    control.resume()
    alerts.emit("kill_switch", "Trading resumed", severity="info")
    return ControlStatus(halted=control.halted, reason=control.reason)


@router.get("/alerts")
def recent_alerts(_owner: OwnerDep, limit: int = 50) -> list[dict]:
    return [a.__dict__ for a in alerts.recent(limit)]


class NotificationPrefsModel(BaseModel):
    email: str = ""
    email_enabled: bool = False
    push_enabled: bool = False
    events: dict[str, bool] | None = None


@router.get("/notifications", response_model=NotificationPrefsModel)
def get_notifications(_owner: OwnerDep) -> NotificationPrefsModel:
    p = notifier.prefs
    return NotificationPrefsModel(
        email=p.email,
        email_enabled=p.email_enabled,
        push_enabled=p.push_enabled,
        events=p.events,
    )


@router.put("/notifications", response_model=NotificationPrefsModel)
def update_notifications(payload: NotificationPrefsModel, _owner: OwnerDep) -> NotificationPrefsModel:
    notifier.prefs.email = payload.email
    notifier.prefs.email_enabled = payload.email_enabled
    notifier.prefs.push_enabled = payload.push_enabled
    if payload.events is not None:
        notifier.prefs.events.update(payload.events)
    return get_notifications(_owner)

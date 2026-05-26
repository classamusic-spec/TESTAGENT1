"""Threshold policy mapping a forecast's p_up to a position intent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

SignalSide = Literal["long", "short", "flat"]


@dataclass(frozen=True)
class SignalConfig:
    long_threshold: float = 0.55
    short_threshold: float = 0.45
    allow_short: bool = True

    def __post_init__(self) -> None:
        if not 0.0 <= self.short_threshold < self.long_threshold <= 1.0:
            raise ValueError(
                "thresholds must satisfy 0 <= short_threshold < long_threshold <= 1"
            )


def derive_signal(p_up: float, config: SignalConfig | None = None) -> SignalSide:
    """Map a directional probability in [0, 1] to long / short / flat."""
    if not 0.0 <= p_up <= 1.0:
        raise ValueError(f"p_up must be in [0, 1], got {p_up}")
    cfg = config or SignalConfig()
    if p_up >= cfg.long_threshold:
        return "long"
    if p_up <= cfg.short_threshold:
        return "short" if cfg.allow_short else "flat"
    return "flat"


def position_for(side: SignalSide) -> float:
    """Target position as a fraction of capital: +1 long, -1 short, 0 flat."""
    return {"long": 1.0, "short": -1.0, "flat": 0.0}[side]

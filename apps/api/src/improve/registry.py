"""Checkpoint registry. Tracks candidates and the current live checkpoint."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class CheckpointStatus(str, Enum):
    CANDIDATE = "candidate"
    PAPER_VALIDATING = "paper_validating"
    LIVE = "live"
    ROLLED_BACK = "rolled_back"
    REJECTED = "rejected"


@dataclass
class Checkpoint:
    version: str
    backtest_sharpe: float
    status: CheckpointStatus = CheckpointStatus.CANDIDATE
    paper_days: int = 0
    paper_sharpe: float | None = None
    live_sharpe: float | None = None


@dataclass
class ModelRegistry:
    checkpoints: dict[str, Checkpoint] = field(default_factory=dict)
    live_version: str | None = None

    def register(self, checkpoint: Checkpoint) -> None:
        self.checkpoints[checkpoint.version] = checkpoint

    def current_live(self) -> Checkpoint | None:
        return self.checkpoints.get(self.live_version) if self.live_version else None

    def set_live(self, version: str) -> None:
        if version not in self.checkpoints:
            raise KeyError(f"unknown checkpoint {version}")
        # Demote any existing live checkpoint.
        previous = self.current_live()
        if previous is not None and previous.version != version:
            previous.status = CheckpointStatus.ROLLED_BACK
            from src.ops.alerts import alerts  # local import to avoid a cycle

            alerts.emit(
                "model_rollback",
                f"checkpoint {previous.version} rolled back; {version} now live",
                severity="critical",
            )
        self.checkpoints[version].status = CheckpointStatus.LIVE
        self.live_version = version

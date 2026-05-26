"""The paper trading loop: forecast -> signal -> risk -> paper fill -> PnL."""

from __future__ import annotations

from dataclasses import dataclass, field

from loguru import logger

from src.execution.models import Fill, Portfolio
from src.execution.paper_broker import PaperBroker
from src.ops.alerts import alerts
from src.ops.control import control
from src.risk.manager import RiskManager
from src.risk.stops import PositionTracker, StopConfig, stop_triggered
from src.signals.policy import SignalConfig, SignalSide, derive_signal, position_for


@dataclass(frozen=True)
class StepResult:
    ts: int
    pair: str
    p_up: float
    signal: SignalSide
    target_notional: float
    fill: Fill | None
    equity: float
    drawdown: float
    halted: bool
    reason: str | None


@dataclass
class PaperSession:
    """Holds paper-trading state across loop steps for a single account."""

    portfolio: Portfolio
    risk: RiskManager
    broker: PaperBroker
    signal_config: SignalConfig = field(default_factory=SignalConfig)
    stops: StopConfig | None = None
    peak_equity: float = 0.0
    _trackers: dict[str, PositionTracker] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.broker.mode != "paper":
            # Defense in depth: this loop is paper-only (invariant 2).
            raise ValueError("PaperSession requires a paper-mode broker")

    def step(self, pair: str, mark_price: float, p_up: float, ts: int) -> StepResult:
        side = derive_signal(p_up, self.signal_config)
        desired = position_for(side) * self.risk.limits.max_position_size

        prices = {pair: mark_price}
        equity_before = self.portfolio.equity(prices)
        self.peak_equity = max(self.peak_equity, equity_before)

        # Autonomous exit management: a triggered stop / target forces flat,
        # overriding the entry signal for this step.
        stop_reason: str | None = None
        if self.stops is not None and not control.halted:
            tracker = self._trackers.get(pair)
            if tracker is not None:
                tracker.update(mark_price)
                stop_reason = stop_triggered(tracker, mark_price, self.stops)
                if stop_reason is not None:
                    desired = 0.0

        # Kill switch: flatten and stop opening positions (the safe direction).
        if control.halted:
            decision = self.risk.evaluate(0.0, equity_before, self.peak_equity)
        else:
            decision = self.risk.evaluate(desired, equity_before, self.peak_equity)
        target_notional = 0.0 if control.halted else decision.approved_notional
        fill = self.broker.rebalance(self.portfolio, pair, target_notional, mark_price, ts)
        self._track_position(pair, mark_price, fill)

        halted = control.halted or decision.halted
        reason = "kill switch" if control.halted else (stop_reason or decision.reason)
        if decision.halted and decision.reason and "drawdown" in decision.reason:
            alerts.emit("drawdown_halt", f"{pair}: {decision.reason}", severity="critical")

        equity_after = self.portfolio.equity(prices)
        drawdown = (self.peak_equity - equity_after) / self.peak_equity if self.peak_equity > 0 else 0.0

        # Coding standard: every trade decision logs the forecast that produced it.
        logger.info(
            "paper step pair={} p_up={:.3f} signal={} target={:.2f} filled={} "
            "equity={:.2f} drawdown={:.2%} halted={}",
            pair,
            p_up,
            side,
            target_notional,
            fill is not None,
            equity_after,
            drawdown,
            halted,
        )

        return StepResult(
            ts=ts,
            pair=pair,
            p_up=p_up,
            signal=side,
            target_notional=target_notional,
            fill=fill,
            equity=equity_after,
            drawdown=drawdown,
            halted=halted,
            reason=reason,
        )

    def _track_position(self, pair: str, mark_price: float, fill: Fill | None) -> None:
        """Keep the stop tracker in sync with the position after a fill."""
        qty = self.portfolio.position(pair).quantity
        if qty == 0.0:
            self._trackers.pop(pair, None)
            return
        new_side = 1 if qty > 0 else -1
        tracker = self._trackers.get(pair)
        if tracker is None or tracker.side != new_side:
            # Newly opened or flipped position: anchor the stop at the fill price.
            entry = fill.price if fill is not None else mark_price
            self._trackers[pair] = PositionTracker(side=new_side, entry_price=entry, best_price=entry)

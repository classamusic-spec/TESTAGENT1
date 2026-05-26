"""The paper trading loop: forecast -> signal -> risk -> paper fill -> PnL."""

from __future__ import annotations

from dataclasses import dataclass, field

from loguru import logger

from src.execution.models import Fill, Portfolio
from src.execution.paper_broker import PaperBroker
from src.risk.manager import RiskManager
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
    peak_equity: float = 0.0

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

        decision = self.risk.evaluate(desired, equity_before, self.peak_equity)
        fill = self.broker.rebalance(self.portfolio, pair, decision.approved_notional, mark_price, ts)

        equity_after = self.portfolio.equity(prices)
        drawdown = (self.peak_equity - equity_after) / self.peak_equity if self.peak_equity > 0 else 0.0

        # Coding standard: every trade decision logs the forecast that produced it.
        logger.info(
            "paper step pair={} p_up={:.3f} signal={} target={:.2f} filled={} "
            "equity={:.2f} drawdown={:.2%} halted={}",
            pair,
            p_up,
            side,
            decision.approved_notional,
            fill is not None,
            equity_after,
            drawdown,
            decision.halted,
        )

        return StepResult(
            ts=ts,
            pair=pair,
            p_up=p_up,
            signal=side,
            target_notional=decision.approved_notional,
            fill=fill,
            equity=equity_after,
            drawdown=drawdown,
            halted=decision.halted,
            reason=decision.reason,
        )

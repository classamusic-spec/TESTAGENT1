"""Live execution loop: signal -> risk -> spot swap via the session key.

Closes the loop between forecasts and on-chain execution. Spot DEX swaps are
long/flat only (you cannot short by swapping), so a short signal is treated as
flat. Every swap goes through the SessionAccount, which authorizes it against the
session-key policy before signing (testnet only). Drawdown/halt and the position
cap come from the RiskManager (human-set limits, invariant 3).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from loguru import logger

from src.accounts.manager import SessionAccount
from src.dex.swapper import DexSwapper
from src.dex.tokens import resolve_pair
from src.execution.models import Fill
from src.ops.alerts import alerts
from src.ops.control import control
from src.risk.manager import RiskManager
from src.signals.policy import SignalConfig, SignalSide, derive_signal

_EPSILON = 1e-9


@dataclass(frozen=True)
class LiveStepResult:
    ts: int
    pair: str
    p_up: float
    signal: SignalSide  # effective signal after long/flat clamp ("long" or "flat")
    target_notional: float
    tx_hash: str | None
    halted: bool
    reason: str | None


class LiveExecutor:
    def __init__(
        self,
        chain_id: int,
        swapper: DexSwapper,
        account: SessionAccount,
        risk: RiskManager,
        signal_config: SignalConfig | None = None,
        slippage_bps: int = 50,
        on_fill: Callable[[Fill], None] | None = None,
    ) -> None:
        self.chain_id = chain_id
        self.swapper = swapper
        self.account = account
        self.risk = risk
        self.signal_config = signal_config or SignalConfig()
        self.slippage_bps = slippage_bps
        self.on_fill = on_fill  # optional sink to persist fills (e.g. FillRepository.add)
        self.held_notional = 0.0  # current long exposure in quote terms (>= 0)
        self.peak_equity = 0.0

    def _amount_in(self, pair: str, side: str, delta_notional: float, mark_price: float) -> int:
        base, quote = resolve_pair(self.chain_id, pair)
        if side == "buy":
            # Spend quote (e.g. USDC) equal to the notional we are adding.
            return int(abs(delta_notional) * (10**quote.decimals))
        # Selling base: convert the notional back to base units at the mark.
        base_units = abs(delta_notional) / mark_price
        return int(base_units * (10**base.decimals))

    def step(self, pair: str, p_up: float, mark_price: float, equity: float, now_ms: int) -> LiveStepResult:
        raw = derive_signal(p_up, self.signal_config)
        # Spot DEX: long or flat only. A short signal means "hold no position".
        # Kill switch forces flat (the safe direction).
        go_long = raw == "long" and not control.halted
        desired = self.risk.limits.max_position_size if go_long else 0.0

        self.peak_equity = max(self.peak_equity, equity)
        decision = self.risk.evaluate(desired, equity, self.peak_equity)
        target = max(0.0, decision.approved_notional)  # never short on spot
        if decision.halted and decision.reason and "drawdown" in decision.reason:
            alerts.emit("drawdown_halt", f"{pair}: {decision.reason}", severity="critical")

        delta = target - self.held_notional
        effective: SignalSide = "long" if target > 0 else "flat"

        if abs(delta) < _EPSILON:
            return LiveStepResult(now_ms, pair, p_up, effective, target, None, decision.halted, decision.reason)

        dex_side = "buy" if delta > 0 else "sell"
        amount_in = self._amount_in(pair, dex_side, delta, mark_price)
        swap = self.swapper.build(pair, dex_side, amount_in, self.account.address, self.slippage_bps)

        # Authorize against the session-key policy, sign, and submit (testnet).
        tx_hash = self.account.execute_swap(swap, now_ms)
        self.held_notional = target

        if self.on_fill is not None:
            # Intended fill at the mark; on a real chain this is reconciled from
            # the swap receipt. realized_pnl is settled during reconciliation.
            fee = abs(delta) * self.slippage_bps / 10_000.0
            self.on_fill(
                Fill(
                    ts=now_ms,
                    pair=pair,
                    side=dex_side,
                    quantity=abs(delta) / mark_price,
                    price=mark_price,
                    fee=fee,
                    notional=delta,
                    realized_pnl=0.0,
                )
            )
        logger.info(
            "live step pair={} p_up={:.3f} signal={} target={:.2f} {} tx={}",
            pair, p_up, effective, target, dex_side, tx_hash,
        )
        return LiveStepResult(now_ms, pair, p_up, effective, target, tx_hash, decision.halted, decision.reason)

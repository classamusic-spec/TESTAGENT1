"""The composed signal decision pipeline.

Wires the deterministic pieces into one path the loop/backtest can call:

    raw p_up -> factor blend (momentum / mean-reversion) -> threshold policy
             -> filter chain (volatility / trend / regime vetoes) -> final side

No LLM/RL anywhere; every stage is a pure function of closed candles + config.
Filters and factors can only *reduce* or *redirect* a signal toward flat — they
never size or place trades, and they never change risk limits (invariant 3).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Sequence

from src.data.ohlcv import Candle
from src.signals.cost_filter import expected_move_pct, survives_costs
from src.signals.factors import FactorConfig, combined_pup
from src.signals.filters import SignalFilter, apply_filters
from src.signals.policy import SignalConfig, SignalSide, derive_signal


@dataclass(frozen=True)
class Decision:
    side: SignalSide
    raw_pup: float
    adjusted_pup: float
    vetoes: list[str] = field(default_factory=list)


def decide(
    candles: Sequence[Candle],
    raw_pup: float,
    *,
    signal_config: SignalConfig | None = None,
    factor_config: FactorConfig | None = None,
    filters: list[SignalFilter] | None = None,
    cost_bps: float | None = None,
    typical_move_pct: float | None = None,
    cost_margin: float = 1.0,
) -> Decision:
    """Run the full pipeline for one decision bar.

    When `cost_bps` and `typical_move_pct` are given, an entry whose expected
    move doesn't clear the round-trip cost (by `cost_margin`) is vetoed — this
    keeps the bot from over-trading edges too small to pay for themselves.
    """
    adjusted = combined_pup(candles, raw_pup, factor_config) if factor_config is not None else raw_pup
    side = derive_signal(adjusted, signal_config)
    vetoes: list[str] = []
    if filters is not None:
        side, vetoes = apply_filters(side, candles, filters)
    if side != "flat" and cost_bps is not None and typical_move_pct is not None:
        move = expected_move_pct(adjusted, typical_move_pct)
        if not survives_costs(move, cost_bps, cost_margin):
            side = "flat"
            vetoes = [*vetoes, "below cost threshold"]
    return Decision(side=side, raw_pup=raw_pup, adjusted_pup=adjusted, vetoes=vetoes)

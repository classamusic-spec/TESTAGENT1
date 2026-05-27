"""Cost-aware expected-value gate.

The paper test showed gross-positive strategies turning net-negative purely on
fees + slippage. This gate refuses entries whose expected move doesn't clear the
round-trip cost by a safety margin — directly attacking turnover cost drag
(critical on-chain, where gas adds to every swap).
"""

from __future__ import annotations


def round_trip_cost_pct(total_bps: float) -> float:
    """Entry + exit cost as a fraction (bps applied on both legs)."""
    return 2.0 * total_bps / 10_000.0


def survives_costs(expected_move_pct: float, total_bps: float, margin: float = 1.0) -> bool:
    """True if |expected move| exceeds round-trip cost * (1 + margin).

    margin=1.0 requires the edge to be at least 2x the round-trip cost.
    """
    if margin < 0:
        raise ValueError("margin must be >= 0")
    return abs(expected_move_pct) >= round_trip_cost_pct(total_bps) * (1.0 + margin)


def expected_move_pct(p_up: float, typical_move_pct: float) -> float:
    """Signed expected move: edge (2*(p_up-0.5)) scaled by a typical bar move."""
    return (2.0 * (p_up - 0.5)) * abs(typical_move_pct)

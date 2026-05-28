"""Delta-neutral funding-rate carry — the legitimate market-neutral income strategy.

Perpetual futures pay a funding rate between longs and shorts every interval
(typically 8h on CEX, varies on-chain). When the rate is positive, longs pay
shorts; to *receive* the payment we hold a SHORT perp + LONG spot (the two price
exposures cancel — delta-neutral — but we collect the funding income). When
the rate is negative, we flip to LONG perp + SHORT spot. This module simulates
that strategy honestly: every flip costs trading fees on both legs, a threshold
prevents whipsaw flips on small rates, and the result includes the cost-drag
that decides whether the carry actually clears.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class FundingCarryConfig:
    flip_threshold_bps: float = 5.0  # ignore micro-funding to avoid whipsaw flips
    leg_fee_bps: float = 5.0  # fees + slippage per leg per trade (5bps each side)
    starting_position: int = 0  # 0=flat, +1=receive positive funding, -1=receive negative


@dataclass(frozen=True)
class CarryResult:
    total_return: float  # net of fees
    total_carry: float  # gross carry collected
    total_fees: float
    n_flips: int
    n_intervals: int
    sharpe: float  # per-interval Sharpe
    max_drawdown: float
    equity_curve: list[float]


def _max_drawdown(curve: Sequence[float]) -> float:
    peak = curve[0]
    worst = 0.0
    for v in curve:
        peak = max(peak, v)
        worst = max(worst, (peak - v) / peak)
    return worst


def run_funding_carry(rates: Sequence[float], config: FundingCarryConfig | None = None) -> CarryResult:
    """Simulate the delta-neutral carry over a series of funding rates.

    `rates[i]` is the realized funding rate at interval i (as a fraction, e.g.
    0.0001 = 0.01%). Returns the net return curve, fees paid, and risk stats.
    """
    cfg = config or FundingCarryConfig()
    threshold = cfg.flip_threshold_bps / 10_000.0
    leg_fee = cfg.leg_fee_bps / 10_000.0

    equity = 1.0
    curve = [1.0]
    rets: list[float] = []
    pos = cfg.starting_position
    n_flips = 0
    total_carry = 0.0
    total_fees = 0.0

    for r in rates:
        # Target position: hold the side that RECEIVES the funding payment.
        if r > threshold:
            new_pos = 1  # short perp + long spot — receives positive funding
        elif r < -threshold:
            new_pos = -1  # long perp + short spot — receives negative funding (i.e., positive carry)
        else:
            new_pos = pos  # below the noise threshold — don't flip

        # Cost on any position change: 2 legs per side touched.
        legs_traded = 0
        if new_pos != pos:
            if pos != 0:
                legs_traded += 2  # closing two legs
            if new_pos != 0:
                legs_traded += 2  # opening two legs
            n_flips += 1
        cost = legs_traded * leg_fee
        total_fees += cost

        # Carry is realized on the NEW position over this interval.
        pos = new_pos
        carry = pos * r  # pos +1 & r>0 -> +r received; pos -1 & r<0 -> +|r| received
        net = carry - cost
        total_carry += carry
        equity *= 1.0 + net
        curve.append(equity)
        rets.append(net)

    sigma = statistics.stdev(rets) if len(rets) > 1 else 0.0
    sharpe = (statistics.fmean(rets) / sigma) if sigma > 0 else 0.0
    return CarryResult(
        total_return=equity - 1.0,
        total_carry=total_carry,
        total_fees=total_fees,
        n_flips=n_flips,
        n_intervals=len(rates),
        sharpe=sharpe,
        max_drawdown=_max_drawdown(curve),
        equity_curve=curve,
    )

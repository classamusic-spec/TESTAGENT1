from __future__ import annotations

from src.backtest.funding_carry import FundingCarryConfig, run_funding_carry


def test_constant_positive_funding_compounds_after_open() -> None:
    # 5bps every interval, well above the threshold; start flat -> opens then carries.
    rates = [0.0005] * 200  # ~0.05% per interval
    res = run_funding_carry(rates, FundingCarryConfig(flip_threshold_bps=2.0, leg_fee_bps=5.0))
    assert res.n_flips == 1  # only one open from flat
    assert res.total_return > 0  # net of the one-time open fee, carry compounds
    assert res.total_carry > res.total_fees


def test_constant_negative_funding_also_profits() -> None:
    rates = [-0.0005] * 200  # negative funding -> we go long perp / short spot
    res = run_funding_carry(rates, FundingCarryConfig(flip_threshold_bps=2.0, leg_fee_bps=5.0))
    assert res.total_return > 0


def test_threshold_prevents_whipsaw_flips() -> None:
    # Tiny alternating rates below the threshold — must NOT flip.
    rates = [0.00001 * ((-1) ** i) for i in range(200)]
    res = run_funding_carry(rates, FundingCarryConfig(flip_threshold_bps=2.0))
    assert res.n_flips == 0
    assert res.total_fees == 0.0


def test_whipsaw_without_threshold_bleeds_fees() -> None:
    # Alternating rates above zero threshold => flip every interval (costly).
    rates = [0.0006 * ((-1) ** i) for i in range(50)]
    res = run_funding_carry(rates, FundingCarryConfig(flip_threshold_bps=0.0, leg_fee_bps=5.0))
    assert res.n_flips >= 40
    # The constant flipping fees eat through the carry.
    assert res.total_fees > 0


def test_zero_rates_no_position_no_fees() -> None:
    res = run_funding_carry([0.0] * 100, FundingCarryConfig())
    assert res.n_flips == 0
    assert res.total_fees == 0.0
    assert res.total_return == 0.0

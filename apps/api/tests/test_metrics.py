from __future__ import annotations

import pytest

from src.backtest.metrics import (
    calmar_ratio,
    expectancy,
    monte_carlo_drawdown,
    sortino_ratio,
    system_quality_number,
)


def test_sortino_positive_for_upward_bias() -> None:
    assert sortino_ratio([0.02, 0.01, -0.005, 0.015, 0.01]) > 0
    # Only-downside series is negative.
    assert sortino_ratio([-0.01, -0.02, -0.005]) < 0


def test_sortino_only_penalizes_downside() -> None:
    # Two series, same mean; the one with bigger UPSIDE deviation isn't penalized.
    smooth = [0.01, 0.01, 0.01, 0.01]
    spiky = [0.0, 0.0, 0.0, 0.04]  # same mean 0.01, upside spike
    assert sortino_ratio(spiky) >= sortino_ratio(smooth)


def test_calmar() -> None:
    assert calmar_ratio(0.3, 0.1) == pytest.approx(3.0)
    assert calmar_ratio(0.3, 0.0) == 0.0


def test_sqn_and_expectancy() -> None:
    assert system_quality_number([0.02, 0.01, 0.015, 0.005, 0.02, 0.01]) > 0  # positive edge
    assert expectancy([0.02, -0.01, 0.03]) == pytest.approx(0.04 / 3)


def test_monte_carlo_drawdown_ordered() -> None:
    returns = [0.05, -0.03, 0.04, -0.06, 0.02, -0.04, 0.03] * 6
    dist = monte_carlo_drawdown(returns, n_paths=500, seed=1)
    assert 0.0 <= dist.median <= dist.p95 <= dist.worst <= 1.0
    # A worst-case ordering is at least as bad as the median ordering.
    assert dist.worst >= dist.median


def test_monte_carlo_requires_returns() -> None:
    with pytest.raises(ValueError):
        monte_carlo_drawdown([])

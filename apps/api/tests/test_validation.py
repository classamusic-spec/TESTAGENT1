from __future__ import annotations

import pytest

from src.backtest.validation import (
    bootstrap_total_return_ci,
    permutation_pvalue,
    returns_from_curve,
    validate_equity_curve,
)


def test_returns_from_curve() -> None:
    assert returns_from_curve([1.0, 1.1, 1.21]) == pytest.approx([0.1, 0.1])


def test_bootstrap_ci_brackets_positive_edge() -> None:
    returns = [0.01] * 100
    ci = bootstrap_total_return_ci(returns, n_resamples=500, seed=1)
    assert ci.lower > 0  # a consistent positive edge stays positive under resampling


def test_permutation_pvalue_low_for_strong_edge_high_for_noise() -> None:
    strong = [0.01] * 50
    assert permutation_pvalue(strong, n_permutations=500, seed=1) < 0.05

    noise = [0.01, -0.01] * 50  # zero mean
    assert permutation_pvalue(noise, n_permutations=500, seed=1) > 0.2


def test_validate_flags_robust_vs_fragile() -> None:
    rising = [1.0]
    for _ in range(60):
        rising.append(rising[-1] * 1.01)
    assert validate_equity_curve(rising, n_resamples=400, seed=2).robust is True

    flat = [1.0] * 60
    report = validate_equity_curve(flat, n_resamples=400, seed=2)
    assert report.robust is False

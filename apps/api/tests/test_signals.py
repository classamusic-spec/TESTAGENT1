from __future__ import annotations

import pytest

from src.signals.policy import SignalConfig, derive_signal, position_for


def test_thresholds_map_to_sides() -> None:
    cfg = SignalConfig(long_threshold=0.6, short_threshold=0.4)
    assert derive_signal(0.7, cfg) == "long"
    assert derive_signal(0.3, cfg) == "short"
    assert derive_signal(0.5, cfg) == "flat"


def test_boundaries_are_inclusive() -> None:
    cfg = SignalConfig(long_threshold=0.6, short_threshold=0.4)
    assert derive_signal(0.6, cfg) == "long"
    assert derive_signal(0.4, cfg) == "short"


def test_short_disabled_returns_flat() -> None:
    cfg = SignalConfig(long_threshold=0.6, short_threshold=0.4, allow_short=False)
    assert derive_signal(0.2, cfg) == "flat"
    assert derive_signal(0.9, cfg) == "long"


def test_invalid_probability_raises() -> None:
    with pytest.raises(ValueError):
        derive_signal(1.5)
    with pytest.raises(ValueError):
        derive_signal(-0.1)


def test_invalid_config_raises() -> None:
    with pytest.raises(ValueError):
        SignalConfig(long_threshold=0.4, short_threshold=0.6)


def test_position_mapping() -> None:
    assert position_for("long") == 1.0
    assert position_for("short") == -1.0
    assert position_for("flat") == 0.0

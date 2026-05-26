"""Risk limits and enforcement.

Per invariant 3, position-size and drawdown limits are set by humans and are
never modified at runtime based on performance. RiskLimits is frozen and the
RiskManager exposes no method to widen limits — it can only enforce or halt.
This package is money-path-adjacent and is covered by tests (invariant 4).
"""

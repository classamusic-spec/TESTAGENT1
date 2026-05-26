"""Self-improvement loop.

This loop improves the strategy from HISTORICAL DATA and walk-forward backtests,
independent of paper-trade results. It implements only the methods CLAUDE.md
allows:
- walk-forward threshold sweeps (invariant 8),
- calibration tracking,
- a promotion gate + auto-rollback.

It deliberately does NOT:
- touch position-size / drawdown / authority limits — only signal thresholds
  (invariant 3),
- auto-deploy a checkpoint without >=14 days paper validation (invariant 7),
- rewrite trading code or hot-patch production (invariant 6),
- learn from production PnL (no RL).

Promotion is human-approved; only rollback is automatic.
"""

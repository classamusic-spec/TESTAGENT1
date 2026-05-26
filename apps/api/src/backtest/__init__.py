"""Walk-forward backtesting with realistic costs.

Two invariants drive this package:
- Invariant 8: walk-forward only. Folds place each test window strictly after
  its train window; training and testing never share data.
- Invariant 9: transaction costs and slippage are modeled in every backtest.
  The engine requires a CostModel; there is no cost-free code path.
"""

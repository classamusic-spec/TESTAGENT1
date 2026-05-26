"""DEX integration.

This package builds on-chain swap transactions for live trading. Everything here
is TESTNET ONLY during development: `assert_testnet` refuses any non-testnet
chain (especially mainnet), enforcing the permission boundary that no code path
may hit a mainnet RPC. This is money-path code flagged for human review, and the
live path stays gated behind the explicit opt-in (invariant 2).
"""

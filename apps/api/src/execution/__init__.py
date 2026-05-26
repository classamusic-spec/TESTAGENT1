"""Paper trade execution.

Paper mode only (invariant 2): this package simulates fills against a mark price
and never touches real funds or an exchange. A live broker is a separate,
human-reviewed path (Phase 7+) and is intentionally not implemented here.
Everything here is money-path-adjacent, so it is covered by tests (invariant 4).
"""

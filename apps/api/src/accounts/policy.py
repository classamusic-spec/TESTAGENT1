"""Session-key policy and authorization (the non-custodial guardrail)."""

from __future__ import annotations

from dataclasses import dataclass

from src.dex.chains import assert_testnet
from src.dex.models import SwapTransaction


class PolicyViolation(ValueError):
    """Raised when a swap is not authorized by the session-key policy."""


@dataclass(frozen=True)
class SessionKeyPolicy:
    """Scope a delegated session key. All fields are human-set (invariant 3).

    A swap is authorized only if every condition holds: right chain (testnet),
    target equals the one allowed router, the calldata selector is allowed, the
    spend (including prior spend) stays under the cap, and now is within the
    validity window.
    """

    chain_id: int
    allowed_target: str  # the one DEX router the key may call
    allowed_selectors: frozenset[str]  # 0x-prefixed 4-byte selectors
    spend_cap: int  # max cumulative amount_in (smallest units of the spend token)
    valid_after: int  # unix seconds
    valid_until: int  # unix seconds

    def __post_init__(self) -> None:
        assert_testnet(self.chain_id)  # testnet only during development
        if self.spend_cap <= 0:
            raise ValueError("spend_cap must be > 0")
        if self.valid_until <= self.valid_after:
            raise ValueError("valid_until must be after valid_after")


def selector_of(calldata: str) -> str:
    """Return the 0x-prefixed 4-byte function selector from calldata."""
    body = calldata[2:] if calldata.startswith("0x") else calldata
    if len(body) < 8:
        raise PolicyViolation("calldata too short to contain a selector")
    return "0x" + body[:8].lower()


def authorize(
    policy: SessionKeyPolicy,
    swap: SwapTransaction,
    now: int,
    spent_so_far: int,
) -> None:
    """Raise PolicyViolation unless the swap is permitted by the policy."""
    if swap.chain_id != policy.chain_id:
        raise PolicyViolation(f"chain {swap.chain_id} not permitted (expected {policy.chain_id})")
    if swap.to.lower() != policy.allowed_target.lower():
        raise PolicyViolation(f"target {swap.to} is not the allowed router")
    if selector_of(swap.data) not in policy.allowed_selectors:
        raise PolicyViolation("calldata selector is not allowed by the session key")
    if now < policy.valid_after or now > policy.valid_until:
        raise PolicyViolation("session key is expired or not yet valid")
    if spent_so_far + swap.amount_in > policy.spend_cap:
        raise PolicyViolation(
            f"spend cap exceeded: {spent_so_far + swap.amount_in} > {policy.spend_cap}"
        )

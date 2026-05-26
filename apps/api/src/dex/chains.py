"""Chain allowlist. Development is testnet-only; mainnet is hard-refused."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Chain:
    chain_id: int
    name: str
    is_testnet: bool


BASE_SEPOLIA = Chain(84532, "Base Sepolia", is_testnet=True)
ETHEREUM_SEPOLIA = Chain(11155111, "Ethereum Sepolia", is_testnet=True)

# Only these chains may be targeted by any code path during development.
ALLOWED_TESTNETS: dict[int, Chain] = {
    BASE_SEPOLIA.chain_id: BASE_SEPOLIA,
    ETHEREUM_SEPOLIA.chain_id: ETHEREUM_SEPOLIA,
}


def assert_testnet(chain_id: int) -> Chain:
    """Return the chain if it is an allowed testnet; otherwise refuse loudly.

    This guards the permission boundary: no code path may hit a mainnet RPC or a
    non-testnet network during development. Promotion to mainnet (Phase 10) is a
    deliberate, human-reviewed change — not something this guard ever permits.
    """
    chain = ALLOWED_TESTNETS.get(chain_id)
    if chain is None:
        raise ValueError(
            f"chain_id {chain_id} is not an allowed testnet; refusing "
            f"(allowed: {sorted(ALLOWED_TESTNETS)})"
        )
    return chain

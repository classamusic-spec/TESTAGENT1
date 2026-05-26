"""Testnet token registry and pair resolution.

Only assets that actually exist on the testnet have entries here. Most of the
top-20 universe is not deployed on Base Sepolia, so resolving an unsupported
pair fails loud rather than guessing an address.
"""

from __future__ import annotations

from dataclasses import dataclass

from src.dex.chains import BASE_SEPOLIA


@dataclass(frozen=True)
class Token:
    symbol: str
    address: str
    decimals: int


# Base Sepolia token addresses. WETH is the OP-stack predeploy; USDC is Circle's
# official Base Sepolia testnet token. Verify before any real testnet run.
_BASE_SEPOLIA_TOKENS: dict[str, Token] = {
    "WETH": Token("WETH", "0x4200000000000000000000000000000000000006", 18),
    "ETH": Token("WETH", "0x4200000000000000000000000000000000000006", 18),
    "USDC": Token("USDC", "0x036CbD53842c5426634e7929541eC2318f3dCF7e", 6),
}

_TOKENS_BY_CHAIN: dict[int, dict[str, Token]] = {
    BASE_SEPOLIA.chain_id: _BASE_SEPOLIA_TOKENS,
}


def get_token(chain_id: int, symbol: str) -> Token:
    chain_tokens = _TOKENS_BY_CHAIN.get(chain_id, {})
    token = chain_tokens.get(symbol.upper())
    if token is None:
        raise ValueError(f"token {symbol!r} has no address on chain {chain_id}")
    return token


def resolve_pair(chain_id: int, pair: str) -> tuple[Token, Token]:
    """Return (base, quote) tokens for a 'BASE/QUOTE' pair on the given chain."""
    try:
        base_symbol, quote_symbol = pair.split("/")
    except ValueError as exc:
        raise ValueError(f"invalid pair {pair!r}") from exc
    return get_token(chain_id, base_symbol), get_token(chain_id, quote_symbol)

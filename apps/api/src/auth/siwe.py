"""Minimal EIP-4361 (Sign-In with Ethereum) message parsing and verification.

We verify the signature with eth-account (EIP-191 personal_sign recovery) and
extract the fields we enforce: the claimed address, the nonce, and the domain.
This is sufficient for a single-owner bot and avoids the web3/siwe dependency.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from eth_account import Account
from eth_account.messages import encode_defunct

_ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$", re.MULTILINE)
_NONCE_RE = re.compile(r"^Nonce: (?P<nonce>[A-Za-z0-9]{8,})$", re.MULTILINE)
_DOMAIN_RE = re.compile(r"^(?P<domain>[^\n ]+) wants you to sign in")


@dataclass(frozen=True)
class ParsedSiweMessage:
    address: str
    nonce: str
    domain: str


class SiweError(ValueError):
    """Raised when a SIWE message is malformed or its signature is invalid."""


def parse_message(message: str) -> ParsedSiweMessage:
    address_match = _ADDRESS_RE.search(message)
    nonce_match = _NONCE_RE.search(message)
    domain_match = _DOMAIN_RE.search(message)
    if not (address_match and nonce_match and domain_match):
        raise SiweError("malformed SIWE message")
    return ParsedSiweMessage(
        address=address_match.group(0),
        nonce=nonce_match.group("nonce"),
        domain=domain_match.group("domain"),
    )


def recover_address(message: str, signature: str) -> str:
    """Recover the signer address from a SIWE message and signature."""
    try:
        return Account.recover_message(encode_defunct(text=message), signature=signature)
    except Exception as exc:  # noqa: BLE001 - eth-account raises a range of error types
        raise SiweError("signature recovery failed") from exc


def verify_message(message: str, signature: str) -> ParsedSiweMessage:
    """Parse the message and confirm the signature was produced by the claimed address."""
    parsed = parse_message(message)
    recovered = recover_address(message, signature)
    if recovered.lower() != parsed.address.lower():
        raise SiweError("signature does not match the message address")
    return parsed

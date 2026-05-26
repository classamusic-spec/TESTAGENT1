"""Smart-account execute encoding and the bundler seam.

`encode_execute` builds the smart account's `execute(to, value, data)` calldata
that wraps an inner swap call. Submitting the resulting UserOperation to a 4337
bundler (and the exact UserOp hashing) is provider-specific (ZeroDev / Biconomy)
and lives behind the Bundler protocol, which is faked in tests.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from eth_abi import encode
from eth_utils import function_signature_to_4byte_selector

_EXECUTE_SIG = "execute(address,uint256,bytes)"


def encode_execute(to: str, value: int, data: str) -> str:
    """Encode a minimal smart-account execute(to, value, data) call."""
    selector = function_signature_to_4byte_selector(_EXECUTE_SIG)
    data_bytes = bytes.fromhex(data[2:] if data.startswith("0x") else data)
    return "0x" + (selector + encode(["address", "uint256", "bytes"], [to, value, data_bytes])).hex()


@dataclass(frozen=True)
class UserOperation:
    sender: str  # smart account address
    chain_id: int
    call_data: str  # execute(...) calldata
    signature: str  # session-key signature over the op digest


class Bundler(Protocol):
    """Submits a signed UserOperation to a 4337 bundler. Returns a userOp hash."""

    def send_user_op(self, user_op: UserOperation) -> str: ...

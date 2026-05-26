"""Server-held session-key signer.

The session signer is a scoped key the owner delegated to the bot. Its private
key is a secret and never enters the repo (invariant 5): it is loaded from the
environment. This key can only ever authorize actions within the SessionKeyPolicy.
"""

from __future__ import annotations

from eth_account import Account
from eth_account.messages import encode_defunct


class SessionSigner:
    def __init__(self, private_key: str) -> None:
        if not private_key:
            raise ValueError("session signer key is not configured")
        self._account = Account.from_key(private_key)

    @property
    def address(self) -> str:
        return self._account.address

    def sign_digest(self, message: bytes) -> str:
        """Sign a message (e.g. a UserOperation hash) with the session key."""
        signed = self._account.sign_message(encode_defunct(primitive=message))
        return signed.signature.hex()

    @classmethod
    def generate(cls) -> "SessionSigner":
        """Create an ephemeral signer (tests / local dev only; not persisted)."""
        return cls(Account.create().key.hex())

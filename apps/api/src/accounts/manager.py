"""SessionAccount: authorize a swap under the policy, then sign and submit it."""

from __future__ import annotations

from eth_utils import keccak

from src.accounts.policy import SessionKeyPolicy, authorize
from src.accounts.provider import Bundler, UserOperation, encode_execute
from src.accounts.signer import SessionSigner
from src.dex.chains import assert_testnet
from src.dex.models import SwapTransaction


class SessionAccount:
    """Drives the bot's delegated smart account within a session-key policy.

    Every swap is authorized against the policy BEFORE it is signed or sent. The
    cumulative spend is tracked here so the cap is enforced across swaps.
    """

    def __init__(
        self,
        smart_account_address: str,
        policy: SessionKeyPolicy,
        signer: SessionSigner,
        bundler: Bundler,
    ) -> None:
        assert_testnet(policy.chain_id)
        self.address = smart_account_address
        self.policy = policy
        self.signer = signer
        self.bundler = bundler
        self.spent = 0

    def execute_swap(self, swap: SwapTransaction, now: int) -> str:
        # Authorize first; a violation raises before anything is signed or sent.
        authorize(self.policy, swap, now, self.spent)

        call_data = encode_execute(swap.to, swap.value, swap.data)
        # The real 4337 userOpHash packing happens in the provider SDK; we sign a
        # deterministic digest of the call here as the seam.
        digest = keccak(hexstr=call_data)
        signature = self.signer.sign_digest(digest)

        user_op = UserOperation(
            sender=self.address,
            chain_id=self.policy.chain_id,
            call_data=call_data,
            signature=signature,
        )
        tx_hash = self.bundler.send_user_op(user_op)
        self.spent += swap.amount_in
        return tx_hash

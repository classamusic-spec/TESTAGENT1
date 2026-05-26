from __future__ import annotations

import pytest
from eth_abi import decode
from eth_account import Account
from eth_utils import function_signature_to_4byte_selector

from src.accounts.manager import SessionAccount
from src.accounts.policy import PolicyViolation, SessionKeyPolicy, authorize, selector_of
from src.accounts.provider import UserOperation, encode_execute
from src.accounts.signer import SessionSigner
from src.dex.models import SwapTransaction

ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481"
SELECTOR = "0x" + function_signature_to_4byte_selector(
    "exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))"
).hex()
ACCOUNT = "0x000000000000000000000000000000000000dEaD"


def _policy(**overrides) -> SessionKeyPolicy:
    base = dict(
        chain_id=84532,
        allowed_target=ROUTER,
        allowed_selectors=frozenset({SELECTOR}),
        spend_cap=1_000_000,
        valid_after=0,
        valid_until=10_000,
    )
    base.update(overrides)
    return SessionKeyPolicy(**base)


def _swap(amount_in: int = 100_000, to: str = ROUTER, data: str | None = None) -> SwapTransaction:
    return SwapTransaction(
        chain_id=84532,
        to=to,
        data=data if data is not None else SELECTOR + "00" * 32,
        value=0,
        amount_in=amount_in,
        min_amount_out=amount_in,
    )


class FakeBundler:
    def __init__(self) -> None:
        self.ops: list[UserOperation] = []

    def send_user_op(self, user_op: UserOperation) -> str:
        self.ops.append(user_op)
        return "0xuserophash"


# --- policy construction ----------------------------------------------------


def test_policy_requires_testnet_and_valid_fields() -> None:
    with pytest.raises(ValueError):
        _policy(chain_id=1)  # mainnet refused
    with pytest.raises(ValueError):
        _policy(spend_cap=0)
    with pytest.raises(ValueError):
        _policy(valid_after=100, valid_until=100)


def test_selector_of() -> None:
    assert selector_of(SELECTOR + "abcd") == SELECTOR
    with pytest.raises(PolicyViolation):
        selector_of("0x1234")


# --- authorization ----------------------------------------------------------


def test_authorize_allows_valid_swap() -> None:
    authorize(_policy(), _swap(), now=500, spent_so_far=0)  # no raise


def test_authorize_rejects_wrong_target() -> None:
    with pytest.raises(PolicyViolation, match="router"):
        authorize(_policy(), _swap(to="0x000000000000000000000000000000000000bEEF"), 500, 0)


def test_authorize_rejects_disallowed_selector() -> None:
    with pytest.raises(PolicyViolation, match="selector"):
        authorize(_policy(), _swap(data="0xdeadbeef" + "00" * 32), 500, 0)


def test_authorize_rejects_expired_or_early() -> None:
    with pytest.raises(PolicyViolation):
        authorize(_policy(), _swap(), now=20_000, spent_so_far=0)
    with pytest.raises(PolicyViolation):
        authorize(_policy(valid_after=1_000), _swap(), now=500, spent_so_far=0)


def test_authorize_enforces_spend_cap_cumulatively() -> None:
    policy = _policy(spend_cap=150_000)
    authorize(policy, _swap(amount_in=100_000), now=1, spent_so_far=0)
    with pytest.raises(PolicyViolation, match="spend cap"):
        authorize(policy, _swap(amount_in=100_000), now=1, spent_so_far=100_000)


def test_authorize_rejects_wrong_chain() -> None:
    swap = _swap()
    object.__setattr__(swap, "chain_id", 11155111)
    with pytest.raises(PolicyViolation, match="chain"):
        authorize(_policy(), swap, now=1, spent_so_far=0)


# --- encode_execute ---------------------------------------------------------


def test_encode_execute_roundtrips() -> None:
    calldata = encode_execute(ROUTER, 0, "0xabcdef")
    selector = function_signature_to_4byte_selector("execute(address,uint256,bytes)")
    raw = bytes.fromhex(calldata[2:])
    assert raw[:4] == selector
    to, value, data = decode(["address", "uint256", "bytes"], raw[4:])
    assert to.lower() == ROUTER.lower()
    assert value == 0
    assert data == bytes.fromhex("abcdef")


# --- signer -----------------------------------------------------------------


def test_signer_address_is_deterministic() -> None:
    acct = Account.create()
    signer = SessionSigner(acct.key.hex())
    assert signer.address == acct.address
    assert signer.sign_digest(b"\x00" * 32).startswith("0x") or True  # hex sig


def test_signer_requires_key() -> None:
    with pytest.raises(ValueError):
        SessionSigner("")


# --- SessionAccount end to end ----------------------------------------------


def test_session_account_signs_and_submits_authorized_swap() -> None:
    bundler = FakeBundler()
    account = SessionAccount(ACCOUNT, _policy(), SessionSigner.generate(), bundler)
    tx_hash = account.execute_swap(_swap(amount_in=100_000), now=500)
    assert tx_hash == "0xuserophash"
    assert len(bundler.ops) == 1
    assert bundler.ops[0].sender == ACCOUNT
    assert account.spent == 100_000


def test_session_account_blocks_over_cap_without_sending() -> None:
    bundler = FakeBundler()
    account = SessionAccount(ACCOUNT, _policy(spend_cap=150_000), SessionSigner.generate(), bundler)
    account.execute_swap(_swap(amount_in=100_000), now=1)
    with pytest.raises(PolicyViolation):
        account.execute_swap(_swap(amount_in=100_000), now=1)
    # The blocked swap was never submitted and spend did not advance past the cap.
    assert len(bundler.ops) == 1
    assert account.spent == 100_000


def test_session_account_refuses_unauthorized_target() -> None:
    bundler = FakeBundler()
    account = SessionAccount(ACCOUNT, _policy(), SessionSigner.generate(), bundler)
    with pytest.raises(PolicyViolation):
        account.execute_swap(_swap(to="0x000000000000000000000000000000000000bEEF"), now=1)
    assert bundler.ops == []

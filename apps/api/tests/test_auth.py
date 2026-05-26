from __future__ import annotations

import pytest
from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi.testclient import TestClient

from src.auth import router as auth_router
from src.config import settings
from src.main import app

client = TestClient(app)

OWNER = Account.create()
STRANGER = Account.create()


@pytest.fixture(autouse=True)
def _configure_owner(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "owner_address", OWNER.address)
    # Fresh nonce store per test so replay assertions are isolated.
    monkeypatch.setattr(
        auth_router,
        "nonce_store",
        type(auth_router.nonce_store)(ttl_seconds=600),
    )


def _build_message(address: str, nonce: str, domain: str = "localhost:3000") -> str:
    return (
        f"{domain} wants you to sign in with your Ethereum account:\n"
        f"{address}\n\n"
        "Sign in to Kronos Trader.\n\n"
        f"URI: http://{domain}\n"
        "Version: 1\n"
        "Chain ID: 84532\n"
        f"Nonce: {nonce}\n"
        "Issued At: 2026-05-26T00:00:00.000Z"
    )


def _sign(account: Account, message: str) -> str:
    signed = account.sign_message(encode_defunct(text=message))
    return signed.signature.hex()


def _fetch_nonce() -> str:
    response = client.get("/auth/nonce")
    assert response.status_code == 200
    return response.json()["nonce"]


def test_owner_can_authenticate_and_access_protected_route() -> None:
    nonce = _fetch_nonce()
    message = _build_message(OWNER.address, nonce)
    response = client.post(
        "/auth/verify",
        json={"message": message, "signature": _sign(OWNER, message)},
    )
    assert response.status_code == 200
    token = response.json()["token"]
    assert response.json()["address"] == OWNER.address.lower()

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["address"] == OWNER.address.lower()


def test_non_owner_is_forbidden() -> None:
    nonce = _fetch_nonce()
    message = _build_message(STRANGER.address, nonce)
    response = client.post(
        "/auth/verify",
        json={"message": message, "signature": _sign(STRANGER, message)},
    )
    assert response.status_code == 403


def test_nonce_cannot_be_replayed() -> None:
    nonce = _fetch_nonce()
    message = _build_message(OWNER.address, nonce)
    signature = _sign(OWNER, message)

    first = client.post("/auth/verify", json={"message": message, "signature": signature})
    assert first.status_code == 200

    replay = client.post("/auth/verify", json={"message": message, "signature": signature})
    assert replay.status_code == 400


def test_tampered_signature_rejected() -> None:
    nonce = _fetch_nonce()
    message = _build_message(OWNER.address, nonce)
    # Sign a different message than the one we submit.
    other = _build_message(OWNER.address, "0123456789abcdef")
    response = client.post(
        "/auth/verify",
        json={"message": message, "signature": _sign(OWNER, other)},
    )
    assert response.status_code == 400


def test_protected_route_requires_token() -> None:
    assert client.get("/auth/me").status_code == 401
    assert (
        client.get("/auth/me", headers={"Authorization": "Bearer not-a-token"}).status_code
        == 401
    )

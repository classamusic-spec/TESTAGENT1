"""SIWE auth endpoints for the owner."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from loguru import logger
from pydantic import BaseModel

from src.auth.nonce import NonceStore
from src.auth.session import create_session_token, verify_session_token
from src.auth.siwe import SiweError, verify_message
from src.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

nonce_store = NonceStore(ttl_seconds=settings.nonce_ttl_seconds)


class NonceResponse(BaseModel):
    nonce: str


class VerifyRequest(BaseModel):
    message: str
    signature: str


class SessionResponse(BaseModel):
    token: str
    address: str


class MeResponse(BaseModel):
    address: str


def get_current_owner(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """Resolve the authenticated owner address from a bearer token, or 401."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    address = verify_session_token(token)
    if address is None or address != settings.owner_address_normalized:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid session")
    return address


@router.get("/nonce", response_model=NonceResponse)
def get_nonce() -> NonceResponse:
    return NonceResponse(nonce=nonce_store.issue())


@router.post("/verify", response_model=SessionResponse)
def verify(payload: VerifyRequest) -> SessionResponse:
    if not settings.owner_address_normalized:
        # No owner configured: refuse to authenticate anyone (fail loud).
        logger.error("OWNER_ADDRESS is not configured; refusing SIWE verification")
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "owner not configured")

    try:
        parsed = verify_message(payload.message, payload.signature)
    except SiweError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    if parsed.address.lower() != settings.owner_address_normalized:
        logger.warning("Rejected SIWE sign-in from non-owner address {}", parsed.address)
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not the owner")

    if not nonce_store.consume(parsed.nonce):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid or expired nonce")

    address = parsed.address.lower()
    logger.info("Owner authenticated via SIWE: {}", address)
    return SessionResponse(token=create_session_token(address), address=address)


@router.get("/me", response_model=MeResponse)
def me(address: Annotated[str, Depends(get_current_owner)]) -> MeResponse:
    return MeResponse(address=address)


@router.post("/logout")
def logout() -> dict[str, bool]:
    # Stateless JWT: the client discards its token. Endpoint exists for symmetry.
    return {"ok": True}

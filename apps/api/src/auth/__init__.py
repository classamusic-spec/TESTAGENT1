"""SIWE authentication for the single owner of this personal bot.

There are deliberately no user accounts (CLAUDE.md Phase 2, scoped down): only
``settings.owner_address`` may authenticate. Sessions are stateless JWTs carried
as bearer tokens. Signature verification uses eth-account directly so we avoid
pulling in the heavier web3/siwe dependency stack.
"""

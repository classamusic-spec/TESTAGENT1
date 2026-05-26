"""Smart-account session keys (ERC-4337).

Non-custodial model: the owner grants the bot a session key scoped by a strict,
human-set policy (one DEX router, allowed function selectors, a spend cap, and an
expiry). The bot signs swaps with the session key but can never exceed the policy
and never touches the owner's main key. The policy is the security boundary and
is enforced here before anything is signed or sent.

This is smart-account / money-path code (testnet only during development),
flagged for human review. 4337 UserOp packing and bundling live behind a
provider seam (ZeroDev / Biconomy), which is faked in tests.
"""

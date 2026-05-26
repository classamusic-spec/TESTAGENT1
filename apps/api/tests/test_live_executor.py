from __future__ import annotations

from eth_abi import encode
from eth_utils import function_signature_to_4byte_selector

from src.accounts.manager import SessionAccount
from src.accounts.policy import SessionKeyPolicy
from src.accounts.provider import UserOperation
from src.accounts.signer import SessionSigner
from src.dex.swapper import DexSwapper
from src.dex.uniswap import UniswapV3Aggregator
from src.execution.live_executor import LiveExecutor
from src.execution.models import Fill
from src.risk.manager import RiskLimits, RiskManager

ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481"
QUOTER = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a"
ACCOUNT = "0x000000000000000000000000000000000000dEaD"
SELECTOR = "0x" + function_signature_to_4byte_selector(
    "exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))"
).hex()
CHAIN = 84532


def _eth_call(_to, _data):
    # QuoterV2 returns (amountOut, sqrtPriceX96After, ticksCrossed, gasEstimate).
    return "0x" + encode(["uint256", "uint160", "uint32", "uint256"], [1_000_000, 0, 0, 0]).hex()


class FakeBundler:
    def __init__(self) -> None:
        self.ops: list[UserOperation] = []

    def send_user_op(self, user_op: UserOperation) -> str:
        self.ops.append(user_op)
        return f"0xhash{len(self.ops)}"


def _executor(*, max_pos: float = 500.0, enabled: bool = True, on_fill=None) -> tuple[LiveExecutor, FakeBundler]:
    aggregator = UniswapV3Aggregator(ROUTER, QUOTER, eth_call=_eth_call)
    swapper = DexSwapper(CHAIN, aggregator)
    bundler = FakeBundler()
    policy = SessionKeyPolicy(
        chain_id=CHAIN,
        allowed_target=ROUTER,
        allowed_selectors=frozenset({SELECTOR}),
        spend_cap=10**30,
        valid_after=0,
        valid_until=10**12,
    )
    account = SessionAccount(ACCOUNT, policy, SessionSigner.generate(), bundler)
    risk = RiskManager(RiskLimits(max_position_size=max_pos, max_drawdown=0.5, trading_enabled=enabled))
    return LiveExecutor(CHAIN, swapper, account, risk, on_fill=on_fill), bundler


def test_long_signal_opens_long_via_session_key() -> None:
    fills: list[Fill] = []
    ex, bundler = _executor(on_fill=fills.append)
    result = ex.step("ETH/USDC", p_up=0.8, mark_price=3000.0, equity=10_000.0, now_ms=1)

    assert result.signal == "long"
    assert result.target_notional == 500.0
    assert result.tx_hash is not None
    assert len(bundler.ops) == 1  # one swap submitted through the session key
    assert ex.held_notional == 500.0
    assert fills and fills[0].side == "buy"


def test_short_signal_is_treated_as_flat_on_spot() -> None:
    ex, bundler = _executor()
    result = ex.step("ETH/USDC", p_up=0.1, mark_price=3000.0, equity=10_000.0, now_ms=1)
    # Short signal -> flat. From a flat start, nothing to do; never goes negative.
    assert result.signal == "flat"
    assert result.target_notional == 0.0
    assert result.tx_hash is None
    assert bundler.ops == []
    assert ex.held_notional == 0.0


def test_flip_long_then_short_sells_back_to_flat() -> None:
    ex, bundler = _executor()
    ex.step("ETH/USDC", p_up=0.8, mark_price=3000.0, equity=10_000.0, now_ms=1)  # long
    result = ex.step("ETH/USDC", p_up=0.1, mark_price=3100.0, equity=10_000.0, now_ms=2)  # -> flat
    assert result.signal == "flat"
    assert result.target_notional == 0.0
    assert len(bundler.ops) == 2  # buy then sell
    assert ex.held_notional == 0.0


def test_disabled_trading_stays_flat() -> None:
    ex, bundler = _executor(enabled=False)
    result = ex.step("ETH/USDC", p_up=0.9, mark_price=3000.0, equity=10_000.0, now_ms=1)
    assert result.halted
    assert result.target_notional == 0.0
    assert bundler.ops == []


def test_position_capped_by_risk_limit() -> None:
    ex, _ = _executor(max_pos=200.0)
    ex.step("ETH/USDC", p_up=0.9, mark_price=3000.0, equity=10_000.0, now_ms=1)
    assert ex.held_notional == 200.0  # clamped to the human-set cap, never above

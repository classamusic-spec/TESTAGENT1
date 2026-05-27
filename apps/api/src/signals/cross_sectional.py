"""Cross-sectional ranking + market-neutral allocation across the universe.

Instead of trading one asset on its own signal, we score every asset relative to
the others, go long the strongest and short the weakest, and rebalance
infrequently. This is the disciplined, low-turnover, diversified form of
"jumping around the top assets longing/shorting" — many small bets, dollar-
neutral so it can profit whether the market rises or falls. Deterministic; no
LLM/RL; allocations only ever scale within the gross-exposure budget.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Sequence

from src.data.ohlcv import Candle
from src.signals.sizing import realized_vol


@dataclass(frozen=True)
class CrossSectionalConfig:
    long_k: int = 3  # number of top-ranked assets to long
    short_k: int = 3  # number of bottom-ranked assets to short
    allow_short: bool = True
    gross_exposure: float = 1.0  # total |weight| deployed (1.0 = fully invested)

    def __post_init__(self) -> None:
        if self.long_k < 0 or self.short_k < 0 or (self.long_k + self.short_k) == 0:
            raise ValueError("need at least one long or short slot")
        if not 0.0 < self.gross_exposure <= 1.0:
            raise ValueError("gross_exposure must be in (0, 1]")


def rank_and_allocate(scores: dict[str, float], config: CrossSectionalConfig | None = None) -> dict[str, float]:
    """Signed target weights from per-asset scores (higher score = more bullish).

    Longs the top `long_k`, shorts the bottom `short_k`. When both sides are used
    the book is dollar-neutral (weights sum to ~0); gross |weight| == exposure.
    Assets not selected get weight 0.
    """
    cfg = config or CrossSectionalConfig()
    weights = {a: 0.0 for a in scores}
    if not scores:
        return weights

    ranked = sorted(scores, key=lambda a: scores[a], reverse=True)
    short_k = cfg.short_k if cfg.allow_short else 0
    long_k = min(cfg.long_k, len(ranked))
    short_k = min(short_k, max(0, len(ranked) - long_k))

    sides = (1 if long_k else 0) + (1 if short_k else 0)
    per_side = cfg.gross_exposure / sides if sides else 0.0

    for a in ranked[:long_k]:
        weights[a] = per_side / long_k
    if short_k:
        for a in ranked[len(ranked) - short_k:]:
            weights[a] = -per_side / short_k
    return weights


# --- Cross-sectional scoring functions (higher = more bullish) -----------------


def momentum_score(candles: Sequence[Candle], lookback: int = 6) -> float:
    """Raw return over `lookback` bars — the classic cross-sectional momentum."""
    if len(candles) <= lookback:
        return 0.0
    return candles[-1].close / candles[-1 - lookback].close - 1.0


def risk_adjusted_momentum(
    candles: Sequence[Candle], lookback: int = 6, vol_lookback: int = 24
) -> float:
    """Momentum normalized by recent volatility — rewards steady trends over
    noisy ones, which travels better across assets of different volatility."""
    mom = momentum_score(candles, lookback)
    vol = realized_vol(candles, vol_lookback)
    return mom / vol if vol > 0 else 0.0


def make_score_fn(
    kind: str = "momentum", lookback: int = 6, vol_lookback: int = 24
) -> Callable[[Sequence[Candle]], float]:
    """A score function (closed candles -> score) for the rotation backtest."""
    if kind == "risk_adjusted":
        return lambda c: risk_adjusted_momentum(c, lookback, vol_lookback)
    return lambda c: momentum_score(c, lookback)

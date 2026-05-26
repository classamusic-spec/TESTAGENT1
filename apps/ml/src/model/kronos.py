"""Adapter for the real Kronos foundation model.

Kronos (https://github.com/shiyu-coder/Kronos) needs torch and a GPU plus a
downloaded checkpoint, none of which run in CI or local dev. We keep the seam
here and import the heavy deps lazily so importing this module never pulls in
torch. Wiring the actual tokenizer/model forward pass is tracked for when a GPU
host is available; until then this backend fails loud rather than guessing.
"""

from __future__ import annotations

from src.contracts import Candle, Forecast


class KronosForecaster:
    name = "kronos"

    def __init__(self, checkpoint: str) -> None:
        self.checkpoint = checkpoint
        self.name = f"kronos:{checkpoint}"

    def forecast(
        self,
        pair: str,
        interval: str,
        candles: list[Candle],
        horizon: int,
    ) -> Forecast:
        try:
            import torch  # noqa: F401
        except ImportError as exc:
            raise RuntimeError(
                "Kronos backend requires torch and a GPU host. Set KRONOS_BACKEND=stub "
                "for development, or install the ML extras on a GPU machine."
            ) from exc

        # Real inference (tokenize closed candles -> sample -> aggregate to a
        # probabilistic forecast) is implemented on the GPU host. Per invariant 1
        # the candles passed here are already closed-only.
        raise NotImplementedError(
            "Kronos inference is wired on the GPU host; not available in this environment."
        )

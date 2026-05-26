"""Global trading kill switch.

When halted, the execution loops flatten and stop opening positions. This only
ever halts trading (the safe direction); it cannot raise limits or authority.
"""

from __future__ import annotations


class TradingControl:
    def __init__(self) -> None:
        self._halted = False
        self.reason: str | None = None

    @property
    def halted(self) -> bool:
        return self._halted

    def halt(self, reason: str = "manual kill switch") -> None:
        self._halted = True
        self.reason = reason

    def resume(self) -> None:
        self._halted = False
        self.reason = None


# Process-wide singleton consulted by the execution loops.
control = TradingControl()

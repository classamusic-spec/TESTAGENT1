"""Download real historical hourly OHLCV to data_cache/ (one-off, read-only).

Pulls static CSVs from cryptodatadownload.com (Binance history) — NOT a live
exchange API and not a trading path. Used only to feed the offline backtest
harness (scripts/real_data_test.py) with real market data. data_cache/ is
generated and not committed.

Usage (from apps/api):  python -m scripts.fetch_data ETHUSDT BTCUSDT
"""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

BASE = "https://www.cryptodatadownload.com/cdd/Binance_{sym}_1h.csv"


def fetch(symbol: str) -> int:
    Path("data_cache").mkdir(exist_ok=True)
    req = urllib.request.Request(BASE.format(sym=symbol), headers={"User-Agent": "Mozilla/5.0"})
    data = urllib.request.urlopen(req, timeout=90).read().decode("utf-8", "ignore")
    out = Path("data_cache") / f"{symbol}_1h.csv"
    out.write_text(data)
    return len(data.splitlines())


def main() -> None:
    symbols = sys.argv[1:] or ["ETHUSDT", "BTCUSDT"]
    for sym in symbols:
        try:
            print(f"{sym}: {fetch(sym)} rows -> data_cache/{sym}_1h.csv")
        except Exception as e:  # noqa: BLE001 - report and continue
            print(f"{sym}: FAILED {type(e).__name__} {e}")


if __name__ == "__main__":
    main()

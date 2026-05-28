"""Real funding-rate carry test on Binance historical data.

Pulls monthly funding-rate CSVs from data.binance.vision (a static public CDN —
not a trading API) for the requested symbol and year, caches them, and runs the
delta-neutral carry strategy across a few configs. Reports an honest annualized
return + Sharpe + drawdown.

Usage (from apps/api):  python -m scripts.funding_carry_test ETHUSDT 2024
"""

from __future__ import annotations

import csv
import io
import sys
import urllib.request
import zipfile
from pathlib import Path

from src.backtest.funding_carry import FundingCarryConfig, run_funding_carry

CACHE = Path("data_cache/funding")
URL = "https://data.binance.vision/data/futures/um/monthly/fundingRate/{sym}/{sym}-fundingRate-{ym}.zip"


def load_year(symbol: str, year: int) -> list[float]:
    CACHE.mkdir(parents=True, exist_ok=True)
    rates: list[float] = []
    for m in range(1, 13):
        ym = f"{year}-{m:02d}"
        zpath = CACHE / f"{symbol}-{ym}.zip"
        if not zpath.exists():
            try:
                req = urllib.request.Request(URL.format(sym=symbol, ym=ym), headers={"User-Agent": "Mozilla/5.0"})
                zpath.write_bytes(urllib.request.urlopen(req, timeout=30).read())
            except Exception as exc:  # noqa: BLE001
                print(f"  {ym} skipped: {type(exc).__name__}")
                continue
        with zipfile.ZipFile(zpath) as zf:
            with zf.open(zf.namelist()[0]) as f:
                reader = csv.reader(io.TextIOWrapper(f, "utf-8"))
                next(reader, None)
                for row in reader:
                    try:
                        rates.append(float(row[2]))  # last_funding_rate
                    except (ValueError, IndexError):
                        continue
    return rates


def main() -> None:
    symbol = sys.argv[1] if len(sys.argv) > 1 else "ETHUSDT"
    year = int(sys.argv[2]) if len(sys.argv) > 2 else 2024
    print(f"Loading {symbol} funding rates for {year}...")
    rates = load_year(symbol, year)
    if not rates:
        print("No data loaded.")
        return
    days = len(rates) / 3
    mean = sum(rates) / len(rates)
    print(f"\nReal funding history: {len(rates)} payments over ~{days:.0f} days (8h intervals)")
    print(f"Mean rate {mean * 100:.4f}% per interval  ->  annualized ~{mean * 3 * 365 * 100:.2f}%")
    print(f"\n{'config':<26}{'net':>10}{'carry':>10}{'fees':>9}{'flips':>7}{'sharpe':>9}{'maxDD':>9}{'ann':>9}")
    configs = [
        ("threshold 2bps fee 5", FundingCarryConfig(flip_threshold_bps=2, leg_fee_bps=5)),
        ("threshold 5bps fee 5", FundingCarryConfig(flip_threshold_bps=5, leg_fee_bps=5)),
        ("threshold 10bps fee 5", FundingCarryConfig(flip_threshold_bps=10, leg_fee_bps=5)),
        ("threshold 5bps fee 10", FundingCarryConfig(flip_threshold_bps=5, leg_fee_bps=10)),
        ("threshold 5bps fee 20", FundingCarryConfig(flip_threshold_bps=5, leg_fee_bps=20)),
    ]
    for label, cfg in configs:
        r = run_funding_carry(rates, cfg)
        annual = ((1 + r.total_return) ** (365 / days) - 1) * 100
        print(
            f"{label:<26}{r.total_return * 100:+9.3f}%{r.total_carry * 100:+9.3f}%{r.total_fees * 100:7.3f}%"
            f"{r.n_flips:>7}{r.sharpe:>+9.3f}{r.max_drawdown * 100:>8.3f}%{annual:>+8.2f}%"
        )


if __name__ == "__main__":
    main()

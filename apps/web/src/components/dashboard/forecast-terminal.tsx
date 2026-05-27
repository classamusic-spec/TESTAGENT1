"use client";

import { Camera, GitCompare, LineChart, Maximize2, Settings } from "lucide-react";
import { useMemo } from "react";
import type { Candle, Forecast, TradingPair } from "@kronos/shared";

import { CandleChart } from "@/components/ui/candle-chart";
import { cn, formatPrice } from "@/lib/utils";

const TF = ["1m", "5m", "15m", "1h", "4h", "1D"];
const RANGES = ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "All"];

export function ForecastTerminal({
  pair,
  candles,
  forecast,
}: {
  pair: TradingPair;
  candles: Candle[];
  forecast: Forecast;
}) {
  const v = useMemo(() => {
    const ohlcv = candles.map((c) => ({ o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume }));
    const band = {
      median: forecast.steps.map((s) => s.close),
      lower: forecast.steps.map((s) => s.lower),
      upper: forecast.steps.map((s) => s.upper),
    };
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2] ?? last;
    const chg = last && prev ? last.close - prev.close : 0;
    const chgPct = last && prev && prev.close ? (chg / prev.close) * 100 : 0;
    const labels: string[] = [];
    const n = candles.length;
    for (let i = 0; i < 6; i++) {
      const c = candles[Math.round((i / 5) * (n - 1))];
      labels.push(c ? new Date(c.openTime).toLocaleDateString([], { month: "short", day: "numeric" }) : "");
    }
    return { ohlcv, band, last, chg, chgPct, labels };
  }, [candles, forecast]);

  const last = v.last;

  return (
    <div className="glass ring-gradient card-glow overflow-hidden rounded-2xl">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold">{pair}</span>
          <div className="hidden items-center gap-0.5 rounded-lg border border-border/60 bg-secondary/40 p-0.5 sm:flex">
            {TF.map((t) => (
              <span
                key={t}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium",
                  t === "1h" ? "bg-primary/15 text-primary" : "text-muted-foreground",
                )}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="hidden items-center gap-1.5 sm:flex">
            <LineChart className="h-3.5 w-3.5" /> Indicators
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <GitCompare className="h-3.5 w-3.5" /> Compare
          </span>
          <span className="flex items-center gap-2 text-muted-foreground/70">
            <Maximize2 className="h-3.5 w-3.5" />
            <Settings className="h-3.5 w-3.5" />
            <Camera className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {/* sub-header: pair meta + OHLC + legend */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 px-4 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-muted-foreground">
            {pair.replace("/", " / ")} · {forecast.interval} · Lodestar
          </span>
          {last && (
            <span className="font-mono text-muted-foreground">
              O <span className="text-foreground">{formatPrice(last.open)}</span> H{" "}
              <span className="text-foreground">{formatPrice(last.high)}</span> L{" "}
              <span className="text-foreground">{formatPrice(last.low)}</span> C{" "}
              <span className="text-foreground">{formatPrice(last.close)}</span>{" "}
              <span className={v.chg >= 0 ? "text-primary" : "text-danger"}>
                {v.chg >= 0 ? "+" : ""}
                {v.chg.toFixed(2)} ({v.chgPct >= 0 ? "+" : ""}
                {v.chgPct.toFixed(2)}%)
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded bg-danger" /> Price (candles)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded border-b border-dashed border-primary" /> Forecast (p50)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded bg-primary/30" /> Confidence (80%)
          </span>
        </div>
      </div>

      <CandleChart candles={v.ohlcv} forecast={v.band} timeLabels={v.labels} className="h-[380px] w-full px-2" />

      {/* range tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-4 py-2 text-xs">
        <div className="flex items-center gap-0.5">
          {RANGES.map((r) => (
            <span
              key={r}
              className={cn(
                "rounded-md px-2 py-0.5 font-medium",
                r === "1D" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 font-mono text-muted-foreground/70">
          <span>{new Date(forecast.generatedAt).toUTCString().slice(17, 25)} (UTC)</span>
          <span>% · log · auto</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import type { Candle, Forecast, TradingPair } from "@kronos/shared";

import { TokenAvatar } from "@/components/dashboard/asset-select";
import { CandleChart } from "@/components/ui/candle-chart";
import { BarMeter, Gauge, Sparkline, WinLossBar } from "@/components/ui/metrics";
import { computeAnalytics } from "@/lib/analytics";
import { simulatePaperRun } from "@/lib/paper-sim";
import { cn, formatPrice } from "@/lib/utils";

const TF = ["1m", "5m", "15m", "1h", "4h", "1D"];

function HeaderStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-mono text-sm font-semibold", accent && "text-primary")}>{value}</p>
    </div>
  );
}

function SideCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border/50 px-4 py-3 last:border-b-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function compact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

export function MarketTerminal({
  pair,
  candles,
  forecast,
}: {
  pair: TradingPair;
  candles: Candle[];
  forecast: Forecast;
}) {
  const symbol = pair.split("/")[0]!;
  const view = useMemo(() => {
    const ohlcv = candles.map((c) => ({ o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume }));
    const band = {
      median: forecast.steps.map((s) => s.close),
      lower: forecast.steps.map((s) => s.lower),
      upper: forecast.steps.map((s) => s.upper),
    };
    const last = candles.length ? candles[candles.length - 1]!.close : 0;
    const dayAgo = candles[Math.max(0, candles.length - 25)]?.close ?? last;
    const win = candles.slice(-24);
    const high = Math.max(...win.map((c) => c.high), last);
    const low = Math.min(...win.map((c) => c.low), last);
    const vol = win.reduce((a, c) => a + c.volume, 0) * last;
    const change = dayAgo ? (last / dayAgo - 1) * 100 : 0;
    const modelFc = last && band.median.length ? (band.median[band.median.length - 1]! / last - 1) * 100 : 0;

    const run = simulatePaperRun(candles);
    const stats = computeAnalytics(run);
    const labels: string[] = [];
    const n = candles.length;
    for (let i = 0; i < 6; i++) {
      const c = candles[Math.round((i / 5) * (n - 1))];
      labels.push(
        c
          ? new Date(c.openTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
      );
    }
    return { ohlcv, band, last, high, low, vol, change, modelFc, stats, run, labels };
  }, [candles, forecast]);

  const pUp = forecast.pUp;
  const sentiment = Math.round(pUp * 100);
  const sentimentLabel = sentiment >= 60 ? "Bullish" : sentiment <= 40 ? "Bearish" : "Neutral";
  const conviction = Math.min(10, Math.abs(pUp - 0.5) * 2 * 10 + 2);
  const up = view.change >= 0;

  return (
    <div className="glass ring-gradient card-glow overflow-hidden rounded-2xl">
      <div className="grid lg:grid-cols-[1fr_232px]">
        <div className="min-w-0 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1.5">
                <TokenAvatar symbol={symbol} className="h-5 w-5 text-[9px]" />
                <span className="text-sm font-semibold">{pair}</span>
              </span>
              <div className="hidden items-center gap-1 rounded-lg border border-border/60 bg-secondary/40 p-0.5 sm:flex">
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
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live
              </span>
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-medium text-primary">
                Model ON
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="font-mono text-3xl font-bold">
                {formatPrice(view.last)}{" "}
                <span className="text-sm font-medium text-muted-foreground">{pair.split("/")[1]}</span>
              </p>
              <p className={cn("mt-0.5 font-mono text-sm font-medium", up ? "text-primary" : "text-danger")}>
                {up ? "+" : ""}
                {view.change.toFixed(2)}%
              </p>
            </div>
            <HeaderStat label="24h High" value={formatPrice(view.high)} />
            <HeaderStat label="24h Low" value={formatPrice(view.low)} />
            <HeaderStat label="24h Vol" value={compact(view.vol)} />
            <div className="ml-auto text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Model Forecast</p>
              <p className={cn("mt-0.5 font-mono text-sm font-semibold", view.modelFc >= 0 ? "text-primary" : "text-danger")}>
                {view.modelFc >= 0 ? "+" : ""}
                {view.modelFc.toFixed(2)}%
              </p>
            </div>
          </div>

          <CandleChart
            candles={view.ohlcv}
            forecast={view.band}
            timeLabels={view.labels}
            className="mt-3 h-[280px] w-full"
          />
        </div>

        <div className="border-t border-border/50 lg:border-l lg:border-t-0">
          <SideCard label="Model PnL (paper)">
            <p className={cn("font-mono text-2xl font-bold", view.stats.totalReturnPct >= 0 ? "text-primary" : "text-danger")}>
              {view.stats.totalReturnPct >= 0 ? "+" : ""}
              {view.stats.totalReturnPct.toFixed(2)}%
            </p>
            <Sparkline data={view.run.equityCurve.map((p) => p.equity)} height={34} className="mt-1" />
          </SideCard>
          <SideCard label="Win Rate">
            <p className="font-mono text-2xl font-bold">{(view.stats.winRateBars * 100).toFixed(1)}%</p>
            <div className="mt-2">
              <WinLossBar winRate={view.stats.winRateBars} />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Wins {(view.stats.winRateBars * 100).toFixed(1)}%</span>
                <span>Losses {((1 - view.stats.winRateBars) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </SideCard>
          <SideCard label="Market Sentiment">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Gauge value={sentiment} />
              </div>
              <div className="text-right">
                <p className={cn("text-sm font-semibold", sentiment >= 60 ? "text-primary" : sentiment <= 40 ? "text-danger" : "text-foreground")}>
                  {sentimentLabel}
                </p>
                <p className="text-[11px] text-muted-foreground">{sentiment} / 100</p>
              </div>
            </div>
          </SideCard>
          <SideCard label="Setup Strength">
            <p className="text-sm font-semibold text-primary">
              {conviction >= 7 ? "High Conviction" : conviction >= 4 ? "Moderate" : "Low Conviction"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <BarMeter value={conviction} className="flex-1" />
              <span className="font-mono text-xs text-muted-foreground">{conviction.toFixed(1)} / 10</span>
            </div>
          </SideCard>
        </div>
      </div>
    </div>
  );
}

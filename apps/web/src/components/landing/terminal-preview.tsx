"use client";

import { ChevronDown } from "lucide-react";

import { CandleChart } from "@/components/ui/candle-chart";
import { BarMeter, Gauge, Sparkline, WinLossBar } from "@/components/ui/metrics";
import { genCandles, genForecast } from "@/lib/market-mock";
import { cn } from "@/lib/utils";

const candles = genCandles(42, 46, 64200, 0.013);
const forecast = genForecast(candles[candles.length - 1]!.c, 10, 11);
const TIMES = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00"];
const TF = ["1m", "5m", "15m", "1h", "4h", "1D"];
const pnlSeries = genCandles(9, 30, 100, 0.02).map((c) => c.c);
const flowSeries = genCandles(5, 24, 50, 0.05).map((c) => c.c);

function HeaderStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-mono text-sm font-semibold", accent && "text-primary")}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SideCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/50 px-4 py-3 last:border-b-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function BottomTile({
  label,
  value,
  sub,
  tone,
  spark,
  bars,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
  spark?: number[];
  bars?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-base font-semibold",
          tone === "up" && "text-primary",
          tone === "down" && "text-danger",
        )}
      >
        {value}
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">{sub}</span>
        {spark && <Sparkline data={spark} height={16} className="w-12" />}
        {bars && (
          <span className="flex items-end gap-[2px]">
            {[3, 5, 4, 6, 5, 7, 6].map((hgt, i) => (
              <span key={i} className="w-[3px] rounded-sm bg-primary/70" style={{ height: hgt }} />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

export function TerminalPreview() {
  return (
    <div className="glass ring-gradient card-glow overflow-hidden rounded-2xl">
      <div className="grid lg:grid-cols-[1fr_232px]">
        {/* Main column */}
        <div className="min-w-0 p-4">
          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f7931a] text-[11px] font-bold text-black">
                  ₿
                </span>
                <span className="text-sm font-semibold">BTC / USDT</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="hidden items-center gap-1 rounded-lg border border-border/60 bg-secondary/40 p-0.5 sm:flex">
                {TF.map((t) => (
                  <span
                    key={t}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium",
                      t === "5m" ? "bg-primary/15 text-primary" : "text-muted-foreground",
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
              <span className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-medium text-primary">
                Model ON
              </span>
            </div>
          </div>

          {/* Price + stats */}
          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="font-mono text-3xl font-bold">
                67,842.31 <span className="text-sm font-medium text-muted-foreground">USDT</span>
              </p>
              <p className="mt-0.5 font-mono text-sm font-medium text-primary">+1,274.82 +1.91%</p>
            </div>
            <HeaderStat label="24h High" value="68,124.57" />
            <HeaderStat label="24h Low" value="66,213.19" />
            <HeaderStat label="24h Vol" value="24.31B USDT" />
            <div className="ml-auto text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Model Forecast</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-primary">+6.45%</p>
            </div>
          </div>

          {/* Chart */}
          <CandleChart candles={candles} forecast={forecast} timeLabels={TIMES} className="mt-3 h-[260px] w-full" />

          {/* Bottom tiles */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <BottomTile label="Order Flow (24h)" value="+1.28B" sub="Net Buy" tone="up" spark={flowSeries} />
            <BottomTile label="Spread" value="0.02%" sub="Tight" bars />
            <BottomTile label="Funding (8h)" value="0.006%" sub="Longs Pay" tone="down" bars />
            <BottomTile label="Volatility (24h)" value="2.38%" sub="Normal" spark={flowSeries} />
          </div>
        </div>

        {/* Right metric column */}
        <div className="border-t border-border/50 lg:border-l lg:border-t-0">
          <SideCard label="Model PnL (7D)">
            <p className="font-mono text-2xl font-bold text-primary">+12.48%</p>
            <Sparkline data={pnlSeries} height={34} className="mt-1" />
          </SideCard>
          <SideCard label="Win Rate">
            <p className="font-mono text-2xl font-bold">62.7%</p>
            <div className="mt-2">
              <WinLossBar winRate={0.627} />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Wins 62.7%</span>
                <span>Losses 37.3%</span>
              </div>
            </div>
          </SideCard>
          <SideCard label="Market Sentiment">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Gauge value={72} />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-primary">Bullish</p>
                <p className="text-[11px] text-muted-foreground">72 / 100</p>
              </div>
            </div>
          </SideCard>
          <SideCard label="Setup Strength">
            <p className="text-sm font-semibold text-primary">High Conviction</p>
            <div className="mt-2 flex items-center gap-2">
              <BarMeter value={8.6} className="flex-1" />
              <span className="font-mono text-xs text-muted-foreground">8.6 / 10</span>
            </div>
          </SideCard>
        </div>
      </div>
    </div>
  );
}

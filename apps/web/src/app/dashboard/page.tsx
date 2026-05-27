"use client";

import { motion } from "framer-motion";
import { Activity, ArrowUpRight, ChevronDown, RefreshCw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { Candle, Forecast, TradingPair } from "@kronos/shared";

import { AssetSelect, TokenAvatar } from "@/components/dashboard/asset-select";
import { BotLiveView } from "@/components/dashboard/bot-live-view";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DepositCard } from "@/components/dashboard/deposit-card";
import { ExperienceToggle } from "@/components/dashboard/experience-toggle";
import { ForecastSummary } from "@/components/dashboard/forecast-summary";
import { ForecastSteps } from "@/components/dashboard/forecast-steps";
import { ForecastTerminal } from "@/components/dashboard/forecast-terminal";
import { ModelStatusPanel } from "@/components/dashboard/model-status-panel";
import { NetworkBadge } from "@/components/dashboard/network-badge";
import { PaperPanel } from "@/components/dashboard/paper-panel";
import { RiskPanel } from "@/components/dashboard/risk-panel";
import { SessionKeyPanel } from "@/components/dashboard/session-key-panel";
import { StatCard } from "@/components/dashboard/stat-card";
import { StrategyStateCard } from "@/components/dashboard/strategy-state";
import { SystemStatusBar } from "@/components/dashboard/system-status-bar";
import { WatchlistRow } from "@/components/dashboard/watchlist-row";
import { LiveTicker } from "@/components/landing/live-ticker";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Gauge, RingGauge } from "@/components/ui/metrics";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { useExperienceMode } from "@/lib/experience-mode";
import { useForecast } from "@/lib/forecast";
import { fadeUp } from "@/lib/motion";
import { cn, formatPrice } from "@/lib/utils";

function realizedVolPct(closes: number[], n = 24): number {
  const w = closes.slice(-(n + 1));
  if (w.length < 3) return 0;
  const r = w.slice(1).map((c, i) => c / w[i]! - 1);
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const variance = r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length;
  return Math.sqrt(variance) * 100;
}

function GaugeCard({ label, value, tag, tagTone }: { label: string; value: number; tag: string; tagTone?: string }) {
  return (
    <div className="glass ring-gradient rounded-xl p-3.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <div className="flex-1">
          <Gauge value={value} />
        </div>
        <div className="text-right">
          <p className={cn("text-sm font-semibold", tagTone ?? "text-primary")}>{tag}</p>
          <p className="text-[11px] text-muted-foreground">{value} / 100</p>
        </div>
      </div>
    </div>
  );
}

function Overview({ pair, candles, forecast }: { pair: TradingPair; candles: Candle[]; forecast: Forecast }) {
  const m = useMemo(() => {
    const closes = candles.map((c) => c.close);
    const last = closes[closes.length - 1] ?? 0;
    const dayAgo = closes[Math.max(0, closes.length - 25)] ?? last;
    const chgPct = dayAgo ? (last / dayAgo - 1) * 100 : 0;
    const chgAbs = last - dayAgo;
    const vol = realizedVolPct(closes);
    const conf = Math.max(0, Math.min(100, Math.round(60 + Math.abs(forecast.pUp - 0.5) * 120)));
    return { closes, last, chgPct, chgAbs, vol, conf, spark: closes.slice(-28) };
  }, [candles, forecast]);

  const pUpPct = Math.round(forecast.pUp * 100);
  const isLong = forecast.pUp >= 0.5;
  const confLabel = m.conf >= 70 ? "High" : m.conf >= 50 ? "Medium" : "Low";
  const quote = pair.split("/")[1];

  return (
    <div className="space-y-5">
      {/* Stat row 1 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Last price" value={formatPrice(m.last)} spark={m.spark} />
        <StatCard
          label="24h Change"
          value={`${m.chgPct >= 0 ? "▲" : "▼"} ${Math.abs(m.chgPct).toFixed(2)}%`}
          valueTone={m.chgPct >= 0 ? "up" : "down"}
          sub={`${m.chgAbs >= 0 ? "+" : "-"}$${Math.abs(m.chgAbs).toFixed(2)}`}
          spark={m.spark}
        />
        <StatCard
          label="Probability up"
          value={`${pUpPct}%`}
          sub="Next 12 steps"
          right={<RingGauge value={pUpPct} />}
        />
        <StatCard
          label="Signal"
          value={
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className={cn("h-5 w-5", isLong ? "text-primary" : "rotate-90 text-danger")} />
              {isLong ? "Long" : "Short"}
            </span>
          }
          valueTone={isLong ? "up" : "down"}
        />
        <StatCard label="Volatility (24h)" value={`${m.vol.toFixed(2)}%`} sub="Normal" spark={m.spark} />
        <StatCard
          label="Confidence"
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          value={confLabel}
          valueTone="up"
          sub={`${m.conf} / 100`}
          right={<ShieldCheck className="h-7 w-7 text-primary/40" />}
        />
      </div>

      {/* Stat row 2 — market */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <GaugeCard label="Market sentiment" value={72} tag="Bullish" />
        <StatCard label="BTC/USDT" value="67,842.31" sub="+1.91%" subTone="up" spark={m.spark} />
        <StatCard label="ETH/USDC" value="3,102.40" sub="+2.47%" subTone="up" spark={m.spark} />
        <StatCard label="Total Mkt Cap" value="2.41T" sub="+1.37%" subTone="up" spark={m.spark} />
        <GaugeCard label="Fear & Greed" value={63} tag="Greed" />
        <StatCard label="24h Vol (all)" value="$98.42B" sub="+6.18%" subTone="up" spark={m.spark} />
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ForecastTerminal pair={pair} candles={candles} forecast={forecast} />
        </div>
        <div className="space-y-5">
          <ForecastSummary forecast={forecast} />
          <RiskPanel />
          <SessionKeyPanel />
          <StrategyStateCard />
        </div>
      </div>

      {/* Paper loop + model */}
      <div className="grid gap-5 lg:grid-cols-2">
        <PaperPanel candles={candles} symbol={pair.split("/")[0]} />
        <ModelStatusPanel />
      </div>

      <WatchlistRow />
      <ForecastSteps forecast={forecast} lastClose={m.last} />
      <p className="sr-only">{quote}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [pair, setPair] = useState<TradingPair>("ETH/USDC");
  const { data, isLoading } = useForecast(pair);
  const mode = useExperienceMode((s) => s.mode);
  const newbie = mode === "newbie";
  const updated = data ? new Date(data.forecast.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="relative flex min-h-screen flex-col">
      <AuroraBackground className="h-[380px]" />

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-primary text-primary-foreground shadow-[0_2px_12px_-2px_hsl(158_84%_45%/0.6)]">
                <Activity className="h-5 w-5" />
              </span>
              Lodestar
            </a>
            <DashboardNav />
          </div>
          <div className="flex items-center gap-3">
            <ExperienceToggle />
            <NetworkBadge />
            <AssetSelect selected={pair} onSelect={setPair} />
            <ConnectWalletButton />
          </div>
        </div>
      </header>

      <LiveTicker />

      <motion.main
        className="container flex-1 space-y-5 py-6"
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-inset ring-primary/20">
              <TokenAvatar symbol={pair.split("/")[0]!} className="h-7 w-7 text-[10px]" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {newbie ? (
                  "Your trading bot"
                ) : (
                  <>
                    <span className="font-mono">{pair}</span> forecast
                  </>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {newbie
                  ? "Add funds and let the AI trade — you keep custody."
                  : "Probabilistic 12-step outlook · Top-20 universe"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="text-right">
              <span className="flex items-center justify-end gap-1.5 text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live data
              </span>
              <span className="block">Updated {updated}</span>
            </span>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-secondary/40 text-muted-foreground transition-colors hover:text-foreground">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="h-[600px] w-full rounded-2xl shimmer" />
        ) : newbie ? (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
              <DepositCard />
              <BotLiveView candles={data.candles} symbol={pair.split("/")[0]} />
            </div>
            <details className="group rounded-2xl border border-border/50 bg-secondary/15">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                <span>Market details &amp; model internals</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-border/50 p-4">
                <Overview pair={pair} candles={data.candles} forecast={data.forecast} />
              </div>
            </details>
          </div>
        ) : (
          <Overview pair={pair} candles={data.candles} forecast={data.forecast} />
        )}
      </motion.main>

      <SystemStatusBar />
    </div>
  );
}

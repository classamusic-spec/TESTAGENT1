"use client";

import { Bot, Layers, Pause, Play, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { Candle } from "@kronos/shared";

import { configForDeposit, runAutoStrategy, type AutoStep, type AutoTrade, type TradeReason } from "@/lib/auto-trader";
import { useBotAccount } from "@/lib/bot-account";
import { narrate } from "@/lib/explain";
import { genCandles } from "@/lib/market-mock";
import { combinePortfolio } from "@/lib/portfolio";
import { resampleCandles, TIMEFRAME_FACTOR, type Timeframe } from "@/lib/resample";
import { cn, formatPrice } from "@/lib/utils";

const BASKET = ["BTC", "ETH", "SOL", "BNB"];

function seedFor(symbol: string): number {
  return [...symbol].reduce((a, ch) => a + ch.charCodeAt(0), 7);
}

function seriesFor(symbol: string, timeframe: Timeframe): Candle[] {
  const hourly: Candle[] = genCandles(seedFor(symbol), 720, 3000, 0.013).map((c, i) => ({
    openTime: i * 3_600_000,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
    volume: c.v,
    closed: true,
  }));
  return resampleCandles(hourly, TIMEFRAME_FACTOR[timeframe]);
}

const LABEL: Record<TradeReason, string> = {
  open_long: "Long",
  open_short: "Short",
  flip: "Flip",
  signal_exit: "Close",
  stop_loss: "Stop",
  take_profit: "Target",
};
const IS_CLOSE: Partial<Record<TradeReason, boolean>> = {
  flip: true,
  signal_exit: true,
  stop_loss: true,
  take_profit: true,
};

function Tile({ label, value, tone, sub }: { label: string; value: string; tone?: "up" | "down"; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-secondary/25 px-3.5 py-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-mono text-xl font-bold", tone === "up" && "text-primary", tone === "down" && "text-danger")}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

interface SingleModel {
  mode: "single";
  curve: number[];
  steps: AutoStep[];
  trades: AutoTrade[];
}
interface PortfolioModel {
  mode: "portfolio";
  curve: number[];
  perAsset: { symbol: string; returnPct: number }[];
  maxDrawdownPct: number;
}

export function BotLiveView({ symbol = "ETH" }: { candles?: Candle[]; symbol?: string }) {
  const { deposit, riskLevel, timeframe, diversify, running } = useBotAccount();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const model: SingleModel | PortfolioModel = useMemo(() => {
    const cfg = configForDeposit(deposit, riskLevel);
    if (diversify) {
      const runs = BASKET.map((s) => ({ symbol: s, run: runAutoStrategy(seriesFor(s, timeframe), cfg) }));
      const port = combinePortfolio(runs, deposit);
      return { mode: "portfolio", curve: port.curve.map((p) => p.equity), perAsset: port.perAsset, maxDrawdownPct: port.maxDrawdownPct };
    }
    const run = runAutoStrategy(seriesFor(symbol, timeframe), cfg);
    return { mode: "single", curve: run.steps.map((s) => s.equity), steps: run.steps, trades: run.trades };
  }, [symbol, deposit, riskLevel, timeframe, diversify]);

  const last = model.curve.length - 1;

  useEffect(() => {
    setIdx(0);
    setPaused(false);
  }, [running, deposit, riskLevel, timeframe, diversify, symbol]);

  useEffect(() => {
    if (!running || paused) return;
    const id = setTimeout(() => setIdx((i) => (i >= last ? 0 : i + 1)), 280);
    return () => clearTimeout(id);
  }, [running, paused, idx, last]);

  if (!running) {
    return (
      <div className="glass ring-gradient flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
          <Bot className="h-6 w-6" />
        </span>
        <p className="text-lg font-semibold">Your bot is idle</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Set an amount and risk level, then press <span className="font-medium text-foreground">Start bot</span>.
          The AI handles entries, exits and stops — you just watch.
        </p>
      </div>
    );
  }

  const cur = Math.min(idx, last);
  const balance = model.curve[cur] ?? deposit;
  const profit = balance - deposit;
  const profitPct = deposit > 0 ? (profit / deposit) * 100 : 0;
  const chartData = model.curve.slice(0, cur + 1).map((equity) => ({ equity }));

  return (
    <div className="glass ring-gradient card-glow space-y-5 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary">
            {model.mode === "portfolio" ? <Layers className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
          </span>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              Bot is trading
              <span className="flex items-center gap-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="capitalize">{riskLevel}</span> ·{" "}
              {model.mode === "portfolio" ? `${BASKET.length} assets` : `${symbol}/USDC`} · {timeframe} · paper
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      {model.mode === "single" ? (
        <SingleBody model={model} cur={cur} deposit={deposit} balance={balance} profit={profit} profitPct={profitPct} chartData={chartData} />
      ) : (
        <PortfolioBody model={model} deposit={deposit} balance={balance} profit={profit} profitPct={profitPct} chartData={chartData} />
      )}
    </div>
  );
}

function EquityChart({ data, deposit }: { data: { equity: number }[]; deposit: number }) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="bot-equity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(158 84% 45%)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(158 84% 45%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <ReferenceLine y={deposit} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{ background: "hsl(222 44% 9% / 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
            labelFormatter={() => ""}
            formatter={(v: number) => [formatPrice(v), "balance"]}
          />
          <Area type="monotone" dataKey="equity" stroke="hsl(158 84% 45%)" strokeWidth={2} fill="url(#bot-equity)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SingleBody(props: {
  model: SingleModel;
  cur: number;
  deposit: number;
  balance: number;
  profit: number;
  profitPct: number;
  chartData: { equity: number }[];
}) {
  const { model, cur, deposit, balance, profit, profitPct, chartData } = props;
  const step = model.steps[cur] ?? model.steps[0];
  const visible = model.trades.filter((t) => t.index <= cur);
  const lastTrade = visible[visible.length - 1];
  const closes = visible.filter((t) => IS_CLOSE[t.reason]);
  const wins = closes.filter((t) => t.realizedPnl > 0).length;
  const winRate = closes.length ? (wins / closes.length) * 100 : 0;

  return (
    <>
      <p className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2.5 text-sm text-foreground/90">
        {step ? narrate(step, lastTrade) : "Starting up…"}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Balance" value={formatPrice(balance)} />
        <Tile label="Profit" value={`${profit >= 0 ? "+" : "-"}$${Math.abs(profit).toFixed(2)}`} tone={profit >= 0 ? "up" : "down"} sub={`${profitPct >= 0 ? "+" : ""}${profitPct.toFixed(2)}%`} />
        <Tile label="Win rate" value={`${winRate.toFixed(0)}%`} sub={`${wins}/${closes.length} closed`} />
        <Tile label="Trades" value={`${visible.length}`} />
      </div>
      <EquityChart data={chartData} deposit={deposit} />
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">Recent trades</p>
        <div className="space-y-1.5">
          {visible.length === 0 && <p className="text-sm text-muted-foreground">Scanning the market for a setup…</p>}
          {visible
            .slice()
            .reverse()
            .slice(0, 6)
            .map((t, i) => {
              const close = IS_CLOSE[t.reason];
              const win = t.realizedPnl > 0;
              return (
                <div key={`${t.index}-${i}`} className="flex items-center gap-3 rounded-lg bg-secondary/30 px-3 py-2 text-sm">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", t.reason === "open_long" || t.reason === "take_profit" ? "bg-primary/15 text-primary" : t.reason === "stop_loss" ? "bg-danger/15 text-danger" : "bg-secondary text-muted-foreground")}>
                    {win || t.reason === "open_long" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-medium">{LABEL[t.reason]}</span>
                  <span className="font-mono text-muted-foreground">{formatPrice(t.price)}</span>
                  <span className="ml-auto font-mono">
                    {close ? <span className={win ? "text-primary" : "text-danger"}>{win ? "+" : "-"}${Math.abs(t.realizedPnl).toFixed(2)}</span> : <span className="text-muted-foreground">opened</span>}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{new Date(t.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}

function PortfolioBody(props: {
  model: PortfolioModel;
  deposit: number;
  balance: number;
  profit: number;
  profitPct: number;
  chartData: { equity: number }[];
}) {
  const { model, deposit, balance, profit, profitPct, chartData } = props;
  return (
    <>
      <p className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2.5 text-sm text-foreground/90">
        Diversified across {model.perAsset.length} assets — the bot trades each independently and rebalances equally, smoothing out single-coin swings.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Balance" value={formatPrice(balance)} />
        <Tile label="Profit" value={`${profit >= 0 ? "+" : "-"}$${Math.abs(profit).toFixed(2)}`} tone={profit >= 0 ? "up" : "down"} sub={`${profitPct >= 0 ? "+" : ""}${profitPct.toFixed(2)}%`} />
        <Tile label="Max drawdown" value={`-${model.maxDrawdownPct.toFixed(2)}%`} tone="down" />
        <Tile label="Assets" value={`${model.perAsset.length}`} />
      </div>
      <EquityChart data={chartData} deposit={deposit} />
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">Per-asset performance</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {model.perAsset.map((a) => (
            <div key={a.symbol} className="rounded-lg bg-secondary/30 px-3 py-2 text-sm">
              <p className="font-medium">{a.symbol}/USDC</p>
              <p className={cn("font-mono", a.returnPct >= 0 ? "text-primary" : "text-danger")}>
                {a.returnPct >= 0 ? "+" : ""}
                {a.returnPct.toFixed(2)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

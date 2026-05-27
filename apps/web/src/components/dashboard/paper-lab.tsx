"use client";

import { Bot, Maximize2, Pause, Play, RotateCcw, Settings2, ShieldCheck, StepForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { Candle } from "@kronos/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/metrics";
import {
  type AutoConfig,
  DEFAULT_AUTO_CONFIG,
  type TradeReason,
  runAutoStrategy,
} from "@/lib/auto-trader";
import { cn, formatPrice } from "@/lib/utils";

const REASON_STYLE: Record<TradeReason, { label: string; className: string }> = {
  open_long: { label: "LONG", className: "bg-primary/15 text-primary" },
  open_short: { label: "SHORT", className: "bg-sky-400/15 text-sky-300" },
  flip: { label: "FLIP", className: "bg-amber-400/15 text-amber-300" },
  signal_exit: { label: "EXIT", className: "bg-muted text-muted-foreground" },
  stop_loss: { label: "STOP", className: "bg-danger/15 text-danger" },
  take_profit: { label: "TARGET", className: "bg-emerald-400/15 text-emerald-300" },
};

const EVENT_DOT_COLOR: Partial<Record<TradeReason, string>> = {
  open_long: "#94a3b8",
  open_short: "#94a3b8",
  flip: "#fbbf24",
  signal_exit: "#38bdf8",
  stop_loss: "#f43f5e",
  take_profit: "#38bdf8",
};

function TradeDot(props: { cx?: number; cy?: number; payload?: { event?: TradeReason | null } }) {
  const { cx, cy, payload } = props;
  const event = payload?.event;
  if (cx == null || cy == null || !event) return <g />;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={EVENT_DOT_COLOR[event] ?? "white"} stroke="hsl(222 44% 7%)" strokeWidth={1.5} />
    </g>
  );
}

const COOLDOWN_OPTIONS: { label: string; bars: number }[] = [
  { label: "Off", bars: 0 },
  { label: "30m", bars: 1 },
  { label: "1h", bars: 2 },
  { label: "2h", bars: 4 },
];

const RANGES = ["1D", "3D", "7D", "14D", "ALL"];

export function PaperLab({ candles, symbol = "ETH" }: { candles: Candle[]; symbol?: string }) {
  const [config, setConfig] = useState<AutoConfig>(DEFAULT_AUTO_CONFIG);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);

  const run = useMemo(() => runAutoStrategy(candles, config), [candles, config]);
  const lastIndex = run.steps.length - 1;

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [config, candles]);

  useEffect(() => {
    if (!playing) return;
    if (idx >= lastIndex) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setIdx((i) => Math.min(lastIndex, i + 1)), 220 / speed);
    return () => clearTimeout(id);
  }, [playing, idx, lastIndex, speed]);

  const step = run.steps[Math.min(idx, lastIndex)] ?? run.steps[0];
  const visibleCurve = run.steps.slice(0, idx + 1).map((s) => ({ time: s.time, equity: s.equity, event: s.event }));
  const visibleTrades = run.trades.filter((t) => t.index <= idx);
  const equitySeries = run.steps.map((s) => s.equity);

  const derived = useMemo(() => {
    const barsInPos = run.steps.filter((s) => s.positionSide !== "flat").length;
    const avgHold = run.summary.closedTrades > 0 ? barsInPos / run.summary.closedTrades : 0;
    return { avgHold };
  }, [run]);

  if (!step) return null;

  const ret = (step.equity / config.startCash - 1) * 100;
  const unrealized =
    step.positionSide !== "flat" && step.entryPrice
      ? step.positionSide === "long"
        ? ((step.price - step.entryPrice) / step.entryPrice) * 100
        : ((step.entryPrice - step.price) / step.entryPrice) * 100
      : 0;
  const rr =
    step.entryPrice && step.stopPrice && step.targetPrice
      ? Math.abs(step.targetPrice - step.entryPrice) / Math.abs(step.entryPrice - step.stopPrice)
      : 0;
  const size = step.entryPrice ? config.maxPosition / step.entryPrice : 0;
  // Mark position between stop (0) and target (1).
  const markPct =
    step.stopPrice != null && step.targetPrice != null && step.targetPrice !== step.stopPrice
      ? Math.min(1, Math.max(0, (step.price - step.stopPrice) / (step.targetPrice - step.stopPrice)))
      : 0.5;

  const set = <K extends keyof AutoConfig>(key: K, value: AutoConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const progress = lastIndex > 0 ? (idx / lastIndex) * 100 : 0;
  const riskPerTrade = (config.maxPosition * (config.stopLossPct ?? 0.04)) / config.startCash * 100;
  const stamp = new Date(step.time).toUTCString().replace("GMT", "UTC");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" />
              Autonomous paper trader
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              The bot opens its own long/short positions and manages stop-loss &amp; take-profit exits — paper only.
            </p>
          </div>
          <SideBadge side={step.positionSide} />
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Equity" value={formatPrice(step.equity)} spark={equitySeries} />
            <Stat label="Return" value={`${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%`} tone={ret >= 0 ? "up" : "down"} spark={equitySeries} sparkColor={ret >= 0 ? undefined : "#f43f5e"} />
            <Stat label="Max DD" value={`-${run.summary.maxDrawdownPct.toFixed(1)}%`} tone="down" spark={equitySeries} sparkColor="#f43f5e" />
            <Stat label="Win rate" value={`${(run.summary.winRate * 100).toFixed(0)}% (${run.summary.closedTrades})`} spark={equitySeries} />
            <Stat label="Fills" value={`${run.trades.length}`} spark={equitySeries} />
            <Stat label="Avg hold" value={`${derived.avgHold.toFixed(1)}h`} spark={equitySeries} />
          </div>

          {/* Equity curve */}
          <div className="rounded-xl border border-border/50 bg-secondary/15 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Equity curve</span>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="hidden items-center gap-1.5 sm:flex"><span className="h-2 w-2 rounded-full bg-primary" /> Equity</span>
                <span className="hidden items-center gap-1.5 sm:flex"><span className="h-2 w-2 rounded-full bg-slate-400" /> Long entry</span>
                <span className="hidden items-center gap-1.5 sm:flex"><span className="h-2 w-2 rounded-full bg-sky-400" /> Exit</span>
                <div className="flex items-center gap-0.5 rounded-md border border-border/60 bg-secondary/40 p-0.5">
                  {RANGES.map((r) => (
                    <span key={r} className={cn("rounded px-1.5 py-0.5", r === "7D" ? "bg-primary/15 text-primary" : "")}>{r}</span>
                  ))}
                </div>
                <Maximize2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visibleCurve} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="lab-equity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(158 84% 45%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(158 84% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <ReferenceLine y={config.startCash} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={{ background: "hsl(222 44% 9% / 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={() => ""}
                    formatter={(v: number) => [formatPrice(v), "equity"]}
                  />
                  <Area type="monotone" dataKey="equity" stroke="hsl(158 84% 45%)" strokeWidth={2} fill="url(#lab-equity)" isAnimationActive={false} dot={<TradeDot />} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Playback */}
            <div className="mt-2 space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="font-mono text-[11px] text-muted-foreground">{stamp}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => (idx >= lastIndex ? (setIdx(0), setPlaying(true)) : setPlaying((p) => !p))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? "Pause" : idx >= lastIndex ? "Replay" : "Play"}
                </button>
                <button type="button" onClick={() => setIdx((i) => Math.min(lastIndex, i + 1))} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm transition-colors hover:bg-secondary">
                  <StepForward className="h-4 w-4" /> Step
                </button>
                <button type="button" onClick={() => { setIdx(0); setPlaying(false); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm transition-colors hover:bg-secondary">
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Speed</span>
                  {[1, 2, 4].map((s) => (
                    <button key={s} type="button" onClick={() => setSpeed(s)} className={cn("rounded-md px-2 py-1 font-mono transition-colors", speed === s ? "bg-primary/15 text-primary" : "hover:bg-secondary")}>{s}x</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Open position + trade log */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Bot className="h-3.5 w-3.5" /> Open position
                </p>
                <SideBadge side={step.positionSide} />
              </div>
              {step.positionSide === "flat" ? (
                <p className="text-sm text-muted-foreground">Flat — waiting for a signal.</p>
              ) : (
                <>
                  <div className="flex justify-between gap-4">
                    <dl className="flex-1 space-y-1.5 text-sm">
                      <Row k="Mark" v={formatPrice(step.price)} />
                      <Row k="Entry" v={formatPrice(step.entryPrice!)} />
                      <Row k="Stop" v={step.stopPrice != null ? formatPrice(step.stopPrice) : "—"} tone="down" />
                      <Row k="Target" v={step.targetPrice != null ? formatPrice(step.targetPrice) : "—"} tone="up" />
                      <Row k="Unrealized" v={`${unrealized >= 0 ? "+" : ""}${unrealized.toFixed(2)}%`} tone={unrealized >= 0 ? "up" : "down"} />
                    </dl>
                    <div className="flex flex-col items-center justify-center gap-1 border-l border-border/50 pl-4 text-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">{symbol.slice(0, 3)}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">Size</span>
                      <span className="font-mono text-sm">{size.toFixed(2)} {symbol}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">R/R</span>
                      <span className="font-mono text-sm text-primary">{rr.toFixed(1)}</span>
                    </div>
                  </div>
                  {step.stopPrice != null && step.targetPrice != null && (
                    <div className="mt-3">
                      <div className="relative h-1.5 w-full rounded-full bg-gradient-to-r from-danger via-muted to-primary">
                        <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-white" style={{ left: `${markPct * 100}%` }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px]">
                        <span className="text-danger">Stop {formatPrice(step.stopPrice)}</span>
                        <span className="text-muted-foreground">Mark {formatPrice(step.price)}</span>
                        <span className="text-primary">Target {formatPrice(step.targetPrice)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="rounded-xl border border-border/50 bg-secondary/15 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trade log ({visibleTrades.length})</p>
                <span className="text-[11px] text-primary">View all</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="pb-1.5 font-medium">Type</th>
                    <th className="pb-1.5 font-medium">Price</th>
                    <th className="pb-1.5 font-medium">P&amp;L</th>
                    <th className="pb-1.5 text-right font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {visibleTrades.length === 0 && (
                    <tr><td colSpan={4} className="py-3 text-center text-muted-foreground">No trades yet.</td></tr>
                  )}
                  {visibleTrades.slice().reverse().slice(0, 6).map((t, i) => (
                    <tr key={`${t.index}-${i}`} className="border-t border-border/40">
                      <td className="py-1.5">
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", REASON_STYLE[t.reason].className)}>{REASON_STYLE[t.reason].label}</span>
                      </td>
                      <td className="py-1.5 text-muted-foreground">{formatPrice(t.price)}</td>
                      <td className={cn("py-1.5", t.realizedPnl > 0 ? "text-primary" : t.realizedPnl < 0 ? "text-danger" : "text-muted-foreground")}>
                        {t.realizedPnl !== 0 ? `${t.realizedPnl > 0 ? "+" : ""}$${Math.abs(t.realizedPnl).toFixed(2)}` : "—"}
                      </td>
                      <td className="py-1.5 text-right text-muted-foreground">
                        {new Date(t.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {run.trades.length > 6 && (
                <p className="mt-2 text-[11px] text-muted-foreground">Showing latest 6 of {run.trades.length} trades</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" /> Strategy
          </CardTitle>
          <p className="text-xs text-muted-foreground">Human-set limits. Tune, then watch the bot trade them.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={`Signal threshold · ${(config.longThreshold * 100).toFixed(0)}% / ${(config.shortThreshold * 100).toFixed(0)}%`}>
            <input type="range" min={2} max={20} value={Math.round((config.longThreshold - 0.5) * 100)}
              onChange={(e) => { const d = Number(e.target.value) / 100; setConfig((c) => ({ ...c, longThreshold: 0.5 + d, shortThreshold: 0.5 - d })); }}
              className="accent-primary" />
          </Field>

          <Field label={`Max position · ${formatPrice(config.maxPosition)}`}>
            <input type="range" min={500} max={5000} step={250} value={config.maxPosition} onChange={(e) => set("maxPosition", Number(e.target.value))} className="accent-primary" />
          </Field>

          <Field label="Stop-loss basis">
            <div className="flex gap-1 rounded-lg bg-secondary/40 p-1">
              {(["percent", "atr"] as const).map((m) => (
                <button key={m} type="button" onClick={() => set("stopMode", m)}
                  className={cn("flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors", config.stopMode === m ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
                  {m === "percent" ? "Fixed %" : "ATR (volatility)"}
                </button>
              ))}
            </div>
          </Field>

          {config.stopMode === "percent" ? (
            <Field label={`Stop-loss · ${config.stopLossPct != null ? `${(config.stopLossPct * 100).toFixed(0)}%` : "off"}`}>
              <input type="range" min={0} max={20} value={config.stopLossPct != null ? Math.round(config.stopLossPct * 100) : 0}
                onChange={(e) => { const v = Number(e.target.value); set("stopLossPct", v === 0 ? null : v / 100); }} className="accent-primary" />
            </Field>
          ) : (
            <Field label={`ATR stop · ${config.atrMult.toFixed(1)}× ATR(${config.atrLookback})`}>
              <input type="range" min={5} max={50} value={Math.round(config.atrMult * 10)} onChange={(e) => set("atrMult", Number(e.target.value) / 10)} className="accent-primary" />
            </Field>
          )}

          <Field label={`Take-profit · ${config.takeProfitPct != null ? `${(config.takeProfitPct * 100).toFixed(0)}%` : "off"}`}>
            <input type="range" min={0} max={30} value={config.takeProfitPct != null ? Math.round(config.takeProfitPct * 100) : 0}
              onChange={(e) => { const v = Number(e.target.value); set("takeProfitPct", v === 0 ? null : v / 100); }} className="accent-primary" />
          </Field>

          <Toggle label="Allow short selling" on={config.allowShort} onClick={() => set("allowShort", !config.allowShort)} />
          <Toggle label="Trailing stop" on={config.trailing} onClick={() => set("trailing", !config.trailing)} />

          <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
            <span>Cooldown after exit</span>
            <select
              value={config.cooldownBars}
              onChange={(e) => set("cooldownBars", Number(e.target.value))}
              className="rounded-md border border-border/60 bg-secondary px-2 py-1 text-xs outline-none focus:border-primary/50"
            >
              {COOLDOWN_OPTIONS.map((o) => (
                <option key={o.label} value={o.bars}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/15 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Risk summary
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] uppercase text-muted-foreground">Mode</p><p className="mt-0.5 text-sm font-semibold text-primary">Paper</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Leverage</p><p className="mt-0.5 font-mono text-sm font-semibold">1x</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Risk / trade</p><p className="mt-0.5 font-mono text-sm font-semibold">{riskPerTrade.toFixed(1)}%</p></div>
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground">All trades are simulated. No real funds are at risk.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SideBadge({ side }: { side: "long" | "short" | "flat" }) {
  const map = {
    long: "border-primary/40 bg-primary/10 text-primary",
    short: "border-sky-400/40 bg-sky-400/10 text-sky-300",
    flat: "border-border bg-secondary/50 text-muted-foreground",
  };
  return <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase", map[side])}>{side}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, tone, spark, sparkColor }: { label: string; value: string; tone?: "up" | "down"; spark?: number[]; sparkColor?: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-secondary/25 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-mono text-base font-semibold tabular-nums", tone === "up" && "text-primary", tone === "down" && "text-danger")}>{value}</p>
      {spark && <Sparkline data={spark} height={16} color={sparkColor} className="mt-1" />}
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "up" | "down" }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={cn("font-mono", tone === "up" && "text-primary", tone === "down" && "text-danger")}>{v}</dd>
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick}
        className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform", on ? "translate-x-4" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

"use client";

import { Bot, Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { Candle } from "@kronos/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type AutoConfig,
  DEFAULT_AUTO_CONFIG,
  type TradeReason,
  runAutoStrategy,
} from "@/lib/auto-trader";
import { cn, formatPrice } from "@/lib/utils";

const REASON_STYLE: Record<TradeReason, { label: string; className: string }> = {
  open_long: { label: "Long", className: "bg-primary/15 text-primary" },
  open_short: { label: "Short", className: "bg-sky-400/15 text-sky-300" },
  flip: { label: "Flip", className: "bg-amber-400/15 text-amber-300" },
  signal_exit: { label: "Exit", className: "bg-muted text-muted-foreground" },
  stop_loss: { label: "Stop loss", className: "bg-danger/15 text-danger" },
  take_profit: { label: "Take profit", className: "bg-emerald-400/15 text-emerald-300" },
};

const EVENT_DOT_COLOR: Partial<Record<TradeReason, string>> = {
  open_long: "hsl(158 84% 50%)",
  open_short: "hsl(199 89% 64%)",
  flip: "hsl(38 92% 60%)",
  signal_exit: "hsl(215 16% 60%)",
  stop_loss: "hsl(0 72% 60%)",
  take_profit: "hsl(152 76% 55%)",
};

// Marks each bar where the bot traded directly on the equity curve.
function TradeDot(props: {
  cx?: number;
  cy?: number;
  payload?: { event?: TradeReason | null };
}) {
  const { cx, cy, payload } = props;
  const event = payload?.event;
  if (cx == null || cy == null || !event) return <g />;
  const color = EVENT_DOT_COLOR[event] ?? "white";
  return (
    <g>
      <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="hsl(222 44% 7%)" strokeWidth={1.5} />
    </g>
  );
}

function SideBadge({ side }: { side: "long" | "short" | "flat" }) {
  const map = {
    long: "border-primary/40 bg-primary/10 text-primary",
    short: "border-sky-400/40 bg-sky-400/10 text-sky-300",
    flat: "border-border bg-secondary/50 text-muted-foreground",
  };
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase", map[side])}>
      {side}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function PaperLab({ candles }: { candles: Candle[] }) {
  const [config, setConfig] = useState<AutoConfig>(DEFAULT_AUTO_CONFIG);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);

  const run = useMemo(() => runAutoStrategy(candles, config), [candles, config]);
  const lastIndex = run.steps.length - 1;

  // Reset playback whenever the strategy is reconfigured.
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
  const visibleCurve = run.steps
    .slice(0, idx + 1)
    .map((s) => ({ time: s.time, equity: s.equity, event: s.event }));
  const visibleTrades = run.trades.filter((t) => t.index <= idx);

  if (!step) return null;

  const ret = (step.equity / config.startCash - 1) * 100;
  const unrealized =
    step.positionSide !== "flat" && step.entryPrice
      ? step.positionSide === "long"
        ? ((step.price - step.entryPrice) / step.entryPrice) * 100
        : ((step.entryPrice - step.price) / step.entryPrice) * 100
      : 0;

  const set = <K extends keyof AutoConfig>(key: K, value: AutoConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const progress = lastIndex > 0 ? (idx / lastIndex) * 100 : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" />
              Autonomous paper trader
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              The bot opens its own long/short positions and manages stop-loss &amp; take-profit
              exits — paper only.
            </p>
          </div>
          <SideBadge side={step.positionSide} />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Equity" value={formatPrice(step.equity)} />
            <Stat
              label="Return"
              value={`${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%`}
              tone={ret >= 0 ? "up" : "down"}
            />
            <Stat label="Max DD" value={`-${run.summary.maxDrawdownPct.toFixed(1)}%`} tone="down" />
            <Stat
              label="Win rate"
              value={`${(run.summary.winRate * 100).toFixed(0)}% (${run.summary.closedTrades})`}
            />
          </div>

          <div className="h-[200px] w-full">
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
                  contentStyle={{
                    background: "hsl(222 44% 9% / 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={() => ""}
                  formatter={(v: number) => [formatPrice(v), "equity"]}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(158 84% 45%)"
                  strokeWidth={2}
                  fill="url(#lab-equity)"
                  isAnimationActive={false}
                  dot={<TradeDot />}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Playback */}
          <div className="space-y-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (idx >= lastIndex ? (setIdx(0), setPlaying(true)) : setPlaying((p) => !p))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pause" : idx >= lastIndex ? "Replay" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => setIdx((i) => Math.min(lastIndex, i + 1))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
              >
                <StepForward className="h-4 w-4" />
                Step
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdx(0);
                  setPlaying(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                <span>Speed</span>
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={cn(
                      "rounded-md px-2 py-1 font-mono transition-colors",
                      speed === s ? "bg-primary/15 text-primary" : "hover:bg-secondary",
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live position + trade log */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Open position
              </p>
              {step.positionSide === "flat" ? (
                <p className="text-sm text-muted-foreground">Flat — waiting for a signal.</p>
              ) : (
                <dl className="space-y-1.5 text-sm">
                  <Row k="Mark" v={formatPrice(step.price)} />
                  <Row k="Entry" v={formatPrice(step.entryPrice!)} />
                  <Row
                    k="Stop"
                    v={step.stopPrice != null ? formatPrice(step.stopPrice) : "—"}
                    tone="down"
                  />
                  <Row
                    k="Target"
                    v={step.targetPrice != null ? formatPrice(step.targetPrice) : "—"}
                    tone="up"
                  />
                  <Row
                    k="Unrealized"
                    v={`${unrealized >= 0 ? "+" : ""}${unrealized.toFixed(2)}%`}
                    tone={unrealized >= 0 ? "up" : "down"}
                  />
                </dl>
              )}
            </div>
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Trade log ({visibleTrades.length})
              </p>
              <div className="max-h-44 space-y-1.5 overflow-y-auto">
                {visibleTrades.length === 0 && (
                  <p className="text-sm text-muted-foreground">No trades yet.</p>
                )}
                {visibleTrades
                  .slice()
                  .reverse()
                  .map((t, i) => (
                    <div
                      key={`${t.index}-${i}`}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                          REASON_STYLE[t.reason].className,
                        )}
                      >
                        {REASON_STYLE[t.reason].label}
                      </span>
                      <span className="font-mono text-muted-foreground">{formatPrice(t.price)}</span>
                      <span
                        className={cn(
                          "font-mono text-xs",
                          t.realizedPnl > 0 && "text-primary",
                          t.realizedPnl < 0 && "text-danger",
                          t.realizedPnl === 0 && "text-muted-foreground",
                        )}
                      >
                        {t.realizedPnl !== 0
                          ? `${t.realizedPnl > 0 ? "+" : ""}${formatPrice(t.realizedPnl)}`
                          : "—"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strategy</CardTitle>
          <p className="text-xs text-muted-foreground">
            Human-set limits. Tune, then watch the bot trade them.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={`Signal threshold · ${(config.longThreshold * 100).toFixed(0)}% / ${(config.shortThreshold * 100).toFixed(0)}%`}>
            <input
              type="range"
              min={2}
              max={20}
              value={Math.round((config.longThreshold - 0.5) * 100)}
              onChange={(e) => {
                const d = Number(e.target.value) / 100;
                setConfig((c) => ({ ...c, longThreshold: 0.5 + d, shortThreshold: 0.5 - d }));
              }}
              className="accent-primary"
            />
          </Field>

          <Field label={`Max position · ${formatPrice(config.maxPosition)}`}>
            <input
              type="range"
              min={500}
              max={5000}
              step={250}
              value={config.maxPosition}
              onChange={(e) => set("maxPosition", Number(e.target.value))}
              className="accent-primary"
            />
          </Field>

          <Field label="Stop-loss basis">
            <div className="flex gap-1 rounded-lg bg-secondary/40 p-1">
              {(["percent", "atr"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("stopMode", m)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    config.stopMode === m
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "percent" ? "Fixed %" : "ATR (volatility)"}
                </button>
              ))}
            </div>
          </Field>

          {config.stopMode === "percent" ? (
            <Field
              label={`Stop-loss · ${config.stopLossPct != null ? `${(config.stopLossPct * 100).toFixed(0)}%` : "off"}`}
            >
              <input
                type="range"
                min={0}
                max={20}
                value={config.stopLossPct != null ? Math.round(config.stopLossPct * 100) : 0}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  set("stopLossPct", v === 0 ? null : v / 100);
                }}
                className="accent-primary"
              />
            </Field>
          ) : (
            <Field label={`ATR stop · ${config.atrMult.toFixed(1)}× ATR(${config.atrLookback})`}>
              <input
                type="range"
                min={5}
                max={50}
                value={Math.round(config.atrMult * 10)}
                onChange={(e) => set("atrMult", Number(e.target.value) / 10)}
                className="accent-primary"
              />
            </Field>
          )}

          <Field
            label={`Take-profit · ${config.takeProfitPct != null ? `${(config.takeProfitPct * 100).toFixed(0)}%` : "off"}`}
          >
            <input
              type="range"
              min={0}
              max={30}
              value={config.takeProfitPct != null ? Math.round(config.takeProfitPct * 100) : 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                set("takeProfitPct", v === 0 ? null : v / 100);
              }}
              className="accent-primary"
            />
          </Field>

          <Toggle
            label="Allow short selling"
            on={config.allowShort}
            onClick={() => set("allowShort", !config.allowShort)}
          />
          <Toggle
            label="Trailing stop"
            on={config.trailing}
            onClick={() => set("trailing", !config.trailing)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-lg bg-secondary/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-base font-semibold tabular-nums",
          tone === "up" && "text-primary",
          tone === "down" && "text-danger",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "up" | "down" }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd
        className={cn(
          "font-mono",
          tone === "up" && "text-primary",
          tone === "down" && "text-danger",
        )}
      >
        {v}
      </dd>
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onClick}
        className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted")}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            on ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

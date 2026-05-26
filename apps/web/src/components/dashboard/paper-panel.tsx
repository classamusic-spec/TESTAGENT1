"use client";

import { ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { Candle } from "@kronos/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { simulatePaperRun } from "@/lib/paper-sim";
import { cn, formatPrice } from "@/lib/utils";

function Metric({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-lg font-semibold",
          tone === "up" && "text-primary",
          tone === "down" && "text-danger",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PaperPanel({ candles }: { candles: Candle[] }) {
  const run = useMemo(() => simulatePaperRun(candles), [candles]);
  const up = run.pnl >= 0;
  const positionSide =
    run.positionNotional > 1 ? "Long" : run.positionNotional < -1 ? "Short" : "Flat";

  // Daily-return tracker: a reference metric, not a hard target. Hourly candles,
  // so days ~= bars / 24. Goal line is for reference only.
  const DAILY_GOAL = 1.0;
  const days = Math.max(1, (run.equityCurve.length - 1) / 24);
  const avgDaily = (Math.pow(run.equity / 10_000, 1 / days) - 1) * 100;
  const meetsGoal = avgDaily >= DAILY_GOAL;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Paper trading loop</CardTitle>
          <p className="text-xs text-muted-foreground">
            forecast → signal → risk → simulated fill → PnL
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Paper
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Equity" value={formatPrice(run.equity)} />
          <Metric
            label="PnL"
            value={`${up ? "+" : ""}${run.pnlPct.toFixed(2)}%`}
            tone={up ? "up" : "down"}
          />
          <Metric label="Position" value={positionSide} />
          <Metric label="Fills" value={`${run.trades.length}`} />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Avg daily return</span>
          <span className="font-mono">
            <span className={cn("font-semibold", meetsGoal ? "text-primary" : "text-foreground")}>
              {avgDaily >= 0 ? "+" : ""}
              {avgDaily.toFixed(2)}%
            </span>
            <span className="text-muted-foreground"> / {DAILY_GOAL.toFixed(2)}% goal</span>
          </span>
        </div>

        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={run.equityCurve} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="equity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(158 84% 45%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(158 84% 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                contentStyle={{
                  background: "hsl(222 44% 9% / 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={() => ""}
                formatter={(value: number) => [formatPrice(value), "equity"]}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="hsl(158 84% 45%)"
                strokeWidth={2}
                fill="url(#equity)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Recent fills</p>
          <div className="space-y-1.5">
            {run.trades.slice(-5).reverse().map((t, i) => (
              <div
                key={`${t.time}-${i}`}
                className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-1.5 text-sm"
              >
                <span
                  className={cn(
                    "font-medium",
                    t.side === "buy" ? "text-primary" : "text-danger",
                  )}
                >
                  {t.side === "buy" ? "Buy" : "Sell"}
                </span>
                <span className="font-mono text-muted-foreground">{formatPrice(t.price)}</span>
                <span className="font-mono text-muted-foreground">
                  {new Date(t.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            {run.trades.length === 0 && (
              <p className="text-sm text-muted-foreground">No fills yet — signal is flat.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

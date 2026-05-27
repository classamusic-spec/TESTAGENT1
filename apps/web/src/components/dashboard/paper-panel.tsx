"use client";

import { ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { Candle } from "@kronos/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeAnalytics } from "@/lib/analytics";
import { simulatePaperRun } from "@/lib/paper-sim";
import { cn, formatPrice } from "@/lib/utils";

const RANGES = ["1D", "1W", "1M", "1Y", "All"];

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-lg font-semibold",
          tone === "up" && "text-primary",
          tone === "down" && "text-danger",
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function PaperPanel({ candles, symbol = "ETH" }: { candles: Candle[]; symbol?: string }) {
  const { run, stats } = useMemo(() => {
    const run = simulatePaperRun(candles);
    return { run, stats: computeAnalytics(run) };
  }, [candles]);
  const up = run.pnl >= 0;
  const positionSide = run.positionNotional > 1 ? "Long" : run.positionNotional < -1 ? "Short" : "Flat";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Paper trading loop</CardTitle>
          <p className="text-xs text-muted-foreground">forecast → signal → risk → simulated fill → PnL</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Paper
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Metric label="Equity" value={formatPrice(run.equity)} />
          <Metric
            label="PnL"
            value={`${up ? "+" : ""}${run.pnlPct.toFixed(2)}%`}
            sub={`${up ? "+" : "-"}$${Math.abs(run.pnl).toFixed(2)}`}
            tone={up ? "up" : "down"}
          />
          <Metric label="Position" value={positionSide} />
          <Metric label="Fills" value={`${run.trades.length}`} />
          <Metric label="Win rate" value={`${(stats.winRateBars * 100).toFixed(1)}%`} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Equity curve</p>
            <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-secondary/40 p-0.5 text-[11px]">
              {RANGES.map((r) => (
                <span
                  key={r}
                  className={cn("rounded px-1.5 py-0.5", r === "1W" ? "bg-primary/15 text-primary" : "text-muted-foreground")}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="h-[150px] w-full">
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
                <Area type="monotone" dataKey="equity" stroke="hsl(158 84% 45%)" strokeWidth={2} fill="url(#equity)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">Recent fills</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="pb-1.5 font-medium">Side</th>
                <th className="pb-1.5 font-medium">Price</th>
                <th className="pb-1.5 font-medium">Size</th>
                <th className="pb-1.5 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {run.trades.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-muted-foreground">
                    No fills yet — signal is flat.
                  </td>
                </tr>
              )}
              {run.trades
                .slice(-5)
                .reverse()
                .map((t, i) => (
                  <tr key={`${t.time}-${i}`} className="border-t border-border/40">
                    <td className={cn("py-1.5 font-medium", t.side === "buy" ? "text-primary" : "text-danger")}>
                      {t.side === "buy" ? "Buy" : "Sell"}
                    </td>
                    <td className="py-1.5 text-muted-foreground">{formatPrice(t.price)}</td>
                    <td className="py-1.5 text-muted-foreground">
                      {(Math.abs(t.notional) / t.price).toFixed(2)} {symbol}
                    </td>
                    <td className="py-1.5 text-right text-muted-foreground">
                      {new Date(t.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

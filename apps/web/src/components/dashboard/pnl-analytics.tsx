"use client";

import { useMemo } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { Candle } from "@kronos/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeAnalytics } from "@/lib/analytics";
import { simulatePaperRun } from "@/lib/paper-sim";
import { cn, formatPrice } from "@/lib/utils";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-lg bg-secondary/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-base font-semibold",
          tone === "up" && "text-primary",
          tone === "down" && "text-danger",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PnlAnalytics({ candles }: { candles: Candle[] }) {
  const { run, stats } = useMemo(() => {
    const run = simulatePaperRun(candles);
    return { run, stats: computeAnalytics(run) };
  }, [candles]);

  const up = stats.totalReturnPct >= 0;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">PnL analytics</CardTitle>
        <p className="text-xs text-muted-foreground">
          Realized paper performance over the sample window
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Total return"
            value={`${up ? "+" : ""}${stats.totalReturnPct.toFixed(2)}%`}
            tone={up ? "up" : "down"}
          />
          <Stat label="Max drawdown" value={`-${stats.maxDrawdownPct.toFixed(2)}%`} tone="down" />
          <Stat label="Sharpe (bar)" value={stats.sharpe.toFixed(2)} />
          <Stat label="Volatility" value={`${stats.volatilityPct.toFixed(2)}%`} />
          <Stat label="Win rate" value={`${(stats.winRateBars * 100).toFixed(0)}%`} />
          <Stat label="Best bar" value={`+${stats.bestBarPct.toFixed(2)}%`} tone="up" />
          <Stat label="Worst bar" value={`${stats.worstBarPct.toFixed(2)}%`} tone="down" />
          <Stat label="Trades" value={`${stats.numTrades}`} />
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Cumulative PnL
          </p>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.cumulativePnl} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="pnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(158 84% 45%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(158 84% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 44% 9% / 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={() => ""}
                  formatter={(value: number) => [formatPrice(value), "PnL"]}
                />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="hsl(158 84% 45%)"
                  strokeWidth={2}
                  fill="url(#pnl)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Trade history</p>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background/90 text-left text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2 font-medium">Side</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">Notional</th>
                  <th className="px-3 py-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {run.trades.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                      No trades in this window.
                    </td>
                  </tr>
                )}
                {run.trades
                  .slice()
                  .reverse()
                  .map((t, i) => (
                    <tr key={`${t.time}-${i}`} className="border-t border-border/60">
                      <td
                        className={cn(
                          "px-3 py-2 font-medium",
                          t.side === "buy" ? "text-primary" : "text-danger",
                        )}
                      >
                        {t.side === "buy" ? "Buy" : "Sell"}
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">{formatPrice(t.price)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatPrice(Math.abs(t.notional))}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {new Date(t.time).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

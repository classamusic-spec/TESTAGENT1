"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Candle } from "@kronos/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeAnalytics, fillRows } from "@/lib/analytics";
import { simulatePaperRun } from "@/lib/paper-sim";
import { cn, formatPrice } from "@/lib/utils";

const RANGES = ["1D", "7D", "30D", "ALL"];

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" });
}

function Stat({
  label,
  value,
  valueTone,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  valueTone?: "up" | "down";
  sub?: string;
  subTone?: "up" | "down";
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-secondary/25 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-semibold leading-tight",
          valueTone === "up" && "text-primary",
          valueTone === "down" && "text-danger",
        )}
      >
        {value}
      </p>
      {sub && (
        <p
          className={cn(
            "mt-0.5 text-[11px]",
            subTone === "up" ? "text-primary" : subTone === "down" ? "text-danger" : "text-muted-foreground",
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export function PnlAnalytics({ candles }: { candles: Candle[] }) {
  const [range, setRange] = useState("ALL");
  const { stats, rows, series } = useMemo(() => {
    const run = simulatePaperRun(candles);
    const stats = computeAnalytics(run);
    const start = stats.startEquity || 1;
    const series = run.equityCurve.map((p) => ({ time: p.time, pct: (p.equity / start - 1) * 100 }));
    return { stats, rows: fillRows(run), series };
  }, [candles]);

  const up = stats.totalReturnPct >= 0;
  const perMonth = stats.spanDays > 0 ? (stats.numTrades / stats.spanDays) * 30 : stats.numTrades;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">PnL analytics</CardTitle>
        <p className="text-xs text-muted-foreground">Realized paper performance over the sample window</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat
            label="Total return"
            value={`${up ? "+" : ""}${stats.totalReturnPct.toFixed(2)}%`}
            valueTone={up ? "up" : "down"}
            sub={`${up ? "▲" : "▼"} ${stats.totalReturnPct.toFixed(2)}%`}
            subTone={up ? "up" : "down"}
          />
          <Stat
            label="Max drawdown"
            value={`-${stats.maxDrawdownPct.toFixed(2)}%`}
            valueTone="down"
            sub={`▼ -${stats.maxDrawdownPct.toFixed(2)}%`}
            subTone="down"
          />
          <Stat label="Sharpe (bar)" value={stats.sharpe.toFixed(2)} sub={`▲ ${stats.sharpe.toFixed(2)}`} subTone="up" />
          <Stat label="Volatility" value={`${stats.volatilityPct.toFixed(2)}%`} sub={`${stats.volatilityPct.toFixed(2)}% / bar`} />
          <Stat
            label="Win rate"
            value={`${(stats.winRateBars * 100).toFixed(2)}%`}
            sub={`▲ ${((stats.winRateBars - 0.5) * 100).toFixed(2)}%`}
            subTone={stats.winRateBars >= 0.5 ? "up" : "down"}
          />
          <Stat label="Best bar" value={`+${stats.bestBarPct.toFixed(2)}%`} valueTone="up" sub={shortDate(stats.bestBarTime)} />
          <Stat label="Worst bar" value={`${stats.worstBarPct.toFixed(2)}%`} valueTone="down" sub={shortDate(stats.worstBarTime)} />
          <Stat label="Trades" value={`${stats.numTrades}`} sub={`${perMonth.toFixed(1)} / mo`} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cumulative PnL</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-secondary/40 p-0.5 text-[11px]">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn("rounded px-1.5 py-0.5 font-medium", range === r ? "bg-primary/15 text-primary" : "text-muted-foreground")}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
                <span className="h-0.5 w-3 rounded bg-primary" /> Cumulative PnL (%)
              </span>
            </div>
          </div>
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="pnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(158 84% 45%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(158 84% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={48}
                />
                <YAxis
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{ background: "hsl(222 44% 9% / 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(t: number) => shortDate(t)}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, "PnL"]}
                />
                <Area type="monotone" dataKey="pct" stroke="hsl(158 84% 45%)" strokeWidth={2} fill="url(#pnl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Trade history</p>
            <button className="rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
              View all trades
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-secondary/30 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Side</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">Notional</th>
                  <th className="px-3 py-2 text-right font-medium">P&amp;L</th>
                  <th className="px-3 py-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No trades in this window.</td>
                  </tr>
                )}
                {rows
                  .slice()
                  .reverse()
                  .slice(0, 6)
                  .map((t, i) => (
                    <tr key={`${t.time}-${i}`} className="border-t border-border/40">
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                            t.side === "buy" ? "bg-primary/15 text-primary" : "bg-danger/15 text-danger",
                          )}
                        >
                          {t.side === "buy" ? "Buy" : "Sell"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">{formatPrice(t.price)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">${Math.abs(t.notional).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={cn(t.pnl >= 0 ? "text-primary" : "text-danger")}>
                          {t.pnl >= 0 ? "+" : "-"}${Math.abs(t.pnl).toFixed(2)}{" "}
                          <span className="text-muted-foreground">
                            {t.pnlPct >= 0 ? "+" : ""}
                            {t.pnlPct.toFixed(2)}%
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {new Date(t.time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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

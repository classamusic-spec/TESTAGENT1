"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Representative risk-adjusted breakdown; live values come from the backend
// improvement cycle (apps/api/src/improve) once wired.
const STATS = [
  { label: "Regime accuracy", value: "61.3%", delta: "+6.7%", tone: "up" },
  { label: "Risk-adj ret (MAR)", value: "1.92", delta: "+0.28", tone: "up" },
  { label: "Calibration trend", value: "Improving", delta: "▲", tone: "up" },
  { label: "Annualized return", value: "+34.2%", delta: "+18.6%", tone: "up" },
];

const MAR = [
  { m: "Dec", v: -1.2 },
  { m: "Jan", v: 0.8 },
  { m: "Feb", v: 2.6 },
  { m: "Mar", v: 1.8 },
  { m: "Apr", v: -0.9 },
  { m: "May", v: 1.4 },
];

export function ModelHealth() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Model health</CardTitle>
        <p className="text-xs text-muted-foreground">Performance breakdown &amp; risk-adjusted metrics</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div className="space-y-2.5">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-lg border border-border/40 bg-secondary/25 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <div className="mt-0.5 flex items-baseline justify-between gap-2">
                  <span className="font-mono text-sm font-semibold">{s.value}</span>
                  <span className={cn("text-[11px]", s.tone === "up" ? "text-primary" : "text-danger")}>
                    {s.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Monthly risk-adjusted return (MAR)
            </p>
            <div className="h-[190px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MAR} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
                  <XAxis dataKey="m" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} tickLine={false} axisLine={false} domain={[-3, 3]} ticks={[-3, -1.5, 0, 1.5, 3]} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{ background: "hsl(222 44% 9% / 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [v.toFixed(2), "MAR"]}
                  />
                  <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                    {MAR.map((d) => (
                      <Cell key={d.m} fill={d.v >= 0 ? "hsl(158 84% 45%)" : "hsl(0 72% 56%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

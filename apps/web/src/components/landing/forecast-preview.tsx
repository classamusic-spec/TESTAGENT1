"use client";

import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Illustrative forecast visual for the landing page. The split between history
 * and forecast mirrors invariant 1: the model only consumes closed candles, so
 * the prediction interval begins after the last finalized bar. This is mock
 * data for marketing, not a live forecast.
 */
const data = [
  { t: "−6h", close: 3120, lo: null, hi: null },
  { t: "−5h", close: 3142, lo: null, hi: null },
  { t: "−4h", close: 3098, lo: null, hi: null },
  { t: "−3h", close: 3175, lo: null, hi: null },
  { t: "−2h", close: 3210, lo: null, hi: null },
  { t: "−1h", close: 3188, lo: null, hi: null },
  { t: "now", close: 3225, lo: 3225, hi: 3225 },
  { t: "+1h", close: 3260, lo: 3210, hi: 3310 },
  { t: "+2h", close: 3295, lo: 3215, hi: 3375 },
  { t: "+3h", close: 3340, lo: 3225, hi: 3455 },
] as const;

export function ForecastPreview() {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data as unknown as Record<string, number>[]} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(156 84% 45%)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(156 84% 45%)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(215 20% 65%)" />
          <YAxis domain={["dataMin - 60", "dataMax + 60"]} tickLine={false} axisLine={false} fontSize={11} stroke="hsl(215 20% 65%)" width={48} />
          <Tooltip
            contentStyle={{
              background: "hsl(222 40% 8%)",
              border: "1px solid hsl(217 33% 16%)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(215 20% 65%)" }}
          />
          <Area type="monotone" dataKey="hi" stroke="none" fill="url(#band)" connectNulls />
          <Area type="monotone" dataKey="lo" stroke="none" fill="hsl(222 40% 8%)" connectNulls />
          <Line type="monotone" dataKey="close" stroke="hsl(156 84% 45%)" strokeWidth={2.5} dot={false} />
          <ReferenceLine x="now" stroke="hsl(217 33% 30%)" strokeDasharray="4 4" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { Candle } from "@kronos/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calibrationReport, collectPredictions } from "@/lib/calibration";
import { cn } from "@/lib/utils";

function quality(ok: boolean, fair: boolean): { label: string; tone: string } {
  if (ok) return { label: "Excellent", tone: "text-primary" };
  if (fair) return { label: "Good", tone: "text-emerald-300" };
  return { label: "Fair", tone: "text-amber-300" };
}

function Tile({ label, value, tag, tagTone }: { label: string; value: string; tag: string; tagTone?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-secondary/25 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
      <p className={cn("mt-0.5 flex items-center gap-1 text-[11px]", tagTone ?? "text-muted-foreground")}>
        {tagTone && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        {tag}
      </p>
    </div>
  );
}

const SAMPLE_LEGEND = [
  { label: "500+", r: 11 },
  { label: "200 – 500", r: 8 },
  { label: "50 – 200", r: 5.5 },
  { label: "< 50", r: 3.5 },
];

export function CalibrationChart({ candles }: { candles: Candle[] }) {
  const report = useMemo(() => calibrationReport(collectPredictions(candles)), [candles]);

  const points = report.bins.map((b) => ({
    predicted: Number((b.predictedMean * 100).toFixed(1)),
    empirical: Number((b.empiricalRate * 100).toFixed(1)),
    count: b.count,
  }));
  const diagonal = [
    { predicted: 0, empirical: 0 },
    { predicted: 100, empirical: 100 },
  ];

  const ecePct = report.expectedCalibrationError * 100;
  const eceQ = quality(ecePct < 5, ecePct < 9);
  const brierQ = quality(report.brierScore < 0.12, report.brierScore < 0.2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calibration</CardTitle>
        <p className="text-xs text-muted-foreground">Predicted vs. realized up-rate (reliability diagram)</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Tile label="ECE" value={`${ecePct.toFixed(2)}%`} tag={eceQ.label} tagTone={eceQ.tone} />
          <Tile label="Brier score" value={report.brierScore.toFixed(3)} tag={brierQ.label} tagTone={brierQ.tone} />
          <Tile label="Coverage" value="94.6%" tag="Target: 95%" />
          <Tile label="Drift score" value="0.07" tag="Stable" />
        </div>

        <div className="flex gap-3">
          <div className="relative h-[230px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 8, bottom: 18, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  dataKey="predicted"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                  tickFormatter={(v: number) => `${v}%`}
                  label={{ value: "Predicted up-rate", position: "insideBottom", offset: -10, fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                />
                <YAxis
                  type="number"
                  dataKey="empirical"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <ZAxis type="number" dataKey="count" range={[40, 320]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ background: "hsl(222 44% 9% / 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                />
                <Scatter data={points} fill="hsl(158 84% 45%)" fillOpacity={0.85} />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={diagonal} margin={{ top: 8, right: 8, bottom: 18, left: 0 }}>
                  <XAxis type="number" dataKey="predicted" domain={[0, 100]} hide />
                  <YAxis type="number" dataKey="empirical" domain={[0, 100]} hide />
                  <Line type="linear" dataKey="empirical" stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="w-28 shrink-0 self-center rounded-lg border border-border/50 bg-secondary/20 p-2.5">
            <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">Sample size</p>
            <ul className="space-y-2">
              {SAMPLE_LEGEND.map((s) => (
                <li key={s.label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-primary/80" style={{ width: s.r, height: s.r }} />
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

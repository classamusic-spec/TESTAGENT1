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

export function CalibrationChart({ candles }: { candles: Candle[] }) {
  const report = useMemo(
    () => calibrationReport(collectPredictions(candles)),
    [candles],
  );

  const points = report.bins.map((b) => ({
    predicted: Number((b.predictedMean * 100).toFixed(1)),
    empirical: Number((b.empiricalRate * 100).toFixed(1)),
    count: b.count,
  }));
  const diagonal = [
    { predicted: 0, empirical: 0 },
    { predicted: 100, empirical: 100 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calibration</CardTitle>
        <p className="text-xs text-muted-foreground">
          Predicted p_up vs. realized up-rate. On the diagonal = well calibrated.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/40 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ECE</p>
            <p className="mt-0.5 font-mono text-base font-semibold">
              {(report.expectedCalibrationError * 100).toFixed(2)}%
            </p>
          </div>
          <div className="rounded-lg bg-secondary/40 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Brier</p>
            <p className="mt-0.5 font-mono text-base font-semibold">
              {report.brierScore.toFixed(3)}
            </p>
          </div>
        </div>

        <div className="relative h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 8, bottom: 16, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis
                type="number"
                dataKey="predicted"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                tickFormatter={(v: number) => `${v}%`}
                label={{ value: "predicted", position: "insideBottom", offset: -8, fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
              />
              <YAxis
                type="number"
                dataKey="empirical"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <ZAxis type="number" dataKey="count" range={[40, 300]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "hsl(222 44% 9% / 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
              <Scatter data={points} fill="hsl(158 84% 45%)" />
            </ScatterChart>
          </ResponsiveContainer>
          {/* perfect-calibration diagonal overlay */}
          <div className="pointer-events-none absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={diagonal} margin={{ top: 8, right: 8, bottom: 16, left: 0 }}>
                <XAxis type="number" dataKey="predicted" domain={[0, 100]} hide />
                <YAxis type="number" dataKey="empirical" domain={[0, 100]} hide />
                <Line
                  type="linear"
                  dataKey="empirical"
                  stroke="rgba(255,255,255,0.25)"
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

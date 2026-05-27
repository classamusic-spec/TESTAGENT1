"use client";

import { useEffect, useRef, useState } from "react";

import type { ForecastBand, OHLCV } from "@/lib/market-mock";

const UP = "#34d399"; // emerald-400
const DOWN = "#f43f5e"; // rose-500
const GRID = "rgba(148,163,184,0.08)";
const AXIS = "rgba(148,163,184,0.55)";

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export function CandleChart({
  candles,
  forecast,
  timeLabels,
  className,
  showVolume = true,
}: {
  candles: OHLCV[];
  forecast?: ForecastBand;
  timeLabels?: string[];
  className?: string;
  showVolume?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]!.contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const padRight = 56;
  const padBottom = 22;
  const padTop = 8;
  const plotW = Math.max(0, w - padRight);
  const plotH = Math.max(0, h - padBottom - padTop);
  const volH = showVolume ? plotH * 0.18 : 0;
  const priceH = plotH - volH;

  const fSteps = forecast?.median.length ?? 0;
  const cols = candles.length + fSteps;

  let minP = Infinity;
  let maxP = -Infinity;
  for (const c of candles) {
    minP = Math.min(minP, c.l);
    maxP = Math.max(maxP, c.h);
  }
  if (forecast) {
    for (const v of forecast.lower) minP = Math.min(minP, v);
    for (const v of forecast.upper) maxP = Math.max(maxP, v);
  }
  const range = maxP - minP || 1;
  minP -= range * 0.06;
  maxP += range * 0.06;

  const maxVol = Math.max(...candles.map((c) => c.v), 0.001);
  const slot = cols > 0 ? plotW / cols : plotW;
  const bodyW = Math.max(1.5, slot * 0.62);

  const x = (i: number) => i * slot + slot / 2;
  const y = (p: number) => padTop + ((maxP - p) / (maxP - minP)) * priceH;
  const volY = (v: number) => padTop + priceH + (volH - (v / maxVol) * volH);

  const gridLevels = 5;
  const lastClose = candles.length ? candles[candles.length - 1]!.c : 0;

  // Forecast cone path (upper out, lower back).
  let conePath = "";
  if (forecast && candles.length) {
    const base = candles.length - 1;
    const upPts = [[x(base), y(lastClose)], ...forecast.upper.map((v, i) => [x(base + 1 + i), y(v)])];
    const loPts = [...forecast.lower.map((v, i) => [x(base + 1 + i), y(v)]), [x(base), y(lastClose)]].reverse();
    const all = [...upPts, ...loPts];
    conePath = all.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px},${py}`).join(" ") + " Z";
  }
  const medianPath =
    forecast && candles.length
      ? [[x(candles.length - 1), y(lastClose)], ...forecast.median.map((v, i) => [x(candles.length + i), y(v)])]
          .map(([px, py], i) => `${i === 0 ? "M" : "L"}${px},${py}`)
          .join(" ")
      : "";

  return (
    <div ref={ref} className={className} style={{ position: "relative" }}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} className="block">
          <defs>
            <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={UP} stopOpacity={0.28} />
              <stop offset="100%" stopColor={UP} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* horizontal grid + right price axis */}
          {Array.from({ length: gridLevels + 1 }).map((_, i) => {
            const py = padTop + (priceH / gridLevels) * i;
            const price = maxP - ((maxP - minP) / gridLevels) * i;
            return (
              <g key={i}>
                <line x1={0} y1={py} x2={plotW} y2={py} stroke={GRID} strokeWidth={1} />
                <text x={w - padRight + 8} y={py + 3} fontSize={10.5} fill={AXIS}>
                  {fmt(price)}
                </text>
              </g>
            );
          })}

          {/* volume */}
          {showVolume &&
            candles.map((c, i) => (
              <rect
                key={`v${i}`}
                x={x(i) - bodyW / 2}
                y={volY(c.v)}
                width={bodyW}
                height={padTop + priceH + volH - volY(c.v)}
                fill={c.c >= c.o ? UP : DOWN}
                opacity={0.18}
              />
            ))}

          {/* forecast cone + median */}
          {conePath && <path d={conePath} fill="url(#cone)" stroke="none" />}
          {medianPath && (
            <path d={medianPath} fill="none" stroke={UP} strokeWidth={1.8} strokeDasharray="5 4" />
          )}

          {/* candles */}
          {candles.map((c, i) => {
            const up = c.c >= c.o;
            const color = up ? UP : DOWN;
            const top = y(Math.max(c.o, c.c));
            const bot = y(Math.min(c.o, c.c));
            return (
              <g key={i}>
                <line x1={x(i)} y1={y(c.h)} x2={x(i)} y2={y(c.l)} stroke={color} strokeWidth={1} />
                <rect
                  x={x(i) - bodyW / 2}
                  y={top}
                  width={bodyW}
                  height={Math.max(1, bot - top)}
                  fill={color}
                />
              </g>
            );
          })}

          {/* last-price marker line + tag */}
          {candles.length > 0 && (
            <g>
              <line
                x1={0}
                y1={y(lastClose)}
                x2={plotW}
                y2={y(lastClose)}
                stroke={UP}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <rect x={w - padRight + 2} y={y(lastClose) - 9} width={padRight - 4} height={18} rx={3} fill={UP} />
              <text
                x={w - padRight / 2}
                y={y(lastClose) + 3.5}
                fontSize={10.5}
                fontWeight={600}
                textAnchor="middle"
                fill="#04130d"
              >
                {fmt(lastClose)}
              </text>
            </g>
          )}

          {/* bottom time axis */}
          {timeLabels?.map((label, i) => {
            const px = (plotW / (timeLabels.length - 1)) * i;
            return (
              <text
                key={label + i}
                x={Math.min(plotW - 16, Math.max(16, px))}
                y={h - 6}
                fontSize={10.5}
                fill={AXIS}
                textAnchor="middle"
              >
                {label}
              </text>
            );
          })}
        </svg>
      )}
    </div>
  );
}

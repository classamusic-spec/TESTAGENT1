"use client";

import { cn } from "@/lib/utils";

const UP = "#34d399";

/** Tiny area sparkline. */
export function Sparkline({
  data,
  className,
  color = UP,
  height = 40,
}: {
  data: number[];
  className?: string;
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return <div className={className} style={{ height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  const id = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn("w-full", className)} style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Semicircular sentiment gauge (0-100). */
export function Gauge({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(1, Math.max(0, value / max));
  const r = 42;
  const cx = 50;
  const cy = 50;
  const start = Math.PI; // 180deg
  const end = 0;
  const angle = start + (end - start) * pct;
  const nx = cx + r * Math.cos(angle);
  const ny = cy - r * Math.sin(angle);
  const arc = (from: number, to: number) =>
    `M ${cx + r * Math.cos(from)} ${cy - r * Math.sin(from)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(to)} ${cy - r * Math.sin(to)}`;
  return (
    <svg viewBox="0 4 100 52" className="w-full">
      <path d={arc(Math.PI, 0)} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth={7} strokeLinecap="round" />
      <path d={arc(Math.PI, angle)} fill="none" stroke={UP} strokeWidth={7} strokeLinecap="round" />
      <circle cx={nx} cy={ny} r={4} fill={UP} />
    </svg>
  );
}

/** Segmented strength meter (value out of `segments`). */
export function BarMeter({
  value,
  segments = 10,
  className,
}: {
  value: number; // 0..segments
  segments?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end gap-[3px]", className)}>
      {Array.from({ length: segments }).map((_, i) => {
        const active = i < Math.round(value);
        return (
          <span
            key={i}
            className={cn("flex-1 rounded-[2px] transition-colors", active ? "bg-primary" : "bg-muted")}
            style={{ height: `${8 + (i / segments) * 14}px` }}
          />
        );
      })}
    </div>
  );
}

/** Win/loss split bar. */
export function WinLossBar({ winRate }: { winRate: number }) {
  const pct = Math.round(winRate * 100);
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      <div className="h-full bg-danger" style={{ width: `${100 - pct}%` }} />
    </div>
  );
}

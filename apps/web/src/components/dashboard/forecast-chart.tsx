"use client";

import {
  ColorType,
  LineStyle,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

import type { Candle, Forecast } from "@kronos/shared";

const PRIMARY = "#22d3a6";
const DANGER = "#ef4444";
const MUTED = "#94a3b8";

function toTime(ms: number): UTCTimestamp {
  return Math.floor(ms / 1000) as UTCTimestamp;
}

export function ForecastChart({
  candles,
  forecast,
}: {
  candles: Candle[];
  forecast: Forecast;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || candles.length === 0) return;

    const chart: IChartApi = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: MUTED,
        fontFamily: "var(--font-sans)",
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.06)" },
        horzLines: { color: "rgba(148,163,184,0.06)" },
      },
      rightPriceScale: { borderColor: "rgba(148,163,184,0.15)" },
      timeScale: {
        borderColor: "rgba(148,163,184,0.15)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 0 },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: PRIMARY,
      downColor: DANGER,
      borderUpColor: PRIMARY,
      borderDownColor: DANGER,
      wickUpColor: PRIMARY,
      wickDownColor: DANGER,
    });
    candleSeries.setData(
      candles.map((c) => ({
        time: toTime(c.openTime),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    const last = candles[candles.length - 1]!;
    const anchor = { time: toTime(last.openTime), value: last.close };

    const median = chart.addLineSeries({
      color: PRIMARY,
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    median.setData([anchor, ...forecast.steps.map((s) => ({ time: toTime(s.openTime), value: s.close }))]);

    const bound = (key: "upper" | "lower") =>
      chart
        .addLineSeries({
          color: "rgba(34,211,166,0.35)",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        })
        .setData([anchor, ...forecast.steps.map((s) => ({ time: toTime(s.openTime), value: s[key] }))]);
    bound("upper");
    bound("lower");

    chart.timeScale().fitContent();

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0]!.contentRect;
      chart.resize(width, height);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [candles, forecast]);

  return <div ref={containerRef} className="h-full w-full" />;
}

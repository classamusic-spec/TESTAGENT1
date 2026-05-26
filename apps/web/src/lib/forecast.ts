"use client";

import { useQuery } from "@tanstack/react-query";
import type { Candle, Forecast, TradingPair } from "@kronos/shared";

import { env } from "@/lib/env";
import { getSampleForecast } from "@/lib/sample-data";

export interface ForecastData {
  candles: Candle[];
  forecast: Forecast;
  isSample: boolean;
}

async function fetchLive(pair: TradingPair, interval: string): Promise<ForecastData> {
  const [candlesRes, forecastRes] = await Promise.all([
    fetch(`${env.apiUrl}/candles/${pair}?interval=${interval}&limit=120`, { cache: "no-store" }),
    fetch(`${env.apiUrl}/forecast/${pair}?interval=${interval}`, { cache: "no-store" }),
  ]);
  if (!candlesRes.ok || !forecastRes.ok) throw new Error("forecast API unavailable");
  return {
    candles: (await candlesRes.json()) as Candle[],
    forecast: (await forecastRes.json()) as Forecast,
    isSample: false,
  };
}

/**
 * Forecast data hook. Reads live forecasts from apps/api when reachable, and
 * falls back to deterministic sample data otherwise (so the dashboard always
 * renders). The `isSample` flag drives the "Sample data" badge.
 */
export function useForecast(pair: TradingPair, interval = "1h") {
  return useQuery<ForecastData>({
    queryKey: ["forecast", pair, interval],
    queryFn: async () => {
      try {
        return await fetchLive(pair, interval);
      } catch {
        return { ...getSampleForecast(pair, interval), isSample: true };
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

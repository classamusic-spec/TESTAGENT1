"use client";

import { useQuery } from "@tanstack/react-query";
import type { TradingPair } from "@kronos/shared";

import { getSampleForecast, type SampleForecast } from "@/lib/sample-data";

/**
 * Forecast data hook. Today it serves deterministic sample data so the
 * dashboard renders without live infra. This is the single seam to swap in the
 * real apps/api forecast endpoint once the data pipeline runs against a live
 * (testnet) source — the component contract stays the same.
 */
export function useForecast(pair: TradingPair, interval = "1h") {
  return useQuery<SampleForecast & { isSample: boolean }>({
    queryKey: ["forecast", pair, interval],
    queryFn: async () => ({ ...getSampleForecast(pair, interval), isSample: true }),
    staleTime: 60_000,
  });
}

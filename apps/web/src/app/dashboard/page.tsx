"use client";

import dynamic from "next/dynamic";
import { Activity, FlaskConical } from "lucide-react";
import { useState } from "react";
import type { TradingPair } from "@kronos/shared";

import { AssetSelect } from "@/components/dashboard/asset-select";
import { ForecastSummary } from "@/components/dashboard/forecast-summary";
import { PaperPanel } from "@/components/dashboard/paper-panel";
import { RiskPanel } from "@/components/dashboard/risk-panel";
import { StatCards } from "@/components/dashboard/stat-cards";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { useForecast } from "@/lib/forecast";

const ForecastChart = dynamic(
  () => import("@/components/dashboard/forecast-chart").then((m) => m.ForecastChart),
  { ssr: false, loading: () => <div className="h-full w-full rounded-md shimmer" /> },
);

export default function DashboardPage() {
  const [pair, setPair] = useState<TradingPair>("ETH/USDC");
  const { data, isLoading } = useForecast(pair);

  return (
    <div className="relative min-h-screen">
      <AuroraBackground className="h-[420px]" />

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
              <Activity className="h-5 w-5" />
            </span>
            Kronos Trader
          </a>
          <div className="flex items-center gap-3">
            <AssetSelect selected={pair} onSelect={setPair} />
            <ConnectWalletButton />
          </div>
        </div>
      </header>

      <main className="container space-y-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="font-mono">{pair}</span> forecast
            </h1>
            <p className="text-sm text-muted-foreground">
              Probabilistic 12-step outlook · 1h candles · top-20 universe
            </p>
          </div>
          {data?.isSample && (
            <Badge variant="muted">
              <FlaskConical className="h-3.5 w-3.5" />
              Sample data
            </Badge>
          )}
        </div>

        {data && <StatCards candles={data.candles} forecast={data.forecast} />}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="ring-gradient lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-mono text-base">{pair}</CardTitle>
              <span className="text-xs text-muted-foreground">
                History + 12-step forecast (80% band)
              </span>
            </CardHeader>
            <CardContent>
              <div className="h-[360px] w-full">
                {isLoading || !data ? (
                  <div className="h-full w-full rounded-md shimmer" />
                ) : (
                  <ForecastChart candles={data.candles} forecast={data.forecast} />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {data && <ForecastSummary forecast={data.forecast} />}
            <RiskPanel />
          </div>
        </div>

        {data && <PaperPanel candles={data.candles} />}

        {data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Forecast steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 text-right font-medium">Median (p50)</th>
                      <th className="pb-2 text-right font-medium">Lower</th>
                      <th className="pb-2 text-right font-medium">Upper</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {data.forecast.steps.slice(0, 8).map((s) => (
                      <tr key={s.openTime} className="border-t border-border/60">
                        <td className="py-2 text-muted-foreground">
                          {new Date(s.openTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2 text-right text-foreground">{s.close.toFixed(4)}</td>
                        <td className="py-2 text-right text-muted-foreground">{s.lower.toFixed(4)}</td>
                        <td className="py-2 text-right text-muted-foreground">{s.upper.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

"use client";

import { Activity } from "lucide-react";
import { useState } from "react";
import type { TradingPair } from "@kronos/shared";

import { AssetPrefsPanel } from "@/components/dashboard/asset-prefs-panel";
import { AssetSelect } from "@/components/dashboard/asset-select";
import { CalibrationChart } from "@/components/dashboard/calibration-chart";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { NetworkBadge } from "@/components/dashboard/network-badge";
import { NotificationPrefsPanel } from "@/components/dashboard/notification-prefs-panel";
import { PnlAnalytics } from "@/components/dashboard/pnl-analytics";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { useForecast } from "@/lib/forecast";

export default function AnalyticsPage() {
  const [pair, setPair] = useState<TradingPair>("ETH/USDC");
  const { data, isLoading } = useForecast(pair);

  return (
    <div className="relative min-h-screen">
      <AuroraBackground className="h-[420px]" />

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-primary text-primary-foreground shadow-[0_2px_12px_-2px_hsl(158_84%_45%/0.6)]">
                <Activity className="h-5 w-5" />
              </span>
              Kronos Trader
            </a>
            <DashboardNav />
          </div>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <AssetSelect selected={pair} onSelect={setPair} />
            <ConnectWalletButton />
          </div>
        </div>
      </header>

      <main className="container space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{pair}</span> · paper performance, model calibration, and
            preferences
          </p>
        </div>

        {isLoading || !data ? (
          <div className="h-[480px] w-full rounded-md shimmer" />
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <PnlAnalytics candles={data.candles} />
              <CalibrationChart candles={data.candles} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <AssetPrefsPanel />
              <NotificationPrefsPanel />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

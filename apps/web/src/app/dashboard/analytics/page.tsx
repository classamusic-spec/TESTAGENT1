"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useState } from "react";
import type { TradingPair } from "@kronos/shared";

import { AssetPrefsPanel } from "@/components/dashboard/asset-prefs-panel";
import { AssetSelect } from "@/components/dashboard/asset-select";
import { CalibrationChart } from "@/components/dashboard/calibration-chart";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { ModelHealth } from "@/components/dashboard/model-health";
import { NetworkBadge } from "@/components/dashboard/network-badge";
import { NotificationPrefsPanel } from "@/components/dashboard/notification-prefs-panel";
import { PnlAnalytics } from "@/components/dashboard/pnl-analytics";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { useForecast } from "@/lib/forecast";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/motion";

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
              Lodestar
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

      <motion.main
        className="container space-y-6 py-8"
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
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
          <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
            <motion.div className="grid gap-6 lg:grid-cols-2" variants={staggerItem}>
              <PnlAnalytics candles={data.candles} />
              <div className="space-y-6">
                <CalibrationChart candles={data.candles} />
                <ModelHealth />
              </div>
            </motion.div>
            <motion.div className="grid gap-6 lg:grid-cols-2" variants={staggerItem}>
              <AssetPrefsPanel />
              <NotificationPrefsPanel />
            </motion.div>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}

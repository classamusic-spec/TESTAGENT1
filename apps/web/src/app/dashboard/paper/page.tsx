"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useState } from "react";
import type { TradingPair } from "@kronos/shared";

import { AssetSelect } from "@/components/dashboard/asset-select";
import { BotLiveView } from "@/components/dashboard/bot-live-view";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DepositCard } from "@/components/dashboard/deposit-card";
import { ExperienceToggle } from "@/components/dashboard/experience-toggle";
import { NetworkBadge } from "@/components/dashboard/network-badge";
import { PaperLab } from "@/components/dashboard/paper-lab";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Badge } from "@/components/ui/badge";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { useExperienceMode } from "@/lib/experience-mode";
import { useForecast } from "@/lib/forecast";
import { fadeUp } from "@/lib/motion";

export default function PaperPage() {
  const [pair, setPair] = useState<TradingPair>("ETH/USDC");
  const { data, isLoading } = useForecast(pair);
  const mode = useExperienceMode((s) => s.mode);
  const newbie = mode === "newbie";

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
            <ExperienceToggle />
            <NetworkBadge />
            <AssetSelect selected={pair} onSelect={setPair} />
            <ConnectWalletButton />
          </div>
        </div>
      </header>

      <motion.main className="container space-y-6 py-8" variants={fadeUp} initial="hidden" animate="show">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {newbie ? "Your trading bot" : "Paper trading lab"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {newbie
                ? "Add funds, pick a risk level, and watch the AI trade in real time."
                : `${pair} · watch the bot trade autonomously with your limits`}
            </p>
          </div>
          <Badge variant="primary">Paper · no real funds</Badge>
        </div>

        {isLoading || !data ? (
          <div className="h-[520px] w-full rounded-2xl shimmer" />
        ) : newbie ? (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <DepositCard />
            <BotLiveView candles={data.candles} symbol={pair.split("/")[0]} />
          </div>
        ) : (
          <PaperLab candles={data.candles} symbol={pair.split("/")[0]} />
        )}
      </motion.main>
    </div>
  );
}

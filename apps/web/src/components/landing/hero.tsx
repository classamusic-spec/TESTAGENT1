"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { ForecastPreview } from "@/components/landing/forecast-preview";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-backdrop absolute inset-0 -z-10" />
      <div className="container grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Badge variant="primary" className="mb-6">
            <ShieldCheck className="h-3.5 w-3.5" />
            Non-custodial · Paper trading by default
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Trade crypto with a <span className="text-gradient">forecasting model</span>, not a black box.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            Kronos generates probabilistic OHLCV forecasts, derives signals, and executes on-chain
            through delegated session keys. You connect a wallet and keep custody the whole way.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ConnectWalletButton size="lg" />
            <a href="#how-it-works" className={buttonVariants({ variant: "outline", size: "lg" })}>
              See how it works
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Live trading is always a separate, explicit opt-in. We never take custody of your funds.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        >
          <Card className="shadow-2xl shadow-primary/5">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="font-mono text-base">ETH / USDC</CardTitle>
                <CardDescription>1h forecast · 80% interval</CardDescription>
              </div>
              <Badge variant="primary">p(up) 0.68</Badge>
            </CardHeader>
            <CardContent>
              <ForecastPreview />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

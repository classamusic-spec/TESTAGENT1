"use client";

import { motion } from "framer-motion";
import { LineChart, Lock, ShieldCheck, Target } from "lucide-react";

import { TerminalPreview } from "@/components/landing/terminal-preview";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { buttonVariants } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";

const points = [
  { icon: ShieldCheck, title: "Non-custodial", body: "You keep control" },
  { icon: Lock, title: "Bank-grade security", body: "Read-only by design" },
  { icon: Target, title: "Built for traders", body: "Speed. Accuracy. Edge." },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <AuroraBackground className="h-[560px]" />
      <div className="container grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,460px)_1fr] lg:gap-12 lg:py-16">
        {/* Left column */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Signal-first <span className="text-border">•</span> Quant-driven{" "}
            <span className="text-border">•</span> Wallet-connected
          </div>

          <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl">
            Trade the top 20 crypto markets with <span className="text-shimmer">live model signals.</span>
          </h1>

          <p className="mt-6 max-w-md text-pretty text-base text-muted-foreground sm:text-lg">
            AI forecasts. Ranked setups. Execution-ready insights. Connect your wallet and trade with
            institutional-grade edge.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ConnectWalletButton size="lg" />
            <a href="/dashboard/analytics" className={buttonVariants({ variant: "outline", size: "lg" })}>
              <LineChart className="h-4 w-4" />
              Explore Signals
            </a>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {points.map((p) => (
              <div key={p.title} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-inset ring-primary/20">
                  <p.icon className="h-4 w-4" />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{p.title}</span>
                  <span className="block text-xs text-muted-foreground">{p.body}</span>
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right column — live terminal preview */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="min-w-0"
        >
          <TerminalPreview />
        </motion.div>
      </div>
    </section>
  );
}

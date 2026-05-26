"use client";

import { motion } from "framer-motion";
import { BrainCircuit, LineChart, Lock, Replace } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { staggerContainer, staggerItem } from "@/lib/motion";

const features = [
  {
    icon: BrainCircuit,
    title: "Probabilistic forecasts",
    body: "Kronos produces full OHLCV distributions, not point guesses. Signals carry confidence and prediction intervals so you can see the uncertainty.",
  },
  {
    icon: Lock,
    title: "You keep custody",
    body: "Trades execute through delegated session keys with strict, human-set limits. We never hold your funds or your seed phrase.",
  },
  {
    icon: LineChart,
    title: "Paper trading first",
    body: "Every account starts in paper mode. Watch the bot trade against live prices with zero risk before committing real capital.",
  },
  {
    icon: Replace,
    title: "Honest backtests",
    body: "Walk-forward only, with transaction costs and slippage modeled. No look-ahead bias, no curve-fit fantasies.",
  },
];

export function Features() {
  return (
    <section id="features" className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Built like trading infrastructure, not a casino
        </h2>
        <p className="mt-4 text-muted-foreground">
          Every design choice protects you from the failure modes that wreck most trading bots.
        </p>
      </div>
      <motion.div
        className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {features.map((feature) => (
          <motion.div key={feature.title} variants={staggerItem} className="h-full">
            <Card className="ring-gradient group h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
              <CardHeader>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/20 transition-transform duration-300 group-hover:scale-110">
                  <feature.icon className="h-5 w-5" />
                </span>
                <CardTitle className="mt-2 text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.body}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

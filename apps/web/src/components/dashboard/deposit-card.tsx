"use client";

import { Lock, Power, Shield, Sparkles, Wallet, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type RiskLevel } from "@/lib/auto-trader";
import { type Stablecoin, useBotAccount } from "@/lib/bot-account";
import { CHAINS, useChain } from "@/lib/chain-store";
import { cn } from "@/lib/utils";

const PRESETS: { level: RiskLevel; label: string; blurb: string; icon: typeof Shield }[] = [
  { level: "conservative", label: "Conservative", blurb: "Smaller size, tight stops, long-only", icon: Shield },
  { level: "balanced", label: "Balanced", blurb: "Moderate size, longs & shorts", icon: Sparkles },
  { level: "aggressive", label: "Aggressive", blurb: "Larger size, trailing stops", icon: Zap },
];

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

export function DepositCard() {
  const { currency, deposit, riskLevel, running, setCurrency, setDeposit, setRiskLevel, start, stop } =
    useBotAccount();
  const chain = useChain((s) => s.chain);
  const chainMeta = CHAINS[chain];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4 text-primary" />
          Fund your bot
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Add {currency} on {chainMeta.label}, pick a risk level, and the AI does the rest.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Currency */}
        <div className="flex gap-1 rounded-lg bg-secondary/40 p-1">
          {(["USDC", "USDT"] as Stablecoin[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                currency === c ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5">
            <span className="text-lg text-muted-foreground">$</span>
            <input
              type="number"
              min={1}
              value={deposit}
              onChange={(e) => setDeposit(Math.max(1, Number(e.target.value)))}
              disabled={running}
              className="w-full bg-transparent font-mono text-2xl font-semibold outline-none disabled:opacity-60"
            />
            <span className="text-sm text-muted-foreground">{currency}</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setDeposit(a)}
                disabled={running}
                className="flex-1 rounded-md border border-border/50 bg-secondary/30 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                ${a.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Risk presets */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Risk level</p>
          {PRESETS.map((p) => (
            <button
              key={p.level}
              type="button"
              onClick={() => setRiskLevel(p.level)}
              disabled={running}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-60",
                riskLevel === p.level
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/50 bg-secondary/20 hover:border-border",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  riskLevel === p.level ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground",
                )}
              >
                <p.icon className="h-4 w-4" />
              </span>
              <span className="flex-1 leading-tight">
                <span className="block text-sm font-semibold">{p.label}</span>
                <span className="block text-xs text-muted-foreground">{p.blurb}</span>
              </span>
              <span
                className={cn(
                  "h-4 w-4 rounded-full border-2",
                  riskLevel === p.level ? "border-primary bg-primary" : "border-border",
                )}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={running ? stop : start}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
            running
              ? "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
              : "bg-primary text-primary-foreground hover:brightness-105",
          )}
        >
          <Power className="h-4 w-4" />
          {running ? "Stop bot" : "Start bot"}
        </button>

        <p className="flex items-start gap-2 rounded-lg bg-secondary/30 px-3 py-2 text-[11px] text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Non-custodial: funds stay in your wallet. The bot trades via a scoped, spend-capped session
          key on {chainMeta.label} ({chainMeta.dex}). Paper today — live execution is testnet-gated.
        </p>
      </CardContent>
    </Card>
  );
}

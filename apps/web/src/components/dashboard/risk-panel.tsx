"use client";

import { Lock, OctagonX, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";

import { GoLiveDialog } from "@/components/dashboard/go-live-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { haltTrading, resumeTrading } from "@/lib/control";
import { useSessionKey } from "@/lib/session-key-store";
import { useSession } from "@/lib/session-store";
import { useTradingMode } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Read-only risk display + the live-trading opt-in. Per invariant 3 these limits
 * are set by humans only and no UI path mutates them at runtime. Per invariant 2
 * the mode defaults to paper; going live is an explicit, separate opt-in.
 */
const LIMITS = [
  { label: "Max position size", value: "$500" },
  { label: "Max drawdown", value: "15%" },
];

export function RiskPanel() {
  const mode = useTradingMode((s) => s.mode);
  const setMode = useTradingMode((s) => s.setMode);
  const hasSessionKey = useSessionKey((s) => s.grant !== null);
  const token = useSession((s) => s.token);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [halted, setHalted] = useState(false);
  const isLive = mode === "live";

  async function toggleHalt() {
    if (!token) return;
    const ok = halted ? await resumeTrading(token) : await haltTrading(token);
    if (ok) setHalted(!halted);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Risk &amp; mode</CardTitle>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
            isLive
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-primary/30 bg-primary/10 text-primary",
          )}
        >
          {isLive ? <Zap className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {isLive ? "Live · testnet" : "Paper"}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="space-y-2.5 text-sm">
          {LIMITS.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-mono text-foreground">{row.value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Trading authority</dt>
            <dd className="font-mono text-foreground">{isLive ? "Live (testnet)" : "Paper only"}</dd>
          </div>
        </dl>

        <p className="flex items-start gap-2 rounded-md bg-secondary/60 p-3 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Limits are set by you and cannot be changed automatically by the bot.
        </p>

        {isLive && (
          <p className="rounded-md bg-secondary/60 p-3 text-xs text-muted-foreground">
            {hasSessionKey
              ? "Live execution armed: long/flat spot swaps on Base Sepolia via your session key."
              : "Grant a session key below to enable live execution."}
          </p>
        )}

        {isLive ? (
          <Button variant="outline" className="w-full" onClick={() => setMode("paper")}>
            Return to paper trading
          </Button>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setDialogOpen(true)}>
            <Zap className="h-4 w-4" />
            Enable live trading
          </Button>
        )}
        <button
          type="button"
          onClick={toggleHalt}
          disabled={!token}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
            halted
              ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              : "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
          )}
          title={token ? undefined : "Sign in to use the kill switch"}
        >
          <OctagonX className="h-4 w-4" />
          {halted ? "Resume trading" : "Emergency stop"}
        </button>
      </CardContent>

      <GoLiveDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Card>
  );
}

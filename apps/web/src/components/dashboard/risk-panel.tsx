"use client";

import { Lock, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTradingMode } from "@/lib/store";

/**
 * Read-only risk display. Per invariant 3 these limits are set by humans only
 * and no UI path mutates them at runtime. Per invariant 2 the mode defaults to
 * paper; graduating to live is a separate explicit opt-in (Phase 6+).
 */
const LIMITS = [
  { label: "Max position size", value: "$500" },
  { label: "Max drawdown", value: "15%" },
  { label: "Trading authority", value: "Paper only" },
];

export function RiskPanel() {
  const mode = useTradingMode((s) => s.mode);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Risk &amp; mode</CardTitle>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          {mode === "paper" ? "Paper" : "Live"}
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
        </dl>
        <p className="flex items-start gap-2 rounded-md bg-secondary/60 p-3 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Limits are set by you and cannot be changed automatically by the bot.
        </p>
      </CardContent>
    </Card>
  );
}

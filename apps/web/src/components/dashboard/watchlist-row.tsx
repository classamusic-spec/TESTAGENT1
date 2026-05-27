"use client";

import { ChevronRight, Plus } from "lucide-react";

import { TokenAvatar } from "@/components/dashboard/asset-select";
import { Sparkline } from "@/components/ui/metrics";
import { genCandles } from "@/lib/market-mock";
import { cn } from "@/lib/utils";

const WATCH = [
  { symbol: "BTC", pair: "BTC/USDT", price: "67,842.31", change: "+1.91%", seed: 1 },
  { symbol: "ETH", pair: "ETH/USDC", price: "3,102.40", change: "+2.47%", seed: 2, active: true },
  { symbol: "SOL", pair: "SOL/USDT", price: "165.28", change: "+3.12%", seed: 3 },
  { symbol: "BNB", pair: "BNB/USDT", price: "605.74", change: "+1.23%", seed: 4 },
  { symbol: "XRP", pair: "XRP/USDT", price: "0.5287", change: "+1.05%", seed: 5 },
  { symbol: "DOGE", pair: "DOGE/USDT", price: "0.1351", change: "+2.45%", seed: 6 },
];

export function WatchlistRow() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Watchlist</h2>
        <span className="flex h-5 w-5 items-center justify-center rounded-md border border-border/60 text-muted-foreground">
          <Plus className="h-3 w-3" />
        </span>
      </div>
      <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
        {WATCH.map((w) => (
          <div
            key={w.pair}
            className={cn(
              "glass flex min-w-[180px] flex-1 items-center gap-3 rounded-xl p-3",
              w.active && "ring-1 ring-primary/40",
            )}
          >
            <TokenAvatar symbol={w.symbol} className="h-8 w-8 text-[10px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">{w.pair}</p>
              <p className="font-mono text-sm font-semibold">{w.price}</p>
              <p className="font-mono text-[11px] text-primary">{w.change}</p>
            </div>
            <Sparkline data={genCandles(w.seed, 20, 100, 0.03).map((c) => c.c)} height={32} className="w-12" />
          </div>
        ))}
        <button className="flex shrink-0 items-center justify-center rounded-xl border border-border/60 px-2 text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

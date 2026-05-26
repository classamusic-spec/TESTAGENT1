"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TRADEABLE_ASSETS, type TradingPair } from "@kronos/shared";

import { useAssetPrefs } from "@/lib/asset-prefs";
import { cn } from "@/lib/utils";

export function TokenAvatar({ symbol, className }: { symbol: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-teal-400/10 text-[10px] font-bold text-primary ring-1 ring-inset ring-primary/20",
        className,
      )}
    >
      {symbol.slice(0, 3)}
    </span>
  );
}

export function AssetSelect({
  selected,
  onSelect,
}: {
  selected: TradingPair;
  onSelect: (pair: TradingPair) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const disabled = useAssetPrefs((s) => s.disabled);
  const current = TRADEABLE_ASSETS.find((a) => a.pair === selected) ?? TRADEABLE_ASSETS[0]!;

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="glass flex w-56 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:border-primary/40"
      >
        <TokenAvatar symbol={current.symbol} />
        <span className="flex-1 leading-tight">
          <span className="block text-sm font-semibold">{current.symbol}/USDC</span>
          <span className="block text-xs text-muted-foreground">{current.name}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="glass-strong ring-gradient absolute right-0 z-50 mt-2 max-h-80 w-64 overflow-y-auto rounded-xl p-1.5 shadow-2xl shadow-black/40">
          {TRADEABLE_ASSETS.map((asset) => (
            <button
              key={asset.pair}
              type="button"
              onClick={() => {
                onSelect(asset.pair);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-secondary",
                asset.pair === selected && "bg-secondary/70",
              )}
            >
              <TokenAvatar symbol={asset.symbol} />
              <span className="flex-1 leading-tight">
                <span className="block text-sm font-medium">{asset.symbol}/USDC</span>
                <span className="block text-xs text-muted-foreground">{asset.name}</span>
              </span>
              {disabled[asset.pair] && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Paused
                </span>
              )}
              {asset.pair === selected && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

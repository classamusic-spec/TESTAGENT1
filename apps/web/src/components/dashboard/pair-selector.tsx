"use client";

import type { TradingPair } from "@kronos/shared";

import { cn } from "@/lib/utils";

export function PairSelector({
  pairs,
  selected,
  onSelect,
}: {
  pairs: TradingPair[];
  selected: TradingPair;
  onSelect: (pair: TradingPair) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1">
      {pairs.map((pair) => (
        <button
          key={pair}
          type="button"
          onClick={() => onSelect(pair)}
          className={cn(
            "rounded-md px-3 py-1.5 font-mono text-sm transition-colors",
            pair === selected
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {pair}
        </button>
      ))}
    </div>
  );
}

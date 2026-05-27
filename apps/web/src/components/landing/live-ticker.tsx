import { TrendingUp } from "lucide-react";

import { HERO_TICKER } from "@/lib/market-mock";
import { cn } from "@/lib/utils";

export function LiveTicker() {
  return (
    <div className="border-y border-border/60 bg-background/80 backdrop-blur">
      <div className="container flex items-center gap-6 overflow-x-auto py-2.5 text-sm">
        {HERO_TICKER.map((t) => (
          <div key={t.symbol} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <span className="text-muted-foreground">{t.symbol}</span>
            <span className="font-mono">{t.price}</span>
            <span className={cn("flex items-center gap-0.5 font-mono text-xs", t.up ? "text-primary" : "text-danger")}>
              <TrendingUp className={cn("h-3 w-3", !t.up && "rotate-180")} />
              {t.change}
            </span>
          </div>
        ))}
        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> LIVE
        </span>
      </div>
    </div>
  );
}

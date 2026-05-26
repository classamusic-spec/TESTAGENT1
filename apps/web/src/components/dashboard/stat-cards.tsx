import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Candle, Forecast } from "@kronos/shared";

import { SignalBadge } from "@/components/dashboard/signal-badge";
import { deriveSignal } from "@/lib/signal";
import { cn, formatPrice } from "@/lib/utils";

function StatCard({
  label,
  children,
  accent,
}: {
  label: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass ring-gradient relative overflow-hidden rounded-xl p-4",
        accent && "!bg-primary/10",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function StatCards({ candles, forecast }: { candles: Candle[]; forecast: Forecast }) {
  const last = candles[candles.length - 1]!;
  const dayAgo = candles[Math.max(0, candles.length - 25)]!;
  const change = (last.close / dayAgo.close - 1) * 100;
  const up = change >= 0;
  const side = deriveSignal(forecast.pUp);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Last price">
        <span className="font-mono text-xl font-semibold">{formatPrice(last.close)}</span>
      </StatCard>
      <StatCard label="24h change">
        <span
          className={cn(
            "inline-flex items-center gap-1 font-mono text-xl font-semibold",
            up ? "text-primary" : "text-danger",
          )}
        >
          {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {up ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      </StatCard>
      <StatCard label="Probability up" accent>
        <span className="font-mono text-xl font-semibold text-primary">
          {Math.round(forecast.pUp * 100)}%
        </span>
      </StatCard>
      <StatCard label="Signal">
        <SignalBadge side={side} />
      </StatCard>
    </div>
  );
}

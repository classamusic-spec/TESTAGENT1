"use client";

import { TRADEABLE_ASSETS } from "@kronos/shared";

import { TokenAvatar } from "@/components/dashboard/asset-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAssetPrefs } from "@/lib/asset-prefs";
import { cn } from "@/lib/utils";

export function AssetPrefsPanel() {
  const disabled = useAssetPrefs((s) => s.disabled);
  const toggle = useAssetPrefs((s) => s.toggle);
  const enabledCount = TRADEABLE_ASSETS.length - Object.keys(disabled).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tradeable assets</CardTitle>
        <p className="text-xs text-muted-foreground">
          Pause individual pairs. {enabledCount}/{TRADEABLE_ASSETS.length} enabled · the universe itself is human-set.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {TRADEABLE_ASSETS.map((asset) => {
            const on = !disabled[asset.pair];
            return (
              <div
                key={asset.pair}
                className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-secondary/20 px-3 py-2.5"
              >
                <TokenAvatar symbol={asset.symbol} className="h-8 w-8 text-[10px]" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-semibold">{asset.symbol}/USDC</span>
                  <span className="block truncate text-xs text-muted-foreground">{asset.name}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`Toggle ${asset.symbol}`}
                  onClick={() => toggle(asset.pair)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-1 py-1 transition-colors",
                    on ? "bg-primary/15" : "bg-muted",
                  )}
                >
                  {on && <span className="pl-1.5 text-[10px] font-bold uppercase text-primary">On</span>}
                  <span className={cn("relative h-4 w-7 rounded-full transition-colors", on ? "bg-primary" : "bg-slate-600")}>
                    <span
                      className={cn(
                        "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform",
                        on ? "translate-x-3.5" : "translate-x-0.5",
                      )}
                    />
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

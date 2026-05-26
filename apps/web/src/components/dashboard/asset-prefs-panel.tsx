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
          Pause individual pairs. {enabledCount}/{TRADEABLE_ASSETS.length} enabled · the universe
          itself is human-set.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid max-h-80 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
          {TRADEABLE_ASSETS.map((asset) => {
            const enabled = !disabled[asset.pair];
            return (
              <button
                key={asset.pair}
                type="button"
                onClick={() => toggle(asset.pair)}
                aria-pressed={enabled}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                  enabled
                    ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                    : "border-border/60 bg-secondary/30 opacity-60 hover:opacity-100",
                )}
              >
                <TokenAvatar symbol={asset.symbol} />
                <span className="flex-1 leading-tight">
                  <span className="block text-sm font-medium">{asset.symbol}/USDC</span>
                  <span className="block text-xs text-muted-foreground">{asset.name}</span>
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {enabled ? "On" : "Paused"}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

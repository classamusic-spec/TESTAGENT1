import { TRADEABLE_ASSETS } from "@kronos/shared";

import { TokenAvatar } from "@/components/dashboard/asset-select";

/** Infinite ticker of the top-20 tradeable assets. */
export function SupportedAssets() {
  const row = [...TRADEABLE_ASSETS, ...TRADEABLE_ASSETS];
  return (
    <div className="relative overflow-hidden border-y border-border/60 py-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
      <div className="flex w-max marquee-track gap-8">
        {row.map((asset, i) => (
          <div key={`${asset.pair}-${i}`} className="flex items-center gap-2 whitespace-nowrap">
            <TokenAvatar symbol={asset.symbol} className="h-6 w-6 text-[9px]" />
            <span className="text-sm font-medium text-muted-foreground">{asset.symbol}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

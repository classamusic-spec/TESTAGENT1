import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { SignalSide } from "@kronos/shared";

import { cn } from "@/lib/utils";

const STYLES: Record<SignalSide, { label: string; className: string; Icon: typeof Minus }> = {
  long: { label: "Long", className: "border-primary/30 bg-primary/10 text-primary", Icon: ArrowUpRight },
  short: { label: "Short", className: "border-danger/30 bg-danger/10 text-danger", Icon: ArrowDownRight },
  flat: { label: "Flat", className: "border-border bg-secondary text-muted-foreground", Icon: Minus },
};

export function SignalBadge({ side, className }: { side: SignalSide; className?: string }) {
  const { label, className: tone, Icon } = STYLES[side];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold",
        tone,
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

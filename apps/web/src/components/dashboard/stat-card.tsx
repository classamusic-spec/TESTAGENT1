import type { ReactNode } from "react";

import { Sparkline } from "@/components/ui/metrics";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  subTone,
  valueTone,
  icon,
  right,
  spark,
  sparkColor,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  subTone?: "up" | "down";
  valueTone?: "up" | "down";
  icon?: ReactNode;
  right?: ReactNode;
  spark?: number[];
  sparkColor?: string;
  className?: string;
}) {
  return (
    <div className={cn("glass ring-gradient relative overflow-hidden rounded-xl p-3.5", className)}>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-mono text-xl font-semibold leading-tight",
              valueTone === "up" && "text-primary",
              valueTone === "down" && "text-danger",
            )}
          >
            {value}
          </p>
          {sub && (
            <p
              className={cn(
                "mt-0.5 text-xs",
                subTone === "up" ? "text-primary" : subTone === "down" ? "text-danger" : "text-muted-foreground",
              )}
            >
              {sub}
            </p>
          )}
        </div>
        {right}
      </div>
      {spark && <Sparkline data={spark} height={26} color={sparkColor} className="mt-2" />}
    </div>
  );
}

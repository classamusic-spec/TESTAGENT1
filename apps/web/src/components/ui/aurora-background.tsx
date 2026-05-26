import { cn } from "@/lib/utils";

/** Animated aurora + grid + grain backdrop. Purely decorative. */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <div className="aurora" />
      <div className="grid-backdrop absolute inset-0" />
      <div className="grain absolute inset-0" />
    </div>
  );
}

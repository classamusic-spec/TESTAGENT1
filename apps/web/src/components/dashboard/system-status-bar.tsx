import { BarChart3, ChevronDown } from "lucide-react";

function Item({ label, value }: { label: string; value: string }) {
  return (
    <span className="hidden items-center gap-1.5 whitespace-nowrap sm:flex">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </span>
  );
}

export function SystemStatusBar() {
  return (
    <div className="sticky bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container flex items-center gap-5 py-2.5 text-xs">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          <span className="hidden text-muted-foreground sm:inline">System status</span>
          <span className="font-medium text-primary">All systems operational</span>
        </span>
        <span className="ml-auto flex items-center gap-5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            Data source:
            <span className="flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-1 font-medium text-foreground">
              Lodestar Index <ChevronDown className="h-3 w-3" />
            </span>
          </span>
          <Item label="Uptime" value="99.98%" />
          <Item label="Latency" value="128ms" />
          <Item label="Block" value="5,432,198" />
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
        </span>
      </div>
    </div>
  );
}

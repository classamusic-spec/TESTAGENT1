import { Activity, ScrollText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROWS = [
  { label: "Status", value: "Monitoring" },
  { label: "Uptime", value: "2d 14h 32m" },
  { label: "Next forecast", value: "11:50 PM" },
  { label: "Last update", value: "11:49 PM" },
];

export function StrategyStateCard() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Strategy state</CardTitle>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Activity className="h-3.5 w-3.5" />
          Live
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="space-y-2.5 text-sm">
          {ROWS.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="font-mono text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
        <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <ScrollText className="h-4 w-4" />
          View strategy logs
        </button>
      </CardContent>
    </Card>
  );
}

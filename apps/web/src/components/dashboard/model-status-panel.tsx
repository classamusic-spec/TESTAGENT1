import { LineChart, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PAPER_DAYS = 6;
const REQUIRED_DAYS = 14;

const META = [
  { label: "Version", value: "stub-0.1" },
  { label: "Calibration (ECE)", value: "4.2%" },
  { label: "Brier score", value: "0.21" },
  { label: "Updated", value: "6m ago" },
];

const PERF = [
  { label: "Sharpe", value: "0.86", tone: "" },
  { label: "Sortino", value: "1.32", tone: "" },
  { label: "Max DD", value: "-6.21%", tone: "down" },
  { label: "Calmar", value: "1.41", tone: "" },
];

export function ModelStatusPanel() {
  const pct = Math.round((PAPER_DAYS / REQUIRED_DAYS) * 100);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Model</CardTitle>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Self-improving
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {META.map((m) => (
            <div key={m.label}>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
              <p className="mt-0.5 font-mono text-sm font-semibold">{m.value}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="uppercase tracking-wide text-muted-foreground">Paper validation</span>
            <span className="font-mono text-foreground">
              {PAPER_DAYS} / {REQUIRED_DAYS} days
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Candidates improve from walk-forward backtests on historical data. Promotion to live needs
            14 days of paper validation and human approval; auto-rollback is armed.
          </p>
        </div>

        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">Performance (paper)</p>
          <div className="grid grid-cols-4 gap-2">
            {PERF.map((p) => (
              <div key={p.label} className="rounded-lg bg-secondary/40 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{p.label}</p>
                <p className={`mt-0.5 font-mono text-sm font-semibold ${p.tone === "down" ? "text-danger" : ""}`}>
                  {p.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <LineChart className="h-4 w-4" />
          View model diagnostics
        </button>
      </CardContent>
    </Card>
  );
}

import { GitBranch, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Self-improvement status (Phase 9). Sample values; the live data comes from the
 * backend improvement cycle (apps/api/src/improve). Promotion to live always
 * needs 14 days of paper validation + human approval (invariants 6 & 7); only
 * rollback is automatic.
 */
const PAPER_DAYS = 6;
const REQUIRED_DAYS = 14;

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
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Live</p>
            <p className="mt-0.5 font-mono font-semibold">stub-0.1</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Calibration (ECE)</p>
            <p className="mt-0.5 font-mono font-semibold">4.2%</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Brier</p>
            <p className="mt-0.5 font-mono font-semibold">0.21</p>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" />
              Candidate <span className="font-mono text-foreground">v2</span> · paper validation
            </span>
            <span className="font-mono text-foreground">
              {PAPER_DAYS}/{REQUIRED_DAYS}d
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <p className="rounded-md bg-secondary/60 p-3 text-xs text-muted-foreground">
          Candidates improve from walk-forward backtests on historical data. Promotion to live needs
          14 days of paper validation and human approval; auto-rollback is armed.
        </p>
      </CardContent>
    </Card>
  );
}

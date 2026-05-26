import type { Forecast } from "@kronos/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignalBadge } from "@/components/dashboard/signal-badge";
import { deriveSignal } from "@/lib/signal";

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ForecastSummary({ forecast }: { forecast: Forecast }) {
  const side = deriveSignal(forecast.pUp);
  const pct = Math.round(forecast.pUp * 100);
  const last = forecast.steps[forecast.steps.length - 1];
  const horizonReturn = last
    ? (last.close / (forecast.steps[0]?.close ?? last.close) - 1) * 100
    : 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Forecast signal</CardTitle>
        <SignalBadge side={side} />
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Probability up (next bar)</span>
            <span className="font-mono font-semibold text-foreground">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Model</dt>
            <dd className="font-mono text-foreground">{forecast.modelVersion}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Horizon move (p50)</dt>
            <dd className="font-mono text-foreground">{horizonReturn >= 0 ? "+" : ""}{horizonReturn.toFixed(2)}%</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Interval</dt>
            <dd className="font-mono text-foreground">{forecast.interval}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Generated</dt>
            <dd className="font-mono text-foreground">{formatTime(forecast.generatedAt)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

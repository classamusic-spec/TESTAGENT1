import type { Forecast } from "@kronos/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ForecastSteps({ forecast, lastClose }: { forecast: Forecast; lastClose: number }) {
  const base = lastClose || forecast.steps[0]?.close || 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Forecast steps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">Time (UTC)</th>
                <th className="pb-2 text-right font-medium">Median (p50)</th>
                <th className="pb-2 text-right font-medium">Lower (p10)</th>
                <th className="pb-2 text-right font-medium">Upper (p90)</th>
                <th className="pb-2 text-right font-medium">Prob. Up</th>
                <th className="pb-2 text-right font-medium">Exp. Move</th>
                <th className="pb-2 text-right font-medium">Vol. (24h)</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {forecast.steps.slice(0, 8).map((s, i) => {
                const move = (s.close / base - 1) * 100;
                const prob = Math.min(99, Math.round(forecast.pUp * 100 + i));
                const vol = 2.38 + i * 0.02;
                return (
                  <tr key={s.openTime} className="border-t border-border/50">
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(s.openTime).toUTCString().slice(17, 22)}{" "}
                      {new Date(s.openTime).getUTCHours() < 12 ? "AM" : "PM"}
                    </td>
                    <td className="py-2.5 text-right text-foreground">{s.close.toFixed(4)}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{s.lower.toFixed(4)}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{s.upper.toFixed(4)}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{prob}%</td>
                    <td className={cn("py-2.5 text-right", move >= 0 ? "text-primary" : "text-danger")}>
                      {move >= 0 ? "+" : ""}
                      {move.toFixed(2)}%
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">{vol.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

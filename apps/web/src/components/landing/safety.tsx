import { Check } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";

const guarantees = [
  "Paper trading is the default for every account.",
  "Live trading requires an explicit, separate opt-in.",
  "Position size and drawdown limits are set by you, not the bot.",
  "Forecasts use closed candles only — no look-ahead bias.",
  "Funds stay in your wallet; execution uses limited session keys.",
  "Model and strategy changes ship through human review, never auto-rewrites.",
];

export function Safety() {
  return (
    <section id="safety" className="container py-20">
      <Card className="overflow-hidden">
        <CardContent className="grid gap-10 p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Guardrails, by design</h2>
            <p className="mt-4 text-muted-foreground">
              The rules that protect you are baked into the system, not bolted on. They cannot be
              loosened automatically — even when the bot is winning.
            </p>
            <div className="mt-8">
              <ConnectWalletButton size="lg" />
            </div>
          </div>
          <ul className="space-y-4">
            {guarantees.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

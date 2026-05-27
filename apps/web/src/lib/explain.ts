import type { AutoStep, AutoTrade } from "@/lib/auto-trader";

/**
 * Plain-language narration of the bot's decisions for the simplified view.
 * Template-based and deterministic (no LLM yet); the forecast/trade objects are
 * read-only inputs — narration never feeds back into sizing or execution
 * (invariant: LLMs/explanations may only describe trades, never make them).
 */

function money(n: number): string {
  return `$${Math.abs(n).toFixed(2)}`;
}

export function explainTrade(t: AutoTrade): string {
  switch (t.reason) {
    case "open_long":
      return `Opened a long at ${money(t.price)} — the model favored upside.`;
    case "open_short":
      return `Opened a short at ${money(t.price)} — the model favored downside.`;
    case "flip":
      return `Flipped position at ${money(t.price)} as the signal reversed.`;
    case "stop_loss":
      return `Stopped out at ${money(t.price)} to protect capital (${t.realizedPnl >= 0 ? "+" : "-"}${money(t.realizedPnl)}).`;
    case "take_profit":
      return `Took profit at ${money(t.price)} (+${money(t.realizedPnl)}).`;
    case "signal_exit":
      return `Closed at ${money(t.price)} — the signal went neutral (${t.realizedPnl >= 0 ? "+" : "-"}${money(t.realizedPnl)}).`;
    default:
      return `Traded at ${money(t.price)}.`;
  }
}

/** Narrate the current state: the latest action, or the open/flat position. */
export function narrate(step: AutoStep, lastTrade?: AutoTrade): string {
  if (lastTrade && lastTrade.index === step.index) return explainTrade(lastTrade);

  const conf = Math.round(Math.abs(step.pUp - 0.5) * 200);
  if (step.positionSide === "flat") {
    return `Watching the market — waiting for a higher-confidence setup (model ${Math.round(step.pUp * 100)}% up).`;
  }
  const dir = step.positionSide === "long" ? "long" : "short";
  const stop = step.stopPrice != null ? `, stop ${money(step.stopPrice)}` : "";
  return `Holding a ${dir} from ${money(step.entryPrice ?? step.price)}${stop} — ${conf}% conviction.`;
}

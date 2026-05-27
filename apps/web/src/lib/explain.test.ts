import { describe, expect, it } from "vitest";

import type { AutoStep, AutoTrade } from "@/lib/auto-trader";
import { explainTrade, narrate } from "@/lib/explain";

function trade(reason: AutoTrade["reason"], realizedPnl = 0): AutoTrade {
  return { index: 5, time: 0, action: "buy", reason, price: 3000, units: 1, realizedPnl };
}

function step(over: Partial<AutoStep>): AutoStep {
  return {
    index: 5,
    time: 0,
    price: 3000,
    pUp: 0.5,
    signal: "flat",
    positionSide: "flat",
    entryPrice: null,
    stopPrice: null,
    targetPrice: null,
    equity: 1000,
    cash: 1000,
    event: null,
    ...over,
  };
}

describe("explain", () => {
  it("describes each trade reason in plain language", () => {
    expect(explainTrade(trade("open_long"))).toMatch(/long/i);
    expect(explainTrade(trade("stop_loss", -12))).toMatch(/stopped out/i);
    expect(explainTrade(trade("take_profit", 20))).toMatch(/profit/i);
  });

  it("narrates the latest trade when it just happened", () => {
    const t = trade("open_short");
    expect(narrate(step({ index: 5 }), t)).toMatch(/short/i);
  });

  it("narrates a flat wait and an open hold", () => {
    expect(narrate(step({ positionSide: "flat", pUp: 0.52 }))).toMatch(/waiting/i);
    const holding = narrate(step({ positionSide: "long", entryPrice: 2950, stopPrice: 2900, pUp: 0.7 }));
    expect(holding).toMatch(/holding a long/i);
  });
});

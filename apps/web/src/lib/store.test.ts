import { describe, expect, it } from "vitest";

import { DEFAULT_TRADING_MODE } from "@kronos/shared";

import { useTradingMode } from "@/lib/store";

describe("useTradingMode (invariant 2: paper is the default)", () => {
  it("starts in paper mode", () => {
    expect(DEFAULT_TRADING_MODE).toBe("paper");
    expect(useTradingMode.getState().mode).toBe("paper");
  });

  it("only switches to live via an explicit setMode call", () => {
    useTradingMode.getState().setMode("live");
    expect(useTradingMode.getState().mode).toBe("live");
    useTradingMode.getState().setMode("paper");
    expect(useTradingMode.getState().mode).toBe("paper");
  });
});

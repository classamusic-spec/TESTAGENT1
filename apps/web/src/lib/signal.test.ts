import { describe, expect, it } from "vitest";

import { getSampleForecast } from "@/lib/sample-data";
import { deriveSignal } from "@/lib/signal";

describe("deriveSignal (mirrors backend policy)", () => {
  it("maps probabilities to sides", () => {
    expect(deriveSignal(0.7)).toBe("long");
    expect(deriveSignal(0.3)).toBe("short");
    expect(deriveSignal(0.5)).toBe("flat");
  });

  it("treats thresholds as inclusive", () => {
    expect(deriveSignal(0.55)).toBe("long");
    expect(deriveSignal(0.45)).toBe("short");
  });
});

describe("getSampleForecast", () => {
  it("is deterministic for a given pair", () => {
    const a = getSampleForecast("ETH/USDC");
    const b = getSampleForecast("ETH/USDC");
    expect(a.forecast.pUp).toBe(b.forecast.pUp);
    expect(a.candles.map((c) => c.close)).toEqual(b.candles.map((c) => c.close));
  });

  it("returns only closed candles and a forecast anchored to the last candle", () => {
    const { candles, forecast } = getSampleForecast("BTC/USDC");
    expect(candles.every((c) => c.closed)).toBe(true);
    expect(forecast.basedOnCandleTime).toBe(candles[candles.length - 1]!.openTime);
    expect(forecast.steps).toHaveLength(12);
    expect(forecast.pUp).toBeGreaterThanOrEqual(0);
    expect(forecast.pUp).toBeLessThanOrEqual(1);
  });

  it("widens the prediction band with the horizon", () => {
    const { forecast } = getSampleForecast("ETH/USDC");
    const first = forecast.steps[0]!;
    const last = forecast.steps[forecast.steps.length - 1]!;
    expect(last.upper - last.lower).toBeGreaterThan(first.upper - first.lower);
  });
});

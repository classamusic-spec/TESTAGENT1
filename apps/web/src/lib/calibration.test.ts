import { describe, expect, it } from "vitest";
import type { Candle } from "@kronos/shared";

import { calibrationReport, collectPredictions } from "@/lib/calibration";

function candle(close: number, i: number): Candle {
  return {
    openTime: i * 3_600_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
    closed: true,
  } as Candle;
}

describe("calibration", () => {
  it("a perfectly calibrated set has zero ECE", () => {
    // Two bins: predictions at 0.2 that resolve up 20% of the time, and 0.8 -> 80%.
    const preds = [
      ...Array.from({ length: 100 }, (_, i) => ({ pUp: 0.2, wentUp: i < 20 })),
      ...Array.from({ length: 100 }, (_, i) => ({ pUp: 0.8, wentUp: i < 80 })),
    ];
    const report = calibrationReport(preds);
    expect(report.expectedCalibrationError).toBeCloseTo(0, 5);
    expect(report.n).toBe(200);
  });

  it("miscalibration shows up as ECE > 0", () => {
    // Says 0.9 but only goes up half the time.
    const preds = Array.from({ length: 100 }, (_, i) => ({ pUp: 0.9, wentUp: i < 50 }));
    const report = calibrationReport(preds);
    expect(report.expectedCalibrationError).toBeGreaterThan(0.3);
  });

  it("collectPredictions is causal and well-formed", () => {
    const candles = Array.from({ length: 30 }, (_, i) => candle(100 + i, i));
    const preds = collectPredictions(candles);
    expect(preds.length).toBe(30 - 1 - 6); // skips warmup (i<6) and the last bar
    for (const p of preds) {
      expect(p.pUp).toBeGreaterThanOrEqual(0);
      expect(p.pUp).toBeLessThanOrEqual(1);
    }
    // A monotonic uptrend should be predicted up.
    expect(preds.every((p) => p.wentUp)).toBe(true);
  });
});

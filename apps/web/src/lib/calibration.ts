import type { Candle } from "@kronos/shared";

/**
 * Frontend mirror of apps/api/src/improve/calibration.py. A reliability diagram
 * answers: when the model says p_up = 0.7, does the bar actually close up ~70%
 * of the time? Predictions are causal (each uses only past closes).
 */

export interface CalibrationBin {
  lower: number;
  upper: number;
  predictedMean: number;
  empiricalRate: number;
  count: number;
}

export interface CalibrationReport {
  bins: CalibrationBin[];
  expectedCalibrationError: number; // ECE, lower is better
  brierScore: number; // mean squared error of probabilities, lower is better
  n: number;
}

/** Causal momentum -> p_up, matching paper-sim's momentumPUp. */
export function momentumPUp(candles: Candle[], i: number): number {
  if (i < 6) return 0.5;
  const r = candles[i]!.close / candles[i - 6]!.close - 1;
  return 1 / (1 + Math.exp(-30 * r));
}

/** (p_up, wentUp) pairs across the series using only past candles. */
export function collectPredictions(candles: Candle[]): { pUp: number; wentUp: boolean }[] {
  const pairs: { pUp: number; wentUp: boolean }[] = [];
  for (let i = 6; i < candles.length - 1; i++) {
    pairs.push({ pUp: momentumPUp(candles, i), wentUp: candles[i + 1]!.close > candles[i]!.close });
  }
  return pairs;
}

export function calibrationReport(
  predictions: { pUp: number; wentUp: boolean }[],
  nBins = 10,
): CalibrationReport {
  const buckets: { pUp: number; wentUp: boolean }[][] = Array.from({ length: nBins }, () => []);
  for (const p of predictions) {
    const idx = Math.min(Math.floor(p.pUp * nBins), nBins - 1);
    buckets[idx]!.push(p);
  }

  const total = predictions.length;
  const bins: CalibrationBin[] = [];
  let ece = 0;
  for (let i = 0; i < nBins; i++) {
    const bucket = buckets[i]!;
    if (bucket.length === 0) continue;
    const predictedMean = bucket.reduce((a, b) => a + b.pUp, 0) / bucket.length;
    const empiricalRate = bucket.filter((b) => b.wentUp).length / bucket.length;
    bins.push({
      lower: i / nBins,
      upper: (i + 1) / nBins,
      predictedMean,
      empiricalRate,
      count: bucket.length,
    });
    ece += (bucket.length / total) * Math.abs(predictedMean - empiricalRate);
  }

  const brier =
    total > 0
      ? predictions.reduce((a, p) => a + (p.pUp - (p.wentUp ? 1 : 0)) ** 2, 0) / total
      : 0;

  return { bins, expectedCalibrationError: ece, brierScore: brier, n: total };
}

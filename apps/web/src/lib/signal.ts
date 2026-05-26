import type { SignalSide } from "@kronos/shared";

/**
 * Frontend mirror of the backend signal policy (apps/api/src/signals). Kept in
 * sync deliberately; thresholds are human-set strategy params (invariant 6).
 */
export function deriveSignal(pUp: number, longThreshold = 0.55, shortThreshold = 0.45): SignalSide {
  if (pUp >= longThreshold) return "long";
  if (pUp <= shortThreshold) return "short";
  return "flat";
}

export const SIGNAL_LABEL: Record<SignalSide, string> = {
  long: "Long",
  short: "Short",
  flat: "Flat",
};

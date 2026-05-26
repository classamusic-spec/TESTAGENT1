import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_TRADING_MODE, type TradingMode } from "@kronos/shared";

/**
 * Client-side trading-mode preference. Invariant 2: paper is the default for
 * every user, and switching to live is an explicit action. This store only
 * tracks the UI preference; real authority lives server-side in later phases.
 */
interface TradingModeState {
  mode: TradingMode;
  setMode: (mode: TradingMode) => void;
}

export const useTradingMode = create<TradingModeState>()(
  persist(
    (set) => ({
      mode: DEFAULT_TRADING_MODE,
      setMode: (mode) => set({ mode }),
    }),
    { name: "kronos-trading-mode" },
  ),
);

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { RiskLevel } from "@/lib/auto-trader";

/**
 * The simplified bot account: how much the user "deposited" (paper capital in
 * paper mode), the stablecoin, the chosen risk preset, and whether the bot is
 * running. Deposit + risk are human-set inputs the engine sizes within.
 */
export type Stablecoin = "USDC" | "USDT";

interface BotAccountState {
  currency: Stablecoin;
  deposit: number;
  riskLevel: RiskLevel;
  running: boolean;
  setCurrency: (c: Stablecoin) => void;
  setDeposit: (d: number) => void;
  setRiskLevel: (r: RiskLevel) => void;
  start: () => void;
  stop: () => void;
}

export const useBotAccount = create<BotAccountState>()(
  persist(
    (set) => ({
      currency: "USDC",
      deposit: 1000,
      riskLevel: "balanced",
      running: false,
      setCurrency: (currency) => set({ currency }),
      setDeposit: (deposit) => set({ deposit }),
      setRiskLevel: (riskLevel) => set({ riskLevel }),
      start: () => set({ running: true }),
      stop: () => set({ running: false }),
    }),
    { name: "lodestar-bot-account" },
  ),
);

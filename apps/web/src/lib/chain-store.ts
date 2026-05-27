import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Selected deposit chain. TESTNET ONLY during development (CLAUDE.md): no
 * mainnet RPC in any code path. Base Sepolia and BNB (BSC) testnet are the two
 * supported chains for funding USDC/USDT.
 */
export type ChainKey = "base" | "bnb";

export interface ChainMeta {
  key: ChainKey;
  label: string;
  short: string;
  chainId: number;
  dex: string;
}

export const CHAINS: Record<ChainKey, ChainMeta> = {
  base: { key: "base", label: "Base Sepolia", short: "Base", chainId: 84532, dex: "Uniswap" },
  bnb: { key: "bnb", label: "BNB testnet", short: "BNB", chainId: 97, dex: "PancakeSwap" },
};

interface ChainState {
  chain: ChainKey;
  setChain: (chain: ChainKey) => void;
}

export const useChain = create<ChainState>()(
  persist(
    (set) => ({
      chain: "base",
      setChain: (chain) => set({ chain }),
    }),
    { name: "lodestar-chain" },
  ),
);

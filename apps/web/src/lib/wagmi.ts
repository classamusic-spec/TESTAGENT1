import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Config } from "wagmi";
import { baseSepolia, bscTestnet, sepolia } from "wagmi/chains";

import { env } from "@/lib/env";

/**
 * wagmi v2 + RainbowKit config. TESTNET CHAINS ONLY — per the CLAUDE.md
 * permission boundary, no code path may hit a mainnet RPC during development.
 * Base Sepolia and BNB (BSC) testnet are the supported deposit chains; mainnet
 * is added later behind explicit human review.
 */
export const wagmiConfig: Config = getDefaultConfig({
  appName: "Lodestar",
  projectId: env.walletConnectProjectId,
  chains: [baseSepolia, bscTestnet, sepolia],
  ssr: true,
});

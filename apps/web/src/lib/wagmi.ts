import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Config } from "wagmi";
import { baseSepolia, sepolia } from "wagmi/chains";

import { env } from "@/lib/env";

/**
 * wagmi v2 + RainbowKit config. Phase 1 uses testnet chains only — per the
 * CLAUDE.md permission boundary, no code path may hit a mainnet RPC during
 * development. Mainnet is added in Phase 10 behind explicit review.
 */
export const wagmiConfig: Config = getDefaultConfig({
  appName: "Lodestar",
  projectId: env.walletConnectProjectId,
  chains: [baseSepolia, sepolia],
  ssr: true,
});

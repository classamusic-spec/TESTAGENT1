import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Tracks the scoped session key the owner has delegated to the bot. In a live
 * deploy the grant is produced by the smart-account SDK (ZeroDev / Biconomy) and
 * the key is installed on-chain with these limits; here it models the grant
 * state so the UI can be built and the non-custodial terms shown. Revoking is
 * always available — the owner stays in control (invariant 2/3 spirit).
 */
export interface SessionKeyGrant {
  keyAddress: string;
  spendCapUsd: number;
  validUntil: number; // unix ms
}

interface SessionKeyState {
  grant: SessionKeyGrant | null;
  grantKey: (grant: SessionKeyGrant) => void;
  revoke: () => void;
}

export const useSessionKey = create<SessionKeyState>()(
  persist(
    (set) => ({
      grant: null,
      grantKey: (grant) => set({ grant }),
      revoke: () => set({ grant: null }),
    }),
    { name: "kronos-session-key" },
  ),
);

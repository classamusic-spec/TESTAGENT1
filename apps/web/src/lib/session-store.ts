import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Owner session token from SIWE verification. Persisted so a page reload keeps
 * the owner signed in. This is a single-owner personal bot: there is no notion
 * of multiple users, just "is the owner authenticated".
 */
interface SessionState {
  token: string | null;
  address: string | null;
  setSession: (token: string, address: string) => void;
  clear: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      address: null,
      setSession: (token, address) => set({ token, address }),
      clear: () => set({ token: null, address: null }),
    }),
    { name: "kronos-session" },
  ),
);

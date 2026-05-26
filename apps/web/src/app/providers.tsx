"use client";

import {
  RainbowKitAuthenticationProvider,
  RainbowKitProvider,
  darkTheme,
  type AuthenticationStatus,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { authenticationAdapter } from "@/lib/auth-adapter";
import { fetchMe } from "@/lib/auth";
import { useSession } from "@/lib/session-store";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [status, setStatus] = useState<AuthenticationStatus>("loading");

  useEffect(() => {
    // Validate any persisted token against the API on mount.
    const { token, clear } = useSession.getState();
    if (!token) {
      setStatus("unauthenticated");
      return;
    }
    let active = true;
    fetchMe(token).then((address) => {
      if (!active) return;
      if (address) {
        setStatus("authenticated");
      } else {
        clear();
        setStatus("unauthenticated");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Keep RainbowKit's status in sync with the persisted session.
  useEffect(() => {
    return useSession.subscribe((state) => {
      setStatus(state.token ? "authenticated" : "unauthenticated");
    });
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitAuthenticationProvider adapter={authenticationAdapter} status={status}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: "hsl(156 84% 45%)",
              accentColorForeground: "hsl(222 47% 5%)",
              borderRadius: "medium",
            })}
          >
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
          </RainbowKitProvider>
        </RainbowKitAuthenticationProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

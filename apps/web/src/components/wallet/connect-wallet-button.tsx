"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ShieldCheck, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/lib/utils";

/**
 * Wallet connect entry point (Phase 1 deliverable). Wraps RainbowKit's custom
 * render API so the button matches our design system. Supports MetaMask,
 * Coinbase Wallet, and WalletConnect out of the box via getDefaultConfig.
 */
export function ConnectWalletButton({ size = "default" as const }: { size?: "default" | "lg" }) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        authenticationStatus,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const authenticated = authenticationStatus === "authenticated";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticated);

        return (
          <div
            aria-hidden={!ready}
            className={!ready ? "pointer-events-none select-none opacity-0" : undefined}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button size={size} onClick={openConnectModal}>
                    <Wallet className="h-4 w-4" />
                    {account ? "Sign in" : "Connect Wallet"}
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button size={size} variant="outline" onClick={openChainModal}>
                    Wrong network
                  </Button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <Badge variant="primary" className="hidden sm:inline-flex">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Owner
                  </Badge>
                  <Button size="sm" variant="outline" onClick={openChainModal}>
                    {chain.name}
                  </Button>
                  <Button size={size} variant="secondary" onClick={openAccountModal}>
                    <Wallet className="h-4 w-4" />
                    {shortenAddress(account.address)}
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

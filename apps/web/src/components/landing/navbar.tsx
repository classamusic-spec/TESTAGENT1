"use client";

import { Activity } from "lucide-react";

import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#safety", label: "Safety" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Activity className="h-5 w-5" />
          </span>
          Kronos Trader
        </a>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
          <a href="/dashboard" className="transition-colors hover:text-foreground">
            Dashboard
          </a>
        </nav>

        <ConnectWalletButton />
      </div>
    </header>
  );
}

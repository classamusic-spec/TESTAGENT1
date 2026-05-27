"use client";

import { Activity } from "lucide-react";

import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";

const links = [
  { href: "/dashboard", label: "Markets" },
  { href: "/dashboard/analytics", label: "Signals", dot: true },
  { href: "/dashboard/paper", label: "Strategies" },
  { href: "#pricing", label: "Pricing" },
  { href: "#docs", label: "Docs" },
  { href: "#about", label: "About" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <a href="#" className="flex items-center gap-2.5 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-primary text-primary-foreground shadow-[0_2px_14px_-2px_hsl(158_84%_45%/0.7)]">
            <Activity className="h-5 w-5" />
          </span>
          Lodestar
        </a>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="relative transition-colors hover:text-foreground"
            >
              {link.label}
              {link.dot && (
                <span className="absolute -right-2.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(158_84%_45%)]" />
              )}
            </a>
          ))}
        </nav>

        <ConnectWalletButton />
      </div>
    </header>
  );
}

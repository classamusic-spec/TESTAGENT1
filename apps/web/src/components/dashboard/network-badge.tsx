"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CHAINS, type ChainKey, useChain } from "@/lib/chain-store";
import { cn } from "@/lib/utils";

/** Testnet chain selector (Base Sepolia / BNB testnet). Testnet only. */
export function NetworkBadge() {
  const chain = useChain((s) => s.chain);
  const setChain = useChain((s) => s.setChain);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = CHAINS[chain];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        {current.label} · testnet
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="glass-strong absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl p-1 shadow-2xl shadow-black/40">
          {(Object.keys(CHAINS) as ChainKey[]).map((key) => {
            const c = CHAINS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setChain(key);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary",
                  key === chain && "bg-secondary/70",
                )}
              >
                <span className="flex-1 leading-tight">
                  <span className="block font-medium">{c.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{c.dex} · testnet</span>
                </span>
                {key === chain && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

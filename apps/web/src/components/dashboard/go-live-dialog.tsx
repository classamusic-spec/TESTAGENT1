"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useTradingMode } from "@/lib/store";

const RISKS = [
  "Live mode executes real on-chain swaps on Base Sepolia testnet.",
  "The bot places trades automatically from model forecasts — not financial advice.",
  "Crypto is volatile; your position-size and drawdown limits reduce but do not eliminate loss.",
  "This is experimental software. You can switch back to paper at any time.",
];

/**
 * Explicit, separate opt-in for live trading (invariant 2). The confirm button
 * stays disabled until the user acknowledges the risks. Downgrading back to
 * paper is the safe direction and needs no confirmation.
 */
export function GoLiveDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const setMode = useTradingMode((s) => s.setMode);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) setAcknowledged(false);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function confirm() {
    setMode("live");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Enable live trading"
        >
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="glass-strong relative w-full max-w-md rounded-2xl p-6"
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-lg font-semibold text-foreground">Enable live trading</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              You are leaving paper mode. Please read and acknowledge before continuing.
            </p>

            <ul className="mt-4 space-y-2.5">
              {RISKS.map((risk) => (
                <li key={risk} className="flex items-start gap-2 text-sm text-foreground/90">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                  {risk}
                </li>
              ))}
            </ul>

            <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-lg bg-secondary/50 p-3 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              I understand the risks and want to enable live trading on testnet.
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={confirm} disabled={!acknowledged}>
                Enable live trading
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

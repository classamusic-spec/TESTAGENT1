"use client";

import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, Lock, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionKey } from "@/lib/session-key-store";
import { shortenAddress } from "@/lib/utils";

const SPEND_CAP_USD = 500;
const VALID_DAYS = 7;

const TERMS = [
  "Calls the Uniswap v3 router on Base Sepolia only — no other contracts.",
  "Limited to token swaps within the top-20 universe.",
  `Cannot move more than $${SPEND_CAP_USD} in total.`,
  `Expires automatically in ${VALID_DAYS} days, and you can revoke any time.`,
];

function pseudoKeyAddress(): string {
  let hex = "0x";
  for (let i = 0; i < 40; i++) hex += Math.floor(Math.random() * 16).toString(16);
  return hex;
}

export function SessionKeyPanel() {
  const grant = useSessionKey((s) => s.grant);
  const grantKey = useSessionKey((s) => s.grantKey);
  const revoke = useSessionKey((s) => s.revoke);
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) setAcknowledged(false);
  }, [open]);

  function confirmGrant() {
    grantKey({
      keyAddress: pseudoKeyAddress(),
      spendCapUsd: SPEND_CAP_USD,
      validUntil: Date.now() + VALID_DAYS * 86_400_000,
    });
    setOpen(false);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Session key</CardTitle>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Non-custodial
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {grant ? (
          <>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Delegated key</dt>
                <dd className="font-mono text-foreground">{shortenAddress(grant.keyAddress)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Spend cap</dt>
                <dd className="font-mono text-foreground">${grant.spendCapUsd}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Expires</dt>
                <dd className="font-mono text-foreground">
                  {new Date(grant.validUntil).toLocaleDateString()}
                </dd>
              </div>
            </dl>
            <Button variant="outline" className="w-full" onClick={revoke}>
              Revoke session key
            </Button>
          </>
        ) : (
          <>
            <p className="flex items-start gap-2 rounded-md bg-secondary/60 p-3 text-xs text-muted-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Grant the bot a scoped key so it can execute swaps without ever holding your funds.
            </p>
            <Button className="w-full" onClick={() => setOpen(true)}>
              <KeyRound className="h-4 w-4" />
              Grant session key
            </Button>
          </>
        )}
      </CardContent>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Grant session key"
          >
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              className="glass-strong relative w-full max-w-md rounded-2xl p-6"
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 text-primary">
                <KeyRound className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-foreground">Grant a scoped session key</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Your funds stay in your smart account. This key only lets the bot do exactly this:
              </p>
              <ul className="mt-4 space-y-2.5">
                {TERMS.map((term) => (
                  <li key={term} className="flex items-start gap-2 text-sm text-foreground/90">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {term}
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
                I understand and want to grant this scoped, revocable key.
              </label>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={confirmGrant} disabled={!acknowledged}>
                  Grant key
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

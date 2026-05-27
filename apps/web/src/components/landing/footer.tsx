import { Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Activity className="h-4 w-4" />
          </span>
          <span className="font-medium text-foreground">Lodestar</span>
        </div>
        <p className="max-w-md text-center text-xs sm:text-right">
          Experimental software. Not financial advice. Crypto trading carries substantial risk of
          loss. Testnet only during development.
        </p>
      </div>
    </footer>
  );
}

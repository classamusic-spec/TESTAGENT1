import { SHOWCASE_TOKENS } from "@/lib/market-mock";

const TOKEN_COLORS: Record<string, string> = {
  BTC: "#f7931a", ETH: "#627eea", USDT: "#26a17b", BNB: "#f3ba2f", XRP: "#23292f",
  USDC: "#2775ca", SOL: "#14f195", TRX: "#ff060a", DOGE: "#c2a633", HYPE: "#19e6c1",
  ZEC: "#ecb244", LEO: "#16a34a", ADA: "#0033ad", XMR: "#ff6600", BCH: "#0ac18e",
  LINK: "#2a5ada", CC: "#7c3aed", DAI: "#f5ac37", XLM: "#7d00ff",
};

export function TokenStrip() {
  return (
    <section className="container py-10">
      <div className="glass rounded-2xl px-5 py-6">
        <div className="mb-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Top 20 markets <span className="text-border">•</span> Real-time data{" "}
          <span className="text-border">•</span> Model updated every 5 minutes
        </div>
        <div className="grid grid-cols-5 gap-x-2 gap-y-5 sm:grid-cols-10 lg:grid-cols-[repeat(19,minmax(0,1fr))]">
          {SHOWCASE_TOKENS.map((sym) => (
            <div key={sym} className="flex flex-col items-center gap-1.5">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-bold text-white ring-1 ring-inset ring-white/10"
                style={{ backgroundColor: `${TOKEN_COLORS[sym] ?? "#334155"}` }}
              >
                {sym.slice(0, 3)}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{sym}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    step: "01",
    title: "Connect your wallet",
    body: "MetaMask, Coinbase Wallet, or any WalletConnect wallet. No sign-up, no funds moved — just a connection.",
  },
  {
    step: "02",
    title: "Watch it forecast",
    body: "Kronos forecasts the next candles from closed data only, derives a signal, and shows you the reasoning behind every move.",
  },
  {
    step: "03",
    title: "Paper trade, then graduate",
    body: "Start in paper mode by default. When you're convinced, opt into live trading explicitly with limits you set yourself.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border/60 bg-card/30">
      <div className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-4 text-muted-foreground">
            From wallet to forecast to (optional) live execution — on your terms.
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="relative">
              <span className="font-mono text-5xl font-bold text-primary/20">{item.step}</span>
              <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LiveTicker } from "@/components/landing/live-ticker";
import { Navbar } from "@/components/landing/navbar";
import { Safety } from "@/components/landing/safety";
import { TokenStrip } from "@/components/landing/token-strip";
import { Reveal } from "@/components/ui/reveal";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TokenStrip />
        <LiveTicker />
        <Features />
        <HowItWorks />
        <Reveal>
          <Safety />
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}

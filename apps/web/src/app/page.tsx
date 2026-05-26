import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";
import { Safety } from "@/components/landing/safety";
import { SupportedAssets } from "@/components/landing/supported-assets";
import { Reveal } from "@/components/ui/reveal";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <SupportedAssets />
        <Reveal>
          <Features />
        </Reveal>
        <Reveal>
          <HowItWorks />
        </Reveal>
        <Reveal>
          <Safety />
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}

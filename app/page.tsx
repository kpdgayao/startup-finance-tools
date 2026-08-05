import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { QuietHero } from "@/components/home/quiet-hero";
import { FactStrip } from "@/components/home/fact-strip";
import { ToolIndex } from "@/components/tools/tool-index";

export const metadata: Metadata = {
  title: { absolute: "Startup Finance Toolkit | IOL Inc." },
  description: "Valuation, cap tables, SAFEs, burn rate, break-even, unit economics, PH compliance and MSME planning. Peso-native tools for Filipino startup founders, free and client-side.",
  openGraph: {
    title: "Startup Finance Toolkit | IOL Inc.",
    description: "Peso-native financial tools for Filipino startup founders. Free, no signup.",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <QuietHero />
        <FactStrip />

        <section className="container mx-auto px-4 py-14">
          <ToolIndex featured />
        </section>
      </main>
      <Footer />
    </div>
  );
}

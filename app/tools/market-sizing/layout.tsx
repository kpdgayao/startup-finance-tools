import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Sizing Calculator",
  description: "Estimate TAM, SAM, and SOM using top-down and bottom-up methods. Includes funnel chart and 3-year revenue projections.",
  openGraph: {
    title: "Market Sizing Calculator | Startup Finance Toolkit",
    description: "Estimate TAM, SAM, SOM with top-down and bottom-up methods.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

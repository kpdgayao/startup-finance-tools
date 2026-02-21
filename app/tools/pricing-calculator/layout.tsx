import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing Calculator",
  description: "Explore 6 pricing strategies: cost-plus, value-based, penetration, competitive, bundle, and psychological pricing for startups.",
  openGraph: {
    title: "Pricing Calculator | Startup Finance Toolkit",
    description: "6 pricing strategies with unit economics analysis for startups.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

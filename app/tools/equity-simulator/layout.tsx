import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Equity & Cap Table Simulator",
  description: "Simulate funding rounds, ESOP pools, and founder dilution across multiple stages. Visual cap table for Filipino startups.",
  openGraph: {
    title: "Equity & Cap Table Simulator | Startup Finance Toolkit",
    description: "Simulate funding rounds, dilution, and ownership across stages.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

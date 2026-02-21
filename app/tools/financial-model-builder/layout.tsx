import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Model Builder",
  description: "Build a 3-year integrated financial model with linked P&L, Balance Sheet, and Cash Flow statements. CSV export included.",
  openGraph: {
    title: "Financial Model Builder | Startup Finance Toolkit",
    description: "3-year integrated P&L, Balance Sheet, and Cash Flow model.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

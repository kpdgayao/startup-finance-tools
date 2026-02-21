import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pre/Post-Money Calculator",
  description: "Calculate pre-money valuation, post-money valuation, and investor equity percentage. Quick calculator for startup fundraising.",
  openGraph: {
    title: "Pre/Post-Money Calculator | Startup Finance Toolkit",
    description: "Quick pre-money and post-money valuation calculator with equity breakdown.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

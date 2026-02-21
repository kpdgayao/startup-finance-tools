import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Startup Valuation",
  description: "Learn 5 startup valuation methods: DCF, Berkus, Scorecard, VC Method, and Revenue Multiple. Understand when to use each and Philippine context valuations.",
  openGraph: {
    title: "Startup Valuation | Startup Finance Toolkit",
    description: "5 valuation methods explained for Filipino startup founders.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

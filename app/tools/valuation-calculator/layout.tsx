import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Startup Valuation Calculator",
  description: "Calculate your startup's valuation using 5 methods: DCF, Berkus, Scorecard, VC Method, and Revenue Multiple. Free tool for Filipino founders.",
  openGraph: {
    title: "Startup Valuation Calculator | Startup Finance Toolkit",
    description: "Multi-method startup valuation calculator with DCF, Berkus, Scorecard, VC Method, and Revenue Multiple.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Break-Even Analysis Calculator",
  description:
    "Calculate your break-even point in units and revenue. Interactive what-if scenarios with contribution margin analysis.",
  openGraph: {
    title: "Break-Even Analysis Calculator | Startup Finance Toolkit",
    description:
      "Find your break-even point with visual profit/loss chart and what-if sliders.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

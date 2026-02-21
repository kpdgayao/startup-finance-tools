import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cash Flow Forecaster",
  description: "Build a 12-month cash flow projection with DSO/DPO timing adjustments, visual analysis, and CSV export. Free tool for startups.",
  openGraph: {
    title: "Cash Flow Forecaster | Startup Finance Toolkit",
    description: "12-month cash flow projection with visual analysis and CSV export.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

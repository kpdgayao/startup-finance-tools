import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unit Economics Calculator",
  description: "Calculate CAC, LTV, LTV:CAC ratio, payback period, and break-even point. Includes churn sensitivity analysis for startups.",
  openGraph: {
    title: "Unit Economics Calculator | Startup Finance Toolkit",
    description: "Calculate CAC, LTV, payback period, and break-even with churn sensitivity.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

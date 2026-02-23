import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Break-Even Analysis",
  description: "Learn the break-even formula, contribution margin, and the 3 levers that move your break-even point. Practical examples in Philippine pesos for SaaS and product businesses.",
  openGraph: {
    title: "Break-Even Analysis | Startup Finance Toolkit",
    description: "Break-even analysis fundamentals for Filipino startup founders.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MSME 5-Year Financial Plan",
  description:
    "Build a realistic 5-year financial plan for Filipino MSMEs and cooperatives with conservative, base, and optimistic scenarios. Integrated P&L, Balance Sheet, Cash Flow, and Statement of Changes in Equity. PDF and CSV export.",
  openGraph: {
    title: "MSME 5-Year Financial Plan | Startup Finance Toolkit",
    description:
      "Realistic 5-year financial plan for Filipino MSMEs and cooperatives with three scenarios.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

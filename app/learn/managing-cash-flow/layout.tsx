import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Managing Cash Flow",
  description: "Learn why cash flow kills more startups than bad ideas. Understand burn rate, runway zones, working capital, and when to start fundraising in the Philippines.",
  openGraph: {
    title: "Managing Cash Flow | Startup Finance Toolkit",
    description: "Cash flow management, burn rate, and runway for PH startups.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

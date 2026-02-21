import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finance Self-Assessment Quiz",
  description: "Test your startup finance knowledge across 5 categories: Financial Statements, Valuation, Cash Management, Fundraising, and Compliance.",
  openGraph: {
    title: "Finance Self-Assessment Quiz | Startup Finance Toolkit",
    description: "Test your startup finance knowledge and get a personalized learning path.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

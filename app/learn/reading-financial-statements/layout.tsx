import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reading Financial Statements",
  description: "Understand how the three financial statements — P&L, Balance Sheet, and Cash Flow — connect and why every startup founder needs to read them.",
  openGraph: {
    title: "Reading Financial Statements | Startup Finance Toolkit",
    description: "Understanding P&L, Balance Sheet, and Cash Flow for founders.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

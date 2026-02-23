import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SAFE & Convertible Note Calculator",
  description:
    "Model how SAFEs and convertible notes convert to equity. Compare valuation cap vs. discount scenarios with visual cap table breakdown.",
  openGraph: {
    title: "SAFE & Convertible Note Calculator | Startup Finance Toolkit",
    description:
      "Calculate SAFE and convertible note conversion to equity with cap vs. discount comparison.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Startup Cost Estimator",
  description:
    "Estimate your total startup capital with PH-specific registration costs. Covers legal, office, tech, marketing, and team expenses.",
  openGraph: {
    title: "Startup Cost Estimator | Startup Finance Toolkit",
    description:
      "Calculate total startup costs for Philippine businesses with built-in registration fee estimates.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

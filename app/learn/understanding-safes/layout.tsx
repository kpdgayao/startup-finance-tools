import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Understanding SAFEs",
  description: "Learn how SAFEs and convertible notes work, including valuation caps, discount rates, and what stacking multiple SAFEs means for your cap table. Philippine context included.",
  openGraph: {
    title: "Understanding SAFEs | Startup Finance Toolkit",
    description: "SAFEs vs. convertible notes explained for Filipino startup founders.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

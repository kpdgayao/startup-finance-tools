import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing Your Product",
  description: "Learn the 6 pricing strategies every startup founder should know. Cost-plus, value-based, penetration, competitive, bundle, and psychological pricing with Philippine peso examples.",
  openGraph: {
    title: "Pricing Your Product | Startup Finance Toolkit",
    description: "6 pricing strategies for Filipino startup founders.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

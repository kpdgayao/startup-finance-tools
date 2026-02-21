import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fundraising Stage Guide",
  description: "Interactive R&D to Scaling lifecycle guide for Filipino startup founders. Track your progress through research, proof-of-concept, fundraising, operations, and scaling stages.",
  openGraph: {
    title: "Fundraising Stage Guide | Startup Finance Toolkit",
    description: "R&D to Scaling lifecycle guide with checklists, metrics, and funding sources for PH startups.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

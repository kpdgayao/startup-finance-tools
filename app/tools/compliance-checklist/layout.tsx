import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PH Compliance Checklist",
  description: "Interactive Philippine startup compliance checklist for SEC, DTI, BIR, and LGU registration. Track your progress with localStorage persistence.",
  openGraph: {
    title: "PH Compliance Checklist | Startup Finance Toolkit",
    description: "SEC, DTI, BIR registration & ongoing compliance for Filipino startups.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

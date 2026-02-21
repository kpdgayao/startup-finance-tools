import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Burn Rate & Runway Calculator",
  description: "Calculate your startup's burn rate, runway, and model what-if expense scenarios. Visualize your cash position over time.",
  openGraph: {
    title: "Burn Rate & Runway Calculator | Startup Finance Toolkit",
    description: "Calculate burn rate, runway, and model expense scenarios for your startup.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Speaker Engagement Quotation",
  description:
    "Cost a workshop, keynote or training day against a published speaking rate card. Shows every factor — duration, preparation load, audience size, weekend and holiday dates, travel from Baguio, registration fees — as its own line.",
  openGraph: {
    title: "Speaker Engagement Quotation | Startup Finance Toolkit",
    description:
      "Generate a costed speaking-engagement quotation with the rate card shown line by line.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

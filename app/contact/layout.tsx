import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Contact Kevin",
  description:
    "Get in touch with Kevin (CPA, MBA, CEO of IOL Inc.) for consulting, mentoring, speaking engagements, workshops, or partnership inquiries.",
  openGraph: {
    title: "Contact Kevin | Startup Finance Toolkit",
    description:
      "Reach out for consulting, mentoring, speaking, or partnership inquiries.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        {children}
      </main>
      <Footer />
    </div>
  );
}

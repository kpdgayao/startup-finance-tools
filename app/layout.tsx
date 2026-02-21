import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://startupfinance.tools"),
  title: {
    default: "Startup Finance Toolkit | IOL Inc.",
    template: "%s | Startup Finance Toolkit",
  },
  description:
    "Interactive financial tools for Filipino startup founders. Valuation calculators, equity simulators, burn rate analysis, and more.",
  openGraph: {
    title: "Startup Finance Toolkit | IOL Inc.",
    description:
      "Interactive financial tools for Filipino startup founders.",
    type: "website",
    locale: "en_PH",
    siteName: "Startup Finance Toolkit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Startup Finance Toolkit | IOL Inc.",
    description: "Interactive financial tools for Filipino startup founders.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:border"
        >
          Skip to main content
        </a>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

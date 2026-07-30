import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Linkedin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { GrantTimeline } from "@/components/about/grant-timeline";
import { OrganizationWall } from "@/components/about/organization-wall";
import { NAME, ROLE_LINE, ABOUT_BIO, PULL_QUOTE } from "@/lib/kevin";

export const metadata: Metadata = {
  title: "About",
  description: "The person behind the Startup Finance Toolkit.",
  openGraph: {
    title: "About | Startup Finance Toolkit",
    description: "The person behind the Startup Finance Toolkit.",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="grid grid-cols-1 min-[920px]:grid-cols-[1fr_1.4fr]">
          {/* Left rail */}
          <aside className="bg-muted border-rule p-[48px] min-[920px]:border-r min-[920px]:min-h-screen flex flex-col gap-5">
            <Image
              src="/about-portrait.jpg"
              alt={`${NAME} — ${ROLE_LINE}`}
              width={400}
              height={400}
              // Top of the left rail: this is the LCP element on /about, so it
              // must not be lazy. `sizes` keeps the mobile srcset honest — the
              // rail is full-width below 920px, a ~40vw column above it.
              priority
              sizes="(min-width: 920px) 40vw, 100vw"
              className="w-full aspect-square border border-rule object-cover"
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {ROLE_LINE}
            </p>
            <h2 className="font-serif text-[28px] leading-[1.1] text-foreground">
              {NAME}
            </h2>
            <GrantTimeline />
          </aside>

          {/* Right column */}
          <div className="p-[48px] flex flex-col gap-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              About
            </p>
            <h1 className="font-serif text-[36px] leading-[1.05] text-foreground">
              The person behind the toolkit
            </h1>
            {ABOUT_BIO.map((para, i) => (
              <p
                key={i}
                className="font-serif text-[17px] leading-[1.55] text-ink-2"
              >
                {para}
              </p>
            ))}
            <blockquote className="border-l-[3px] border-ochre pl-[18px]">
              <p className="font-serif text-[19px] italic leading-[1.45] text-ink-2">
                {PULL_QUOTE}
              </p>
            </blockquote>
            <OrganizationWall />
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="ochre">
                <Link href="/contact">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Get in touch
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a
                  href="https://www.linkedin.com/in/kpdgayao/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </a>
              </Button>
            </div>
            <p className="font-serif text-[13px] text-muted-foreground border-t border-rule pt-4">
              The broader practice — speaking, seminars, and cooperative
              education — lives at{" "}
              <a
                href="https://kevin.iol.ph"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link hover:text-ochre-deep underline underline-offset-[3px]"
              >
                kevin.iol.ph
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

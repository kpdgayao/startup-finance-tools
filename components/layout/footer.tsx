import Link from "next/link";
import { Linkedin } from "lucide-react";
import { NewsletterSection } from "@/components/shared/newsletter-section";
import { EcosystemStrip } from "@/components/shared/ecosystem-strip";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t border-border/50 mt-auto">
      <NewsletterSection />
      <EcosystemStrip />
      <Separator />
      <div className="py-6 container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>
          Startup Finance Toolkit — by Kevin Gayao for{" "}
          <a
            href="https://www.iol.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4"
          >
            IOL Inc.
          </a>
        </p>
        <p className="mt-1">
          Designed for Filipino startup founders. All calculations run
          client-side.
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a
            href="https://www.linkedin.com/in/kpdgayao/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            aria-label="LinkedIn profile"
          >
            <Linkedin className="h-4 w-4" />
            <span className="text-xs">LinkedIn</span>
          </a>
          <span className="text-border">|</span>
          <Link
            href="/contact"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}

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
          Built by{" "}
          <a
            href="https://www.iol.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4"
          >
            IOL Inc.
          </a>{" "}
          — Based on startup finance teachings by Kevin (CPA, MBA)
        </p>
        <p className="mt-1">
          Designed for Filipino startup founders. All calculations run
          client-side.
        </p>
        <a
          href="https://www.linkedin.com/in/kpdgayao/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Kevin's LinkedIn"
        >
          <Linkedin className="h-4 w-4" />
          <span className="text-xs">Kevin Philip D. Gayao</span>
        </a>
      </div>
    </footer>
  );
}

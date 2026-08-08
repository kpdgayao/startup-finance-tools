import { Mail } from "lucide-react";

export function ContactStrip() {
  return (
    <div className="py-6">
      <div className="container mx-auto px-4 max-w-xl text-center">
        <p className="text-sm font-medium mb-1">
          Questions?
        </p>
        <a
          href="mailto:hello@startupfinance.tools?subject=[SFT]%20Question"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Mail className="h-3.5 w-3.5" />
          hello@startupfinance.tools
        </a>
      </div>
    </div>
  );
}

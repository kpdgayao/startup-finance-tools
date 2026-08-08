import { Mail } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contact</h1>
        <p className="text-muted-foreground mt-1">
          Get in touch for consulting, speaking, partnerships, or general inquiries.
        </p>
      </div>

      <div className="rounded-lg border border-border/50 p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Send an email</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Kevin typically responds within 1-2 business days.
          </p>
        </div>
        <a
          href="mailto:hello@startupfinance.tools?subject=[SFT]%20Inquiry"
          className="inline-flex items-center gap-2 text-lg font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
        >
          <Mail className="h-4 w-4" />
          hello@startupfinance.tools
        </a>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { getEcosystemBanner } from "@/lib/ecosystem";
import { X, ExternalLink } from "lucide-react";

interface EcosystemBannerProps {
  toolId: string;
}

export function EcosystemBanner({ toolId }: EcosystemBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const storageKey = `ecosystem-banner-${toolId}-dismissed`;

  useEffect(() => {
    setDismissed(sessionStorage.getItem(storageKey) === "true");
    setHydrated(true);
  }, [storageKey]);

  const banner = getEcosystemBanner(toolId);
  if (!banner || !hydrated || dismissed) return null;

  const { platform, message } = banner;
  const Icon = platform.icon;

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, "true");
    setDismissed(true);
  };

  return (
    <div className="relative rounded-lg border border-border/50 bg-accent/30 p-4 pl-5 border-l-4 border-l-primary/60">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <Icon className="h-5 w-5 shrink-0 mt-0.5 text-primary/80" />
        <div>
          <p className="text-sm font-medium">{platform.name}</p>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
          <a
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-2"
          >
            Learn more <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

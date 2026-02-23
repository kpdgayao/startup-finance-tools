import { ECOSYSTEM_PLATFORMS } from "@/lib/ecosystem";
import { ExternalLink } from "lucide-react";

export function EcosystemStrip() {
  return (
    <div className="py-6">
      <div className="container mx-auto px-4 max-w-3xl">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center mb-4">
          Built by IOL
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ECOSYSTEM_PLATFORMS.map((platform) => {
            const Icon = platform.icon;

            if (platform.isCurrent) {
              return (
                <div
                  key={platform.id}
                  className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center"
                >
                  <Icon className="h-5 w-5 mx-auto mb-1.5 text-primary" />
                  <p className="text-sm font-medium">{platform.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {platform.description}
                  </p>
                </div>
              );
            }

            return (
              <a
                key={platform.id}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-lg border border-border/50 p-3 text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
              >
                <Icon className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                  {platform.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {platform.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors mt-1.5">
                  Visit <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

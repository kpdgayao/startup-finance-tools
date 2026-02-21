import Link from "next/link";
import { TOOLS } from "@/lib/constants";
import { getRelatedTools } from "@/lib/tool-relationships";
import type { ToolId } from "@/lib/ai/prompts";
import { ArrowRight } from "lucide-react";

interface RelatedToolsProps {
  currentToolId: ToolId;
}

export function RelatedTools({ currentToolId }: RelatedToolsProps) {
  const related = getRelatedTools(currentToolId);
  if (related.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        What to do next
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {related.map(({ toolId, reason }) => {
          const tool = TOOLS.find((t) => t.id === toolId);
          if (!tool) return null;

          return (
            <Link
              key={toolId}
              href={tool.href}
              className="group flex items-start justify-between gap-3 rounded-lg border border-border/50 p-4 transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                  {tool.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{reason}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

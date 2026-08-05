import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TOOLS } from "@/lib/constants";

type Tool = (typeof TOOLS)[number];

interface ToolCardProps {
  tool: Tool;
  /** "01.2" in a chapter, "00.01" in the featured row. */
  ordinal: string;
  variant?: "default" | "featured";
  /** Featured only. Natural case; uppercased here in CSS. */
  meta?: string;
}

export function ToolCard({ tool, ordinal, variant = "default", meta }: ToolCardProps) {
  const featured = variant === "featured";

  return (
    <Link href={tool.href} className="group block h-full">
      <article
        className={cn(
          "relative flex h-full flex-col gap-2.5 rounded border border-rule bg-card",
          // Colour-only hover. Thickening the border to 1.5px (as the handoff
          // asked) reflows the card contents by half a pixel on every hover,
          // and the outline/ring workarounds fight the 4px radius or amount
          // to a shadow. See the spec, §5.1.
          "transition-colors group-hover:border-ochre",
          featured ? "px-[30px] py-7" : "px-5 py-[18px]"
        )}
      >
        <span className="absolute right-5 top-3.5 font-mono text-[11px] tracking-[0.08em] text-rule-strong tabular">
          {ordinal}
        </span>

        <h3
          className={cn(
            "font-serif font-semibold leading-tight text-foreground",
            // Right padding keeps a long name off the absolutely-positioned
            // ordinal. "Financial Model Builder" wraps into it without this.
            featured ? "pr-16 text-[28px]" : "pr-12 text-xl"
          )}
        >
          {tool.name}
        </h3>

        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {tool.description}
        </p>

        {featured && meta ? (
          <p className="mt-auto border-t border-rule pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular">
            {meta}
          </p>
        ) : null}
      </article>
    </Link>
  );
}

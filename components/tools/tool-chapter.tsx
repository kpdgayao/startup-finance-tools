import { ToolCard } from "./tool-card";
import type { TOOLS, TOOL_GROUPS } from "@/lib/constants";

interface ToolChapterProps {
  group: (typeof TOOL_GROUPS)[number];
  /** Pre-resolved so the chapter never has to miss a lookup. */
  tools: (typeof TOOLS)[number][];
  /** Two digits: "00" … "04". */
  ordinal: string;
}

export function ToolChapter({ group, tools, ordinal }: ToolChapterProps) {
  const headingId = `chapter-${ordinal}`;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="flex items-baseline gap-2.5">
        <span
          aria-hidden="true"
          className="font-mono text-[11px] tracking-[0.08em] text-ochre-deep tabular"
        >
          {ordinal} —
        </span>
        <span className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {group.label}
        </span>
      </h2>

      <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-muted-foreground">
        {group.subtitle}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-rule pt-5 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool, i) => (
          <ToolCard key={tool.id} tool={tool} ordinal={`${ordinal}.${i + 1}`} />
        ))}
      </div>
    </section>
  );
}

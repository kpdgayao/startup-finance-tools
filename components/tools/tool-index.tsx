import { TOOLS, TOOL_GROUPS } from "@/lib/constants";
import { FEATURED_TOOL_META } from "@/lib/tool-meta";
import { ToolCard } from "./tool-card";
import { ToolChapter } from "./tool-chapter";

type Tool = (typeof TOOLS)[number];

function resolve(group: (typeof TOOL_GROUPS)[number]): Tool[] {
  return group.tools
    .map((id) => TOOLS.find((t) => t.id === id))
    .filter((t): t is Tool => Boolean(t));
}

interface ToolIndexProps {
  /**
   * Homepage only. Lifts TOOL_GROUPS[0] ("Start Here") into a 2-up featured
   * row above the chapters. /tools omits it: the ToolSidebar beside that page
   * already does the orientation job, and a featured row there would be the
   * third element on screen saying "start here".
   */
  featured?: boolean;
}

export function ToolIndex({ featured = false }: ToolIndexProps) {
  // slice() on both branches, not `const [first, ...rest] = TOOL_GROUPS`:
  // TOOL_GROUPS is `as const`, so destructuring yields a readonly tuple whose
  // type does not unify with the full array in a ternary. slice() gives both
  // branches the same type and the .map below stays clean.
  const featuredGroup = TOOL_GROUPS[0];
  const chapters = featured ? TOOL_GROUPS.slice(1) : TOOL_GROUPS.slice(0);
  // With a featured row, chapter numbering starts at 01 because 00 was lifted out.
  const offset = featured ? 1 : 0;

  return (
    <div className="space-y-14">
      {featured && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {resolve(featuredGroup).map((tool, i) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              ordinal={`00.${String(i + 1).padStart(2, "0")}`}
              variant="featured"
              meta={FEATURED_TOOL_META[tool.id]}
            />
          ))}
        </div>
      )}

      {chapters.map((group, i) => (
        <ToolChapter
          key={group.label}
          group={group}
          tools={resolve(group)}
          ordinal={String(i + offset).padStart(2, "0")}
        />
      ))}
    </div>
  );
}

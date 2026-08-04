"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TOOLS, TOOL_GROUPS } from "@/lib/constants";
import { ChevronDown } from "lucide-react";
import { iconMap } from "@/lib/icon-map";
import { useState, useRef, useEffect } from "react";

export function ToolSidebar() {
  const pathname = usePathname();

  const currentTool = TOOLS.find((t) => t.href === pathname);

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="w-64 shrink-0 border-r border-border/50 hidden lg:block">
        <div className="p-4 space-y-4">
          {TOOL_GROUPS.map((group) => (
            <div key={group.label} className="border-t border-rule pt-4 first:border-t-0 first:pt-0">
              <div className="mb-1.5 flex items-baseline justify-between px-3">
                <p className="eyebrow">{group.label}</p>
                <span className="font-mono text-[10px] text-rule-strong tabular">
                  {group.tools.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {group.tools.map((toolId) => {
                  const tool = TOOLS.find((t) => t.id === toolId);
                  if (!tool) return null;
                  const Icon = iconMap[tool.icon as keyof typeof iconMap];
                  const isActive = pathname === tool.href;

                  return (
                    <Link
                      key={tool.id}
                      href={tool.href}
                      className={cn(
                        // The left rule is always present, transparent when
                        // inactive, so switching it does not shift the row.
                        "flex items-center gap-3 rounded-md border-l-[1.5px] px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "border-ochre bg-accent font-medium text-accent-foreground"
                          : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{tool.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Mobile tool nav */}
      <MobileToolNav currentTool={currentTool} pathname={pathname} />
    </>
  );
}

function MobileToolNav({
  currentTool,
  pathname,
}: {
  currentTool: (typeof TOOLS)[number] | undefined;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const CurrentIcon = currentTool
    ? iconMap[currentTool.icon as keyof typeof iconMap]
    : iconMap.BarChart3;

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="lg:hidden border-b border-border/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Tool navigation"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <CurrentIcon className="h-4 w-4" />
          {currentTool?.name || "Select Tool"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="border-t border-border/50 pb-2">
          {TOOL_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="flex items-baseline justify-between px-4 pt-3 pb-1">
                <p className="eyebrow">{group.label}</p>
                <span className="font-mono text-[10px] text-rule-strong tabular">
                  {group.tools.length}
                </span>
              </div>
              {group.tools.map((toolId) => {
                const tool = TOOLS.find((t) => t.id === toolId);
                if (!tool) return null;
                const Icon = iconMap[tool.icon as keyof typeof iconMap];
                const isActive = pathname === tool.href;

                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 border-l-[1.5px] px-4 py-2.5 text-sm transition-colors",
                      isActive
                        ? "border-ochre bg-accent font-medium text-accent-foreground"
                        : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{tool.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TOOLS, TOOL_GROUPS } from "@/lib/constants";
import {
  TrendingUp,
  PieChart,
  Calculator,
  Flame,
  Tag,
  BarChart3,
  Target,
  Users,
  FileSpreadsheet,
  ClipboardCheck,
  GraduationCap,
  Map,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const iconMap = {
  TrendingUp,
  PieChart,
  Calculator,
  Flame,
  Tag,
  BarChart3,
  Target,
  Users,
  FileSpreadsheet,
  ClipboardCheck,
  GraduationCap,
  Map,
} as const;

export function ToolSidebar() {
  const pathname = usePathname();

  const currentTool = TOOLS.find((t) => t.href === pathname);

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="w-64 shrink-0 border-r border-border/50 hidden lg:block">
        <div className="p-4 space-y-4">
          {TOOL_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-3">
                {group.label}
              </p>
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
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
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
    : BarChart3;

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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1">
                {group.label}
              </p>
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
                      "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
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

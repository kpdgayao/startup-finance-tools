"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TOOLS } from "@/lib/constants";
import {
  TrendingUp,
  PieChart,
  Calculator,
  Flame,
  Tag,
  BarChart3,
} from "lucide-react";

const iconMap = {
  TrendingUp,
  PieChart,
  Calculator,
  Flame,
  Tag,
  BarChart3,
} as const;

export function ToolSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-64 shrink-0 border-r border-border/50 hidden lg:block">
      <div className="p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
          Tools
        </p>
        {TOOLS.map((tool) => {
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
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LEARN_MODULES } from "@/lib/constants";
import {
  Tag,
  FileSpreadsheet,
  TrendingUp,
  Flame,
  FileText,
  Scale,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const iconMap = {
  Tag,
  FileSpreadsheet,
  TrendingUp,
  Flame,
  FileText,
  Scale,
} as const;

export function LearnSidebar() {
  const pathname = usePathname();

  const currentModule = LEARN_MODULES.find((m) => m.href === pathname);

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="w-64 shrink-0 border-r border-border/50 hidden lg:block">
        <div className="p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
            Learn
          </p>
          {LEARN_MODULES.map((mod) => {
            const Icon = iconMap[mod.icon as keyof typeof iconMap];
            const isActive = pathname === mod.href;

            return (
              <Link
                key={mod.id}
                href={mod.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{mod.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile nav */}
      <MobileLearnNav currentModule={currentModule} pathname={pathname} />
    </>
  );
}

function MobileLearnNav({
  currentModule,
  pathname,
}: {
  currentModule: (typeof LEARN_MODULES)[number] | undefined;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const CurrentIcon = currentModule
    ? iconMap[currentModule.icon as keyof typeof iconMap]
    : Tag;

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
        aria-label="Learn navigation"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <CurrentIcon className="h-4 w-4" />
          {currentModule?.name || "Learn Modules"}
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
          {LEARN_MODULES.map((mod) => {
            const Icon = iconMap[mod.icon as keyof typeof iconMap];
            const isActive = pathname === mod.href;

            return (
              <Link
                key={mod.id}
                href={mod.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{mod.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

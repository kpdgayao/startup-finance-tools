"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Tools", href: "/tools", prefix: "/tools" },
  { label: "Learn", href: "/learn", prefix: "/learn" },
  { label: "About", href: "/about", prefix: "/about" },
  { label: "Contact", href: "/contact", prefix: "/contact" },
] as const;

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo variant="icon" />
          {/* sr-only below sm, not hidden: the icon Logo is aria-hidden, so this
              span is the home link's only accessible name. At 375px the full
              wordmark wrapped to three lines, spilled out of the h-14, and
              collided with the nav — which then overflowed the viewport by 12px
              and gave every page a horizontal scrollbar. */}
          <span className="sr-only sm:not-sr-only whitespace-nowrap">
            Startup Finance Toolkit
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-4">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.prefix);
            return (
              <Link
                key={link.label}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-sm transition-colors",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

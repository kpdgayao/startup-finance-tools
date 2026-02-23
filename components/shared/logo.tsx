import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "icon" | "full";
  className?: string;
}

export function Logo({ variant = "icon", className }: LogoProps) {
  const mark = (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", variant === "icon" ? "h-6 w-6" : "h-8 w-8", className && variant === "icon" ? className : undefined)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sft-bar" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="sft-line" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="6" y="36" width="14" height="22" rx="3" fill="url(#sft-bar)" opacity="0.7" />
      <rect x="25" y="24" width="14" height="34" rx="3" fill="url(#sft-bar)" opacity="0.85" />
      <rect x="44" y="12" width="14" height="46" rx="3" fill="url(#sft-bar)" />
      <path d="M8 52 Q24 38 32 32 Q40 26 56 10" stroke="url(#sft-line)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="56" cy="10" r="3.5" fill="#8b5cf6" />
    </svg>
  );

  if (variant === "icon") return mark;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {mark}
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">Startup Finance</span>
        <span className="text-xs font-light text-muted-foreground">Toolkit</span>
      </div>
    </div>
  );
}

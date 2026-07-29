import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "icon" | "full";
  className?: string;
}

export function Logo({ variant = "icon", className }: LogoProps) {
  const mark = (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-[1px] font-serif-italic font-bold italic",
        "bg-foreground text-background",
        "dark:bg-ochre dark:text-[var(--on-ochre)]",
        variant === "icon" ? "h-[26px] w-[26px] text-base" : "h-8 w-8 text-lg",
        variant === "icon" ? className : undefined
      )}
    >
      SF
    </span>
  );

  if (variant === "icon") return mark;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {mark}
      <div className="flex flex-col leading-tight">
        <span className="font-serif text-[17px] font-semibold">
          Startup Finance
        </span>
        <span className="eyebrow text-[10.5px] tracking-[0.08em]">Toolkit</span>
      </div>
    </div>
  );
}

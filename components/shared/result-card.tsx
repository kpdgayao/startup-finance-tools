import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface ResultCardProps {
  label: string;
  value: string;
  sublabel?: string;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const variantIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

export function ResultCard({
  label,
  value,
  sublabel,
  variant = "default",
  className,
}: ResultCardProps) {
  const Icon = variant !== "default" ? variantIcons[variant] : null;

  // Light mode: solid --primary (ink) slab with --primary-foreground (paper)
  // text — maximum contrast against the page. Dark mode: NOT a bone slab (it
  // would glare). Surface step 3 (--muted) with a --rule-strong hairline. This
  // is the only component in the app whose treatment genuinely differs between
  // themes.
  //
  // Both slabs are dark, so the variant numeral uses the *-on-ink semantic
  // tokens rather than --good/--warn/--bad: those are tuned for paper and drop
  // to 2.4–2.9:1 on the light-mode ink fill.
  return (
    <Card
      className={cn(
        "bg-primary text-primary-foreground dark:bg-muted dark:text-foreground dark:border-rule-strong",
        variant === "success" && "dark:border-good/40",
        variant === "warning" && "dark:border-warn/40",
        variant === "danger" && "dark:border-bad/40",
        className
      )}
    >
      <CardContent className="p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary-foreground/70 dark:text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 break-words font-serif text-[32px] leading-none tabular tracking-[-0.01em]",
            variant === "success" && "text-good-on-ink",
            variant === "warning" && "text-warn-on-ink",
            variant === "danger" && "text-bad-on-ink"
          )}
          title={value}
        >
          {Icon && (
            <Icon
              className={cn(
                "inline-block h-5 w-5 mr-1.5 -mt-0.5",
                variant === "success" && "text-good-on-ink",
                variant === "warning" && "text-warn-on-ink",
                variant === "danger" && "text-bad-on-ink"
              )}
            />
          )}
          {value}
        </p>
        {sublabel && (
          <p className="mt-1 text-xs text-primary-foreground/60 dark:text-muted-foreground">
            {sublabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

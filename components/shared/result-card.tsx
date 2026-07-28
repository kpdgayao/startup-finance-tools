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

  return (
    <Card
      className={cn(
        "border",
        variant === "success" && "border-good/30 bg-good/5",
        variant === "warning" && "border-warn/30 bg-warn/5",
        variant === "danger" && "border-bad/30 bg-bad/5",
        className
      )}
    >
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-2xl font-bold mt-1 break-words",
            variant === "success" && "text-good",
            variant === "warning" && "text-warn",
            variant === "danger" && "text-bad"
          )}
          title={value}
        >
          {Icon && (
            <Icon
              className={cn(
                "inline-block h-5 w-5 mr-1.5 -mt-0.5",
                variant === "success" && "text-good",
                variant === "warning" && "text-warn",
                variant === "danger" && "text-bad"
              )}
            />
          )}
          {value}
        </p>
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

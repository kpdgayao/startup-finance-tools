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
        variant === "success" && "border-green-500/30 bg-green-500/5",
        variant === "warning" && "border-yellow-500/30 bg-yellow-500/5",
        variant === "danger" && "border-red-500/30 bg-red-500/5",
        className
      )}
    >
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-2xl font-bold mt-1 truncate",
            variant === "success" && "text-green-400",
            variant === "warning" && "text-yellow-400",
            variant === "danger" && "text-red-400"
          )}
          title={value}
        >
          {Icon && (
            <Icon
              className={cn(
                "inline-block h-5 w-5 mr-1.5 -mt-0.5",
                variant === "success" && "text-green-400",
                variant === "warning" && "text-yellow-400",
                variant === "danger" && "text-red-400"
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

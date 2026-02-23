import { cn } from "@/lib/utils";
import { Lightbulb, Calculator, GraduationCap } from "lucide-react";

const variants = {
  tip: {
    icon: Lightbulb,
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-500/5",
    label: "Tip",
  },
  formula: {
    icon: Calculator,
    borderColor: "border-l-amber-500",
    bgColor: "bg-amber-500/5",
    label: "Formula",
  },
  insight: {
    icon: GraduationCap,
    borderColor: "border-l-purple-500",
    bgColor: "bg-purple-500/5",
    label: "Kevin's Insight",
  },
};

export function Callout({
  variant = "tip",
  children,
}: {
  variant?: keyof typeof variants;
  children: React.ReactNode;
}) {
  const v = variants[variant];
  const Icon = v.icon;
  return (
    <div
      className={cn(
        "border-l-4 rounded-r-md p-4 my-6 not-prose",
        v.borderColor,
        v.bgColor
      )}
    >
      <p className="text-sm font-medium flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" /> {v.label}
      </p>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

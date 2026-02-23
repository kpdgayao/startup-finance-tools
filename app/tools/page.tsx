import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  FileText,
  Scale,
  Landmark,
} from "lucide-react";

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
  FileText,
  Scale,
  Landmark,
} as const;

export const metadata: Metadata = {
  title: "All Tools",
  description:
    "Browse all 15 interactive financial tools for Filipino startup founders. Valuations, equity, burn rate, pricing, and more.",
  openGraph: {
    title: "All Tools | Startup Finance Toolkit",
    description:
      "Browse all 15 interactive financial tools for Filipino startup founders.",
  },
};

export default function ToolsIndexPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">All Tools</h1>
        <p className="text-muted-foreground mt-2">
          15 interactive financial tools for Filipino startup founders.
        </p>
      </div>
      {TOOL_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {group.label}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.tools.map((toolId) => {
              const tool = TOOLS.find((t) => t.id === toolId);
              if (!tool) return null;
              const Icon = iconMap[tool.icon as keyof typeof iconMap];
              return (
                <Link key={tool.id} href={tool.href}>
                  <Card className="h-full hover:border-primary/50 hover:shadow-[0_0_15px_-3px] hover:shadow-primary/15 transition-all cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{tool.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

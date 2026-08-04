import type { Metadata } from "next";
import { TOOLS } from "@/lib/constants";
import { ToolIndex } from "@/components/tools/tool-index";

export const metadata: Metadata = {
  title: "All Tools",
  description: `Browse all ${TOOLS.length} interactive financial tools for Filipino startup founders. Valuations, equity, burn rate, pricing, and more.`,
  openGraph: {
    title: "All Tools | Startup Finance Toolkit",
    description: `Browse all ${TOOLS.length} interactive financial tools for Filipino startup founders.`,
  },
};

export default function ToolsIndexPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">All Tools</h1>
        <p className="mt-2 text-muted-foreground">
          {TOOLS.length} interactive financial tools for Filipino startup founders.
        </p>
      </div>
      <ToolIndex />
    </div>
  );
}

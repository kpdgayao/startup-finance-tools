import Link from "next/link";
import { BookOpen } from "lucide-react";
import { LEARN_MODULES } from "@/lib/constants";

export function LearnLink({ toolHref }: { toolHref: string }) {
  const learnModule = LEARN_MODULES.find((m) => m.relatedTool === toolHref);
  if (!learnModule) return null;
  return (
    <Link
      href={learnModule.href}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      <BookOpen className="h-3.5 w-3.5" />
      Learn about this topic
    </Link>
  );
}

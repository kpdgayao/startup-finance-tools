"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AiInsightsPanelProps {
  explanation: string;
  isLoading: boolean;
  error: string | null;
  onExplain: () => void;
  onDismiss: () => void;
}

export function AiInsightsPanel({
  explanation,
  isLoading,
  error,
  onExplain,
  onDismiss,
}: AiInsightsPanelProps) {
  const isOpen = isLoading || !!explanation || !!error;

  if (!isOpen) {
    return (
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={onExplain}
          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Explain My Results
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-purple-400">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {isLoading ? "Analyzing your results..." : "AI Insights"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {explanation && (
          <div className="prose prose-sm prose-invert max-w-none text-foreground/90 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>h1]:font-semibold [&>h2]:font-semibold [&>h3]:font-semibold [&>h1]:mt-4 [&>h2]:mt-3 [&>h3]:mt-2 [&>h1]:mb-2 [&>h2]:mb-1 [&>h3]:mb-1 [&>p]:mb-2 [&>ul]:my-2 [&>ol]:my-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&_li]:mb-1 [&>hr]:my-3 [&>hr]:border-purple-500/20 [&_strong]:text-foreground [&_code]:text-purple-300 [&_code]:bg-purple-500/10 [&_code]:px-1 [&_code]:rounded [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse [&_table]:text-xs [&_th]:border [&_th]:border-purple-500/20 [&_th]:bg-purple-500/10 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-purple-500/20 [&_td]:px-3 [&_td]:py-1.5 [&_thead]:bg-purple-500/10">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

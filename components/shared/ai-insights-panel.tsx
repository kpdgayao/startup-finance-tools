"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
          <div
            className={cn(
              "text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap",
              "[&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1",
              "[&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-1"
            )}
          >
            {explanation}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

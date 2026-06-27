"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-16">
          <Card className="max-w-md w-full border-destructive/30 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Something went wrong with this tool.</CardTitle>
                  <CardDescription>
                    An unexpected error occurred while rendering this tool.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {this.state.error && (
                <pre className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 overflow-auto max-h-32 whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={this.resetErrorBoundary}>
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button variant="outline" asChild>
                  <a href="/tools">
                    <LayoutGrid className="h-4 w-4" />
                    Go to All Tools
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
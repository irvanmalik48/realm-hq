"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Dashboard caught error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/80 shadow-lg bg-card/60 backdrop-blur-xs">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            An unexpected error occurred while loading this view.
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          {error.message && (
            <div className="rounded-md bg-muted/60 p-3 font-mono text-xs text-muted-foreground break-all max-h-32 overflow-y-auto">
              {error.message}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => reset()}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            Try Again
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = "/";
            }}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Home className="size-3.5" />
            Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

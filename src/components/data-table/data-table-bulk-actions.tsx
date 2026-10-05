"use client";

import { CheckSquare, X } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableBulkActionsProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  children: React.ReactNode;
  className?: string;
}

export function DataTableBulkActions({
  selectedCount,
  totalCount,
  onClearSelection,
  children,
  className,
}: DataTableBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-full border border-border/80 bg-background/90 backdrop-blur-md shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 pr-2 border-r border-border">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
          {selectedCount}{" "}
          <span className="font-normal text-muted-foreground">
            {totalCount ? `of ${totalCount}` : ""} selected
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2">{children}</div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
        title="Deselect all"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

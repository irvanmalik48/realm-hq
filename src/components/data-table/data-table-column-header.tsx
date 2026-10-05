"use client";

import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, EyeOff } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div className={cn("text-xs font-semibold", className)}>{title}</div>
    );
  }

  const isSorted = column.getIsSorted();

  return (
    <div className={cn("flex items-center space-x-1.5", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 px-2 text-xs font-medium data-[state=open]:bg-accent cursor-pointer hover:bg-muted/60"
          >
            <span>{title}</span>
            {isSorted === "desc" ? (
              <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
            ) : isSorted === "asc" ? (
              <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
            ) : (
              <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/60" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36">
          <DropdownMenuItem
            onClick={() => column.toggleSorting(false)}
            className="text-xs cursor-pointer gap-2"
          >
            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
            Ascending
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => column.toggleSorting(true)}
            className="text-xs cursor-pointer gap-2"
          >
            <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
            Descending
          </DropdownMenuItem>
          {isSorted && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => column.clearSorting()}
                className="text-xs cursor-pointer gap-2"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                Clear Sort
              </DropdownMenuItem>
            </>
          )}
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => column.toggleVisibility(false)}
                className="text-xs cursor-pointer gap-2 text-muted-foreground"
              >
                <EyeOff className="h-3.5 w-3.5" />
                Hide Column
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

import { cn } from "cn";
import type * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface TableSkeletonProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  rowCount?: number;
  columnCount?: number;
  hideHeader?: boolean;
  tableOnly?: boolean;
  className?: string;
}

const SKELETON_KEYS = Array.from({ length: 50 }, (_, i) => `sk-${i + 1}`);

export function TableRowSkeleton({
  columnCount = 5,
  rowCount = 6,
}: {
  columnCount?: number;
  rowCount?: number;
}) {
  const rows = SKELETON_KEYS.slice(0, Math.max(1, rowCount));
  const cols = SKELETON_KEYS.slice(0, Math.max(1, columnCount));

  return (
    <>
      {rows.map((rowKey) => (
        <TableRow key={rowKey} className="hover:bg-transparent">
          {cols.map((colKey, colIndex) => (
            <TableCell key={`${rowKey}-${colKey}`} className="py-3">
              <Skeleton
                className={cn(
                  "h-4",
                  colIndex === 0
                    ? "w-24"
                    : colIndex === 1
                      ? "w-36"
                      : colIndex === cols.length - 1
                        ? "w-12 ml-auto"
                        : "w-28",
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function StorageGridSkeleton({ count = 10 }: { count?: number }) {
  const items = SKELETON_KEYS.slice(0, Math.max(1, count));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
      {items.map((itemKey) => (
        <div
          key={`storage-${itemKey}`}
          className="rounded-xl border border-border/70 bg-card/60 overflow-hidden flex flex-col"
        >
          <div className="aspect-4/3 w-full bg-muted/20 border-b border-border/50 flex items-center justify-center p-3">
            <Skeleton className="h-10 w-10 rounded-lg opacity-40" />
          </div>
          <div className="p-3 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  title,
  description,
  icon: Icon,
  rowCount = 6,
  columnCount = 5,
  hideHeader = false,
  tableOnly = false,
  className,
}: TableSkeletonProps) {
  const headCols = SKELETON_KEYS.slice(0, Math.max(1, columnCount));

  if (tableOnly) {
    return (
      <div className={cn("overflow-x-auto", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {headCols.map((cKey) => (
                <TableHead key={`th-only-${cKey}`}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRowSkeleton columnCount={columnCount} rowCount={rowCount} />
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {Icon ? (
                <Icon className="h-5 w-5 text-primary" />
              ) : (
                <Skeleton className="h-5 w-5 rounded-md" />
              )}
              {title ? title : <Skeleton className="h-6 w-48" />}
            </h2>
            {description ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            ) : (
              <Skeleton className="h-3.5 w-72 mt-1" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3 border-b border-border bg-card/40 space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Skeleton className="h-9 w-full sm:w-72 rounded-md" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headCols.map((cKey) => (
                    <TableHead key={`th-main-${cKey}`}>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRowSkeleton
                  columnCount={columnCount}
                  rowCount={rowCount}
                />
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/40">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-18 rounded-md" />
            <Skeleton className="h-8 w-18 rounded-md" />
          </div>
        </div>
      </Card>
    </div>
  );
}

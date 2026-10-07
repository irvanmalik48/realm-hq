"use client";
"use no memo";

import type { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
  showSelectedCount?: boolean;
  totalCount?: number;
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 50, 100],
  showSelectedCount = true,
  totalCount,
}: DataTablePaginationProps<TData>) {
  const pagination = table.getState().pagination;
  const pageIndex = pagination?.pageIndex ?? 0;
  const pageSize = pagination?.pageSize ?? 10;

  const selectedRows =
    table.getFilteredSelectedRowModel?.()?.rows?.length ??
    Object.keys(table.getState().rowSelection ?? {}).length;
  const totalRows =
    totalCount !== undefined
      ? totalCount
      : (table.getRowCount?.() ??
        table.getFilteredRowModel?.()?.rows?.length ??
        table.getCoreRowModel?.()?.rows?.length ??
        0);

  const pageCount =
    totalCount !== undefined
      ? Math.max(1, Math.ceil(totalRows / Math.max(1, pageSize)))
      : Math.max(1, table.getPageCount());

  const canPreviousPage =
    typeof table.getCanPreviousPage === "function"
      ? table.getCanPreviousPage() || pageIndex > 0
      : pageIndex > 0;

  const canNextPage =
    typeof table.getCanNextPage === "function"
      ? table.getCanNextPage() || pageIndex < pageCount - 1
      : pageIndex < pageCount - 1;

  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  const options = React.useMemo(() => {
    const set = new Set(pageSizeOptions);
    if (pageSize) {
      set.add(pageSize);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [pageSizeOptions, pageSize]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 px-3 sm:px-4 py-3 border-t border-border bg-card/40">
      <div className="flex items-center gap-2 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        {showSelectedCount && selectedRows > 0 ? (
          <span className="font-medium text-foreground">
            <span className="text-primary font-semibold">{selectedRows}</span>{" "}
            of {totalRows} row(s) selected
          </span>
        ) : (
          <span>
            Showing{" "}
            <span className="font-semibold text-foreground">{startRow}</span> to{" "}
            <span className="font-semibold text-foreground">{endRow}</span> of{" "}
            <span className="font-semibold text-foreground">{totalRows}</span>{" "}
            entries
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            Rows per page
          </p>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              if (value) {
                table.setPageSize(Number(value));
              }
            }}
          >
            <SelectTrigger className="h-8 w-[72px] text-xs">
              <SelectValue>{(val) => val || String(pageSize)}</SelectValue>
            </SelectTrigger>
            <SelectContent side="top" alignItemWithTrigger={false}>
              {options.map((size) => (
                <SelectItem key={size} value={String(size)} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center text-xs font-medium text-muted-foreground whitespace-nowrap">
          Page {pageIndex + 1} of {Math.max(1, pageCount)}
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 p-0 lg:flex cursor-pointer disabled:opacity-40"
            onClick={() => table.setPageIndex(0)}
            disabled={!canPreviousPage}
            title="First page"
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 p-0 cursor-pointer disabled:opacity-40"
            onClick={() => table.setPageIndex(Math.max(0, pageIndex - 1))}
            disabled={!canPreviousPage}
            title="Previous page"
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 p-0 cursor-pointer disabled:opacity-40"
            onClick={() =>
              table.setPageIndex(Math.min(pageCount - 1, pageIndex + 1))
            }
            disabled={!canNextPage}
            title="Next page"
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 p-0 lg:flex cursor-pointer disabled:opacity-40"
            onClick={() => table.setPageIndex(Math.max(0, pageCount - 1))}
            disabled={!canNextPage}
            title="Last page"
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  AlertTriangle,
  Download,
  Flame,
  Heart,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import {
  DataTableBulkActions,
  DataTableColumnHeader,
  DataTablePagination,
} from "@/components/data-table";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TableSkeleton } from "@/components/layout/table-skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReactionDetail {
  reaction_type: string;
  count: number;
}

interface PostReactionSummary {
  post_slug: string;
  total_reactions: number;
  reactions: ReactionDetail[];
}

const reactionIcons: Record<string, React.ReactNode> = {
  heart: <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />,
  fire: <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />,
  thumbs_up: <ThumbsUp className="h-3.5 w-3.5 text-blue-500 fill-blue-500" />,
  sparkles: (
    <Sparkles className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
  ),
  rocket: <Rocket className="h-3.5 w-3.5 text-violet-500 fill-violet-500" />,
};

function ReactionsContent() {
  const [summaries, setSummaries] = React.useState<PostReactionSummary[]>([]);
  const [totalReactions, setTotalReactions] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "total_reactions", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const [deleteTarget, setDeleteTarget] = React.useState<{
    post_slug: string;
    reaction_type?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Bulk reset dialog
  const [bulkResetOpen, setBulkResetOpen] = React.useState(false);
  const [isBulkResetting, setIsBulkResetting] = React.useState(false);

  const fetchReactions = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reactions");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.summaries) {
        setSummaries(json.summaries);
        setTotalReactions(json.total_reactions || 0);
      }
    } catch {
      toast.error("Failed to load reactions");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      let url = `/api/reactions?post_slug=${encodeURIComponent(deleteTarget.post_slug)}`;
      if (deleteTarget.reaction_type) {
        url += `&reaction_type=${encodeURIComponent(deleteTarget.reaction_type)}`;
      }

      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      toast.success("Reaction counts cleared");
      fetchReactions();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to reset reaction count");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkReset = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedItems = selectedIndices
      .map((idx) => table.getRowModel().rows[idx]?.original)
      .filter(Boolean);
    if (!selectedItems.length) return;

    setIsBulkResetting(true);
    try {
      await Promise.all(
        selectedItems.map((item) =>
          fetch(
            `/api/reactions?post_slug=${encodeURIComponent(item.post_slug)}`,
            {
              method: "DELETE",
            },
          ),
        ),
      );

      toast.success(`Reset reactions for ${selectedItems.length} article(s)`);
      setRowSelection({});
      setBulkResetOpen(false);
      fetchReactions();
    } catch {
      toast.error("Failed to reset selected reactions");
    } finally {
      setIsBulkResetting(false);
    }
  };

  const handleExportSelected = (format: "json" | "csv") => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedItems = selectedIndices
      .map((idx) => table.getRowModel().rows[idx]?.original)
      .filter(Boolean);
    const exportData = selectedItems.length > 0 ? selectedItems : filteredData;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reactions-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["post_slug", "total_reactions", "breakdown"];
      const rows = exportData.map((item) => [
        `"${item.post_slug}"`,
        item.total_reactions,
        `"${item.reactions.map((r) => `${r.reaction_type}:${r.count}`).join(";")}"`,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reactions-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(
      `Exported ${exportData.length} records as ${format.toUpperCase()}`,
    );
  };

  // Filtered dataset for search
  const filteredData = React.useMemo(() => {
    if (!globalFilter.trim()) return summaries;
    const q = globalFilter.toLowerCase();
    return summaries.filter((item) => item.post_slug.toLowerCase().includes(q));
  }, [summaries, globalFilter]);

  const columns: ColumnDef<PostReactionSummary>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all articles on page"
          className="translate-y-0.5"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select article row"
          className="translate-y-0.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "post_slug",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Post Slug" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {row.original.post_slug}
        </span>
      ),
    },
    {
      accessorKey: "total_reactions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Reactions" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-foreground">
          {row.original.total_reactions}
        </span>
      ),
    },
    {
      accessorKey: "reactions",
      header: "Reactions Breakdown",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          {row.original.reactions?.map((r) => (
            <Badge
              key={r.reaction_type}
              variant="outline"
              className="text-xs gap-1 py-0.5 px-2 font-normal"
            >
              {reactionIcons[r.reaction_type] || (
                <Sparkles className="h-3 w-3" />
              )}
              <span className="capitalize">{r.reaction_type}</span>:
              <span className="font-bold">{r.count}</span>
            </Badge>
          ))}
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {item.reactions?.map((r) => (
              <Button
                key={r.reaction_type}
                variant="ghost"
                size="sm"
                title={`Reset ${r.reaction_type}`}
                onClick={() =>
                  setDeleteTarget({
                    post_slug: item.post_slug,
                    reaction_type: r.reaction_type,
                  })
                }
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {r.reaction_type}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              title="Reset all reactions for post"
              onClick={() =>
                setDeleteTarget({
                  post_slug: item.post_slug,
                })
              }
              className="h-7 px-2 text-xs text-destructive hover:text-destructive cursor-pointer"
            >
              Reset All
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Post Reactions
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Overview of likes and reactions across published articles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReactions}
            disabled={loading}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Aggregate Stats Card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">
            Total Reactions
          </span>
          <div className="text-2xl font-bold mt-1 text-foreground">
            {totalReactions}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Across all blog posts
          </span>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">
            Engaged Articles
          </span>
          <div className="text-2xl font-bold mt-1 text-foreground">
            {summaries.length}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Articles with reactions
          </span>
        </Card>
      </div>

      {/* Reaction Breakdown Table Card */}
      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3 border-b border-border bg-card/40 space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by post slug..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8 text-xs h-9"
              />
              {globalFilter && (
                <button
                  type="button"
                  onClick={() => setGlobalFilter("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Showing {table.getRowModel().rows.length} of {summaries.length}{" "}
              articles
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-28 text-center text-xs text-muted-foreground"
                  >
                    {loading
                      ? "Loading reactions..."
                      : "No post reactions found matching your filter."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Configurable Pagination Controls */}
          <DataTablePagination table={table} pageSizeOptions={[10, 20, 50]} />
        </CardContent>
      </Card>

      {/* Floating Bulk Action Bar */}
      <DataTableBulkActions
        selectedCount={selectedCount}
        totalCount={filteredData.length}
        onClearSelection={() => setRowSelection({})}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExportSelected("csv")}
          className="h-8 text-xs gap-1.5 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setBulkResetOpen(true)}
          disabled={isBulkResetting}
          className="h-8 text-xs gap-1.5 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Reset Reactions
        </Button>
      </DataTableBulkActions>

      {/* Single Reset Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reset Reaction Counts?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to clear{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.reaction_type || "all"}
              </span>{" "}
              reactions for post{" "}
              <span className="font-mono text-foreground font-semibold">
                {deleteTarget?.post_slug}
              </span>
              ? This action is permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Clearing..." : "Confirm Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Reset Confirmation Alert Dialog */}
      <AlertDialog
        open={bulkResetOpen}
        onOpenChange={(open) => !open && setBulkResetOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reset Reactions for {selectedCount} Selected Article(s)?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to reset all reaction counts for{" "}
              <span className="font-semibold text-foreground">
                {selectedCount}
              </span>{" "}
              selected articles? Counter tallies will return to 0.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkResetting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkReset}
              disabled={isBulkResetting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isBulkResetting
                ? "Resetting..."
                : `Reset ${selectedCount} Article(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ReactionsPage() {
  return (
    <DashboardShell>
      <React.Suspense
        fallback={
          <TableSkeleton
            title="Post Reactions"
            description="Aggregate sentiment, likes, and engagement per article."
            rowCount={8}
            columnCount={4}
          />
        }
      >
        <ReactionsContent />
      </React.Suspense>
    </DashboardShell>
  );
}

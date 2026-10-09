"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  AlertTriangle,
  Download,
  Flame,
  Frown,
  Heart,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  Skull,
  Sparkles,
  ThumbsDown,
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
import {
  TableRowSkeleton,
  TableSkeleton,
} from "@/components/layout/table-skeleton";
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
  slug: string;
  post_slug: string;
  total_reactions: number;
  total_count: number;
  reactions: ReactionDetail[];
}

const reactionIcons: Record<string, React.ReactNode> = {
  heart: <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />,
  love: <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />,
  fire: <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />,
  like: <ThumbsUp className="h-3.5 w-3.5 text-blue-500 fill-blue-500" />,
  thumbs_up: <ThumbsUp className="h-3.5 w-3.5 text-blue-500 fill-blue-500" />,
  dislike: <ThumbsDown className="h-3.5 w-3.5 text-slate-400 fill-slate-400" />,
  frown: <Frown className="h-3.5 w-3.5 text-amber-500" />,
  meh: <Frown className="h-3.5 w-3.5 text-amber-500" />,
  skull: <Skull className="h-3.5 w-3.5 text-purple-500" />,
  dead: <Skull className="h-3.5 w-3.5 text-purple-500" />,
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
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  React.useEffect(() => {
    void globalFilter;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [globalFilter]);

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
      if (json.summaries && Array.isArray(json.summaries)) {
        const normalized: PostReactionSummary[] = json.summaries.map(
          (item: Record<string, unknown>) => {
            const slug = String(item.slug || item.post_slug || "");
            const total = Number(
              item.total_reactions ?? item.total_count ?? item.totalCount ?? 0,
            );
            let reactionsList: ReactionDetail[] = [];
            if (Array.isArray(item.reactions)) {
              reactionsList = item.reactions as ReactionDetail[];
            } else if (item.reactions && typeof item.reactions === "object") {
              reactionsList = Object.entries(
                item.reactions as Record<string, number>,
              )
                .map(([k, v]) => ({
                  reaction_type: k,
                  count: Number(v),
                }))
                .filter((r) => r.count > 0);
            }
            return {
              slug,
              post_slug: slug,
              total_reactions: total,
              total_count: total,
              reactions: reactionsList,
            };
          },
        );

        setSummaries(normalized);
        const computedTotal = normalized.reduce(
          (acc, cur) => acc + cur.total_reactions,
          0,
        );
        setTotalReactions(json.total_reactions || computedTotal);
      } else {
        setSummaries([]);
        setTotalReactions(0);
      }
    } catch {
      toast.error("Failed to load reactions");
      setSummaries([]);
      setTotalReactions(0);
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
      const slug = deleteTarget.post_slug;
      const res = await fetch(
        `/api/reactions?slug=${encodeURIComponent(slug)}`,
        {
          method: "DELETE",
        },
      );
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
        selectedItems.map((item) => {
          const slug = item.slug || item.post_slug;
          return fetch(`/api/reactions?slug=${encodeURIComponent(slug)}`, {
            method: "DELETE",
          });
        }),
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
      const headers = ["slug", "total_reactions", "breakdown"];
      const rows = exportData.map((item) => {
        const slug = item.slug || item.post_slug;
        const total = item.total_reactions ?? item.total_count ?? 0;
        const reactions = Array.isArray(item.reactions) ? item.reactions : [];
        const breakdown = reactions
          .map((r) => `${r.reaction_type}:${r.count}`)
          .join(";");
        return [`"${slug}"`, total, `"${breakdown}"`];
      });
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
    return summaries.filter((item) =>
      (item.slug || item.post_slug || "").toLowerCase().includes(q),
    );
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
      id: "slug",
      accessorFn: (row) => row.slug || row.post_slug,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Article Slug" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {row.original.slug || row.original.post_slug}
        </span>
      ),
    },
    {
      id: "total_reactions",
      accessorFn: (row) => row.total_reactions ?? row.total_count ?? 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Reactions" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-foreground">
          {row.original.total_reactions ?? row.original.total_count ?? 0}
        </span>
      ),
    },
    {
      id: "reactions",
      accessorFn: (row) => row.reactions,
      header: "Reactions Breakdown",
      cell: ({ row }) => {
        const reactions = Array.isArray(row.original.reactions)
          ? row.original.reactions
          : [];
        if (reactions.length === 0) {
          return (
            <span className="text-xs text-muted-foreground italic">
              No reactions yet
            </span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1.5">
            {reactions.map((r) => (
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
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const item = row.original;
        const slug = item.slug || item.post_slug;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              title="Reset all reactions for post"
              onClick={() =>
                setDeleteTarget({
                  post_slug: slug,
                })
              }
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive cursor-pointer gap-1"
            >
              <Trash2 className="size-3.5" />
              <span>Reset</span>
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
      pagination,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Post Reactions
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overview of likes and reactions across published articles.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="default"
            onClick={fetchReactions}
            disabled={loading}
            className="h-9 px-3 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw
              data-icon="inline-start"
              className={`size-3.5 ${loading ? "animate-spin" : ""}`}
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
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Filter by article slug..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8 pr-7 text-xs h-9 bg-background/50"
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

              {globalFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGlobalFilter("")}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/80 hover:border-border hover:bg-accent/40 gap-1.5 transition-colors"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset</span>
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Showing {table.getRowModel().rows.length} of {summaries.length}{" "}
              articles
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table className="min-w-[650px]">
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
              {loading ? (
                <TableRowSkeleton
                  columnCount={columns.length}
                  rowCount={pagination.pageSize || 8}
                />
              ) : table.getRowModel().rows?.length ? (
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
                    No post reactions found matching your filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Configurable Pagination Controls */}
          <DataTablePagination
            table={table}
            totalCount={filteredData.length}
            pageSizeOptions={[10, 20, 50, 100]}
          />
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
              Are you sure you want to clear all reactions for post{" "}
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
    <React.Suspense
      fallback={
        <TableSkeleton
          icon={Heart}
          title="Post Reactions"
          description="Overview of likes and reactions across published articles."
          rowCount={8}
          columnCount={4}
        />
      }
    >
      <ReactionsContent />
    </React.Suspense>
  );
}

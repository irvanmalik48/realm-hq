"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  AlertTriangle,
  Edit2,
  MessageSquare,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface CommentItem {
  id: string;
  post_slug: string;
  author_name: string;
  author_email: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  user_id?: string;
}

export default function CommentsPage() {
  const [data, setData] = React.useState<CommentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [editTarget, setEditTarget] = React.useState<CommentItem | null>(null);
  const [editContent, setEditContent] = React.useState("");
  const [editPinned, setEditPinned] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<CommentItem | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchComments = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/comments?limit=100");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.comments) {
        setData(json.comments);
      }
    } catch {
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const openEditModal = (c: CommentItem) => {
    setEditTarget(c);
    setEditContent(c.content);
    setEditPinned(c.is_pinned);
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          content: editContent,
          is_pinned: editPinned,
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      setData((prev) =>
        prev.map((c) =>
          c.id === editTarget.id
            ? { ...c, content: editContent, is_pinned: editPinned }
            : c,
        ),
      );

      toast.success("Comment updated successfully");
      setEditTarget(null);
    } catch {
      toast.error("Failed to update comment");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/comments?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      setData((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success("Comment deleted successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<CommentItem>[] = [
    {
      accessorKey: "created_at",
      header: "Posted",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "post_slug",
      header: "Post Slug",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs font-normal">
          {row.original.post_slug}
        </Badge>
      ),
    },
    {
      accessorKey: "author_name",
      header: "Author",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
            {row.original.author_name}
            {row.original.is_pinned && (
              <Pin className="h-3 w-3 text-amber-500 fill-amber-500" />
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.author_email}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "content",
      header: "Content",
      cell: ({ row }) => (
        <span className="text-xs text-foreground truncate max-w-[320px] block">
          {row.original.content}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row.original)}
            className="h-8 w-8 p-0 cursor-pointer"
            title="Edit / Pin"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(row.original)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Comments Moderation
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Review, edit, pin, and moderate user comments across all published
              articles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchComments}
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

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search comments or slug..."
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8 text-sm h-9"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Showing {table.getRowModel().rows.length} of {data.length}{" "}
                comments
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 border-t border-border">
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
                    <TableRow key={row.id}>
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
                      className="h-32 text-center text-xs text-muted-foreground"
                    >
                      {loading ? "Loading comments..." : "No comments found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>

          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-8 text-xs cursor-pointer"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-8 text-xs cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Edit Comment Modal */}
        <Dialog
          open={!!editTarget}
          onOpenChange={(open) => !open && setEditTarget(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg">Moderate Comment</DialogTitle>
              <DialogDescription className="text-xs">
                Edit comment text or toggle highlighted pin status.
              </DialogDescription>
            </DialogHeader>

            {editTarget && (
              <div className="space-y-4 py-2">
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs flex justify-between items-center">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Author
                    </span>
                    <span className="font-semibold text-foreground">
                      {editTarget.author_name}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {editTarget.post_slug}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="content" className="text-xs font-semibold">
                    Comment Content
                  </Label>
                  <Textarea
                    id="content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="text-xs min-h-[120px]"
                    placeholder="Enter revised comment text..."
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="pin-switch"
                      className="text-xs font-semibold cursor-pointer"
                    >
                      Pin to Top
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Display this comment prominently at the top of the
                      discussion.
                    </p>
                  </div>
                  <Switch
                    id="pin-switch"
                    checked={editPinned}
                    onCheckedChange={setEditPinned}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditTarget(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={isUpdating || !editContent.trim()}
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Comment?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Are you sure you want to permanently delete this comment by{" "}
                <span className="font-semibold text-foreground">
                  {deleteTarget?.author_name}
                </span>
                ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardShell>
  );
}

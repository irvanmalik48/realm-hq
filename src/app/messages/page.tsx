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
  Calendar,
  Eye,
  Globe,
  Mail,
  Monitor,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Submission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export default function MessagesPage() {
  const [data, setData] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [selectedSubmission, setSelectedSubmission] =
    React.useState<Submission | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Submission | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchSubmissions = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contact?limit=100");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.submissions) {
        setData(json.submissions);
      }
    } catch {
      toast.error("Failed to load contact submissions");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/contact?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      setData((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success("Submission deleted successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete submission");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<Submission>[] = [
    {
      accessorKey: "created_at",
      header: "Received",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Sender",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {row.original.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.email}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <span className="text-sm font-medium truncate max-w-[200px] block">
          {row.original.subject}
        </span>
      ),
    },
    {
      accessorKey: "message",
      header: "Preview",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[280px] block font-sans">
          {row.original.message}
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
            onClick={() => setSelectedSubmission(row.original)}
            className="h-8 w-8 p-0 cursor-pointer"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(row.original)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
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
              Contact Submissions
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Inquiries and messages submitted through the website contact form.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSubmissions}
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
                  placeholder="Filter submissions..."
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8 text-sm h-9"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Showing {table.getRowModel().rows.length} of {data.length}{" "}
                messages
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
                      {loading
                        ? "Loading submissions..."
                        : "No contact submissions found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Table Pagination Controls */}
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

        {/* View Details Dialog */}
        <Dialog
          open={!!selectedSubmission}
          onOpenChange={(open) => !open && setSelectedSubmission(null)}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Contact Inbound Message
              </DialogTitle>
              <DialogDescription className="text-xs">
                Detailed headers and visitor message content
              </DialogDescription>
            </DialogHeader>

            {selectedSubmission && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      From
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedSubmission.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Email
                    </span>
                    <a
                      href={`mailto:${selectedSubmission.email}`}
                      className="text-primary hover:underline"
                    >
                      {selectedSubmission.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Timestamp
                    </span>
                    <span className="text-foreground">
                      {new Date(selectedSubmission.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      IP Address
                    </span>
                    <span className="font-mono text-foreground">
                      {selectedSubmission.ip_address || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    Subject
                  </span>
                  <p className="text-sm font-medium p-2.5 rounded-md bg-muted/20 border border-border">
                    {selectedSubmission.subject}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    Message Body
                  </span>
                  <div className="text-xs whitespace-pre-wrap p-3 rounded-md bg-muted/20 border border-border min-h-[120px] max-h-[300px] overflow-y-auto leading-relaxed">
                    {selectedSubmission.message}
                  </div>
                </div>

                {selectedSubmission.user_agent && (
                  <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 pt-1">
                    <Monitor className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="truncate">
                      {selectedSubmission.user_agent}
                    </span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSubmission(null)}
              >
                Close
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
                Delete Submission?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Are you sure you want to delete this contact message from{" "}
                <span className="font-medium text-foreground">
                  {deleteTarget?.name} ({deleteTarget?.email})
                </span>
                ? This action is permanent.
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

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
  Copy,
  Download,
  Eye,
  Monitor,
  MoreHorizontal,
  RefreshCw,
  Search,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function MessagesContent() {
  const [data, setData] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const [selectedSubmission, setSelectedSubmission] =
    React.useState<Submission | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Submission | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Bulk actions
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const fetchSubmissions = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contact?limit=200");
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

  // Filtered data for search
  const filteredData = React.useMemo(() => {
    if (!globalFilter.trim()) return data;
    const query = globalFilter.toLowerCase();
    return data.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query) ||
        (item.ip_address?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [data, globalFilter]);

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

  const handleBulkDelete = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedItems = selectedIndices
      .map((idx) => table.getRowModel().rows[idx]?.original)
      .filter(Boolean);
    if (!selectedItems.length) return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(
        selectedItems.map((item) =>
          fetch(`/api/contact?id=${item.id}`, { method: "DELETE" }),
        ),
      );

      const selectedIdSet = new Set(selectedItems.map((i) => i.id));
      setData((prev) => prev.filter((item) => !selectedIdSet.has(item.id)));
      toast.success(`Deleted ${selectedItems.length} contact submissions`);
      setRowSelection({});
      setBulkDeleteOpen(false);
    } catch {
      toast.error("Failed to delete selected submissions");
    } finally {
      setIsBulkDeleting(false);
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
      a.download = `submissions-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = [
        "id",
        "name",
        "email",
        "subject",
        "message",
        "ip_address",
        "created_at",
      ];
      const rows = exportData.map((item) => [
        `"${item.id}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.email.replace(/"/g, '""')}"`,
        `"${item.subject.replace(/"/g, '""')}"`,
        `"${item.message.replace(/"/g, '""')}"`,
        `"${item.ip_address || ""}"`,
        `"${item.created_at}"`,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `submissions-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(
      `Exported ${exportData.length} records as ${format.toUpperCase()}`,
    );
  };

  const columns: ColumnDef<Submission>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all submissions on page"
          className="translate-y-0.5"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select message row"
          className="translate-y-0.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Received" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sender" />
      ),
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
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subject" />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-sm font-medium truncate max-w-[220px] block cursor-pointer hover:underline text-left"
          onClick={() => setSelectedSubmission(row.original)}
          title={row.original.subject}
        >
          {row.original.subject}
        </button>
      ),
    },
    {
      accessorKey: "message",
      header: "Preview",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[300px] block font-sans">
          {row.original.message}
        </span>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSubmission(item)}
              className="h-8 w-8 p-0 cursor-pointer"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => setSelectedSubmission(item)}
                  className="text-xs cursor-pointer gap-2"
                >
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  View Full Message
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(item.email);
                    toast.success("Sender email copied");
                  }}
                  className="text-xs cursor-pointer gap-2"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  Copy Email
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(item.message);
                    toast.success("Message text copied");
                  }}
                  className="text-xs cursor-pointer gap-2"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  Copy Message
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(item)}
                  className="text-xs cursor-pointer gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Submission
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        pageSize: 15,
      },
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={() => handleExportSelected("json")}
                className="text-xs cursor-pointer"
              >
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportSelected("csv")}
                className="text-xs cursor-pointer"
              >
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3 border-b border-border bg-card/40 space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by name, email, subject..."
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
              Showing {table.getRowModel().rows.length} of {data.length}{" "}
              messages
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
                      ? "Loading submissions..."
                      : "No contact submissions found matching your search."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Configurable Pagination Controls */}
          <DataTablePagination
            table={table}
            pageSizeOptions={[10, 15, 25, 50, 100]}
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
          onClick={() => setBulkDeleteOpen(true)}
          disabled={isBulkDeleting}
          className="h-8 text-xs gap-1.5 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </DataTableBulkActions>

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

      {/* Single Delete Confirmation Alert Dialog */}
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
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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

      {/* Bulk Delete Alert Dialog */}
      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {selectedCount} Selected Submissions?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. This will permanently remove{" "}
              <span className="font-semibold text-foreground">
                {selectedCount}
              </span>{" "}
              contact submissions from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isBulkDeleting
                ? "Deleting..."
                : `Delete ${selectedCount} Submissions`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <DashboardShell>
      <React.Suspense
        fallback={
          <TableSkeleton
            title="Contact Submissions"
            description="Inquiries and messages submitted through the website contact form."
            rowCount={8}
            columnCount={5}
          />
        }
      >
        <MessagesContent />
      </React.Suspense>
    </DashboardShell>
  );
}

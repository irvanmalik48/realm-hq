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
  AlertCircle,
  AlertTriangle,
  Bug,
  Check,
  Copy,
  Download,
  Eye,
  Filter,
  Info,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
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
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  component?: string;
  trace_id?: string;
  span_id?: string;
  attributes_json?: string;
}

function LogsContent() {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [totalLogs, setTotalLogs] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [levelFilter, setLevelFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [traceFilter, setTraceFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Inspect modal
  const [inspectTarget, setInspectTarget] = React.useState<LogEntry | null>(
    null,
  );
  const [copiedAttrs, setCopiedAttrs] = React.useState(false);

  // Clear modal
  const [clearOpen, setClearOpen] = React.useState(false);
  const [clearMode, setClearMode] = React.useState<"all" | "7d" | "30d">("7d");
  const [isClearing, setIsClearing] = React.useState(false);

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (levelFilter !== "all") params.set("level", levelFilter);
      if (search) params.set("search", search);
      if (traceFilter) params.set("trace_id", traceFilter);

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.logs) {
        setLogs(json.logs);
        setTotalLogs(json.total || 0);
      }
    } catch {
      toast.error("Failed to load system logs");
    } finally {
      setLoading(false);
    }
  }, [levelFilter, search, traceFilter]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const params = new URLSearchParams();
      if (clearMode === "all") {
        params.set("clear_all", "true");
      } else if (clearMode === "7d") {
        const d = new Date(Date.now() - 7 * 86400 * 1000);
        params.set("before_timestamp", d.toISOString());
      } else if (clearMode === "30d") {
        const d = new Date(Date.now() - 30 * 86400 * 1000);
        params.set("before_timestamp", d.toISOString());
      }

      const res = await fetch(`/api/logs?${params.toString()}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Purge failed");

      toast.success("Logs Purged Successfully", {
        description: `Deleted ${json.deleted_count || 0} log records`,
      });

      setClearOpen(false);
      fetchLogs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to purge logs");
    } finally {
      setIsClearing(false);
    }
  };

  const copyAttributes = (jsonStr?: string) => {
    if (!jsonStr) return;
    navigator.clipboard.writeText(jsonStr);
    setCopiedAttrs(true);
    setTimeout(() => setCopiedAttrs(false), 2000);
    toast.success("JSON attributes copied");
  };

  const handleExportSelected = (format: "json" | "csv") => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedItems = selectedIndices
      .map((idx) => table.getRowModel().rows[idx]?.original)
      .filter(Boolean);
    const exportData = selectedItems.length > 0 ? selectedItems : logs;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system-logs-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = [
        "id",
        "timestamp",
        "level",
        "component",
        "trace_id",
        "span_id",
        "message",
      ];
      const rows = exportData.map((item) => [
        `"${item.id}"`,
        `"${item.timestamp}"`,
        `"${item.level}"`,
        `"${item.component || ""}"`,
        `"${item.trace_id || ""}"`,
        `"${item.span_id || ""}"`,
        `"${item.message.replace(/"/g, '""')}"`,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system-logs-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(
      `Exported ${exportData.length} logs as ${format.toUpperCase()}`,
    );
  };

  const getLevelBadge = (level: string) => {
    const l = level.toUpperCase();
    switch (l) {
      case "ERROR":
        return (
          <Badge
            variant="destructive"
            className="text-[10px] uppercase font-mono px-1.5 py-0 gap-1"
          >
            <AlertCircle className="h-2.5 w-2.5" /> ERROR
          </Badge>
        );
      case "WARN":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px] uppercase font-mono px-1.5 py-0 gap-1"
          >
            <AlertTriangle className="h-2.5 w-2.5" /> WARN
          </Badge>
        );
      case "DEBUG":
        return (
          <Badge
            variant="secondary"
            className="text-[10px] uppercase font-mono px-1.5 py-0 gap-1 text-muted-foreground"
          >
            <Bug className="h-2.5 w-2.5" /> DEBUG
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-mono px-1.5 py-0 gap-1 text-blue-500 border-blue-500/30 bg-blue-500/10"
          >
            <Info className="h-2.5 w-2.5" /> INFO
          </Badge>
        );
    }
  };

  const columns: ColumnDef<LogEntry>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all logs on page"
          className="translate-y-0.5"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select log entry"
          className="translate-y-0.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "timestamp",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Timestamp" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.original.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "level",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Level" />
      ),
      cell: ({ row }) => getLevelBadge(row.original.level),
    },
    {
      accessorKey: "component",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Component" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.component || "core"}
        </span>
      ),
    },
    {
      accessorKey: "message",
      header: "Message",
      cell: ({ row }) => (
        <button
          type="button"
          className="font-mono text-xs text-foreground truncate max-w-[360px] block cursor-pointer hover:underline text-left"
          title={row.original.message}
          onClick={() => setInspectTarget(row.original)}
        >
          {row.original.message}
        </button>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "trace_id",
      header: "Trace ID",
      cell: ({ row }) =>
        row.original.trace_id ? (
          <button
            type="button"
            className="cursor-pointer"
            onClick={() => setTraceFilter(row.original.trace_id || "")}
            title="Filter by this trace"
          >
            <Badge
              variant="outline"
              className="font-mono text-[10px] px-1.5 py-0 hover:bg-muted"
            >
              {row.original.trace_id.slice(0, 8)}...
            </Badge>
          </button>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">-</span>
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
              onClick={() => setInspectTarget(item)}
              className="h-8 w-8 p-0 cursor-pointer"
              title="Inspect Structured Attributes"
            >
              <Eye className="h-3.5 w-3.5" />
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
                  onClick={() => setInspectTarget(item)}
                  className="text-xs cursor-pointer gap-2"
                >
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  Inspect Payload
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(item.message);
                    toast.success("Log message copied");
                  }}
                  className="text-xs cursor-pointer gap-2"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  Copy Message
                </DropdownMenuItem>
                {item.trace_id && (
                  <DropdownMenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(item.trace_id || "");
                      toast.success("Trace ID copied");
                    }}
                    className="text-xs cursor-pointer gap-2"
                  >
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    Copy Trace ID
                  </DropdownMenuItem>
                )}
                {item.attributes_json && (
                  <DropdownMenuItem
                    onClick={() => copyAttributes(item.attributes_json)}
                    className="text-xs cursor-pointer gap-2"
                  >
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    Copy JSON Attributes
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: logs,
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
        pageSize: 20,
      },
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            System Logs
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time activity logs, diagnostic events, and system errors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
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
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setClearOpen(true)}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Purge Logs
          </Button>
        </div>
      </div>

      {/* Filters and Controls */}
      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3 border-b border-border bg-card/40 space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search log messages..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Select
                value={levelFilter}
                onValueChange={(val) => {
                  if (val) setLevelFilter(val);
                }}
              >
                <SelectTrigger className="flex-1 sm:w-36 h-9 text-xs bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground font-normal">
                      Level:
                    </span>
                    <SelectValue>
                      {(val) => {
                        if (val === "DEBUG") {
                          return (
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-400">
                              <span className="size-1.5 rounded-full bg-slate-400 shrink-0" />
                              DEBUG
                            </span>
                          );
                        }
                        if (val === "INFO") {
                          return (
                            <span className="inline-flex items-center gap-1.5 font-medium text-blue-500">
                              <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                              INFO
                            </span>
                          );
                        }
                        if (val === "WARN") {
                          return (
                            <span className="inline-flex items-center gap-1.5 font-medium text-amber-500">
                              <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                              WARN
                            </span>
                          );
                        }
                        if (val === "ERROR") {
                          return (
                            <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                              <span className="size-1.5 rounded-full bg-destructive shrink-0" />
                              ERROR
                            </span>
                          );
                        }
                        return (
                          <span className="font-medium text-foreground">
                            All
                          </span>
                        );
                      }}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-[150px]">
                  <SelectItem value="all" className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                      All Levels
                    </span>
                  </SelectItem>
                  <SelectItem value="DEBUG" className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-slate-400" />
                      DEBUG
                    </span>
                  </SelectItem>
                  <SelectItem value="INFO" className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-blue-500" />
                      INFO
                    </span>
                  </SelectItem>
                  <SelectItem value="WARN" className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      WARN
                    </span>
                  </SelectItem>
                  <SelectItem value="ERROR" className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-destructive" />
                      ERROR
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {traceFilter && (
                <button
                  type="button"
                  onClick={() => setTraceFilter("")}
                  className="cursor-pointer"
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs hover:bg-muted"
                  >
                    Trace: {traceFilter.slice(0, 8)}... ×
                  </Badge>
                </button>
              )}

              {(search || levelFilter !== "all" || traceFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setLevelFilter("all");
                    setTraceFilter("");
                  }}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/80 hover:border-border hover:bg-accent/40 gap-1.5 transition-colors"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset</span>
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Showing {table.getRowModel().rows.length} of {totalLogs} events
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table className="min-w-[700px]">
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
                      ? "Loading logs..."
                      : "No log entries found for this filter."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Configurable Pagination Controls */}
          <DataTablePagination
            table={table}
            pageSizeOptions={[15, 25, 50, 100]}
          />
        </CardContent>
      </Card>

      {/* Floating Bulk Action Bar */}
      <DataTableBulkActions
        selectedCount={selectedCount}
        totalCount={logs.length}
        onClearSelection={() => setRowSelection({})}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExportSelected("json")}
          className="h-8 text-xs gap-1.5 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          Export JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExportSelected("csv")}
          className="h-8 text-xs gap-1.5 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </DataTableBulkActions>

      {/* Structured JSON Inspector Dialog */}
      <Dialog
        open={!!inspectTarget}
        onOpenChange={(open) => !open && setInspectTarget(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Log Entry Details</DialogTitle>
            <DialogDescription className="text-xs">
              Event attributes, trace context, and message details
            </DialogDescription>
          </DialogHeader>

          {inspectTarget && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border text-xs font-mono">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Level
                  </span>
                  <span>{getLevelBadge(inspectTarget.level)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Timestamp
                  </span>
                  <span className="text-foreground">
                    {inspectTarget.timestamp}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Trace ID
                  </span>
                  <span className="text-foreground truncate block">
                    {inspectTarget.trace_id || "None"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Span ID
                  </span>
                  <span className="text-foreground truncate block">
                    {inspectTarget.span_id || "None"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Message
                </span>
                <div className="p-3 rounded-md bg-muted/20 border border-border font-mono text-xs">
                  {inspectTarget.message}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Structured Attributes (JSONB)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyAttributes(inspectTarget.attributes_json)
                    }
                    className="h-7 text-xs gap-1"
                  >
                    {copiedAttrs ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy JSON
                      </>
                    )}
                  </Button>
                </div>
                <pre className="p-3 rounded-md bg-muted/40 border border-border text-xs font-mono overflow-x-auto max-h-[220px]">
                  {inspectTarget.attributes_json
                    ? JSON.stringify(
                        JSON.parse(inspectTarget.attributes_json),
                        null,
                        2,
                      )
                    : "{}"}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectTarget(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge Logs Modal */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Purge System Logs
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Select a retention policy to delete logs from PostgreSQL table{" "}
              <span className="font-mono text-foreground">system_logs</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Retention Strategy
              </Label>
              <Select
                value={clearMode}
                onValueChange={(val) => {
                  if (val) setClearMode(val as "all" | "7d" | "30d");
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d" className="text-xs">
                    Delete logs older than 7 days
                  </SelectItem>
                  <SelectItem value="30d" className="text-xs">
                    Delete logs older than 30 days
                  </SelectItem>
                  <SelectItem value="all" className="text-xs">
                    Truncate entire log table (Clear All)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearLogs}
              disabled={isClearing}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isClearing ? "Purging..." : "Confirm Purge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function LogsPage() {
  return (
    <DashboardShell>
      <React.Suspense
        fallback={
          <TableSkeleton
            title="System Logs"
            description="Real-time activity logs, diagnostic events, and system errors."
            rowCount={10}
            columnCount={5}
          />
        }
      >
        <LogsContent />
      </React.Suspense>
    </DashboardShell>
  );
}

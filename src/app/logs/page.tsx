"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Terminal,
  Search,
  Trash2,
  RefreshCw,
  Eye,
  AlertTriangle,
  Flame,
  Bug,
  Info,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function LogsPage() {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [totalLogs, setTotalLogs] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [levelFilter, setLevelFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [traceFilter, setTraceFilter] = React.useState("");

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
      params.set("limit", "100");
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
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.original.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }) => getLevelBadge(row.original.level),
    },
    {
      accessorKey: "component",
      header: "Component",
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
        <span
          className="font-mono text-xs text-foreground truncate max-w-[360px] block"
          title={row.original.message}
        >
          {row.original.message}
        </span>
      ),
    },
    {
      accessorKey: "trace_id",
      header: "Trace ID",
      cell: ({ row }) =>
        row.original.trace_id ? (
          <Badge
            variant="outline"
            className="font-mono text-[10px] px-1.5 py-0 cursor-pointer hover:bg-muted"
            onClick={() => setTraceFilter(row.original.trace_id || "")}
            title="Filter by this trace"
          >
            {row.original.trace_id.slice(0, 8)}...
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">-</span>
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInspectTarget(row.original)}
            className="h-8 w-8 p-0 cursor-pointer"
            title="Inspect Structured Attributes"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Structured System Logs
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Asynchronously captured slog events with OpenTelemetry trace
              correlation.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
        <Card>
          <CardHeader className="pb-3">
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
                </div>

                <Select
                  value={levelFilter}
                  onValueChange={(val) => {
                    if (val) setLevelFilter(val);
                  }}
                >
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue placeholder="Log level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="DEBUG">DEBUG</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="WARN">WARN</SelectItem>
                    <SelectItem value="ERROR">ERROR</SelectItem>
                  </SelectContent>
                </Select>

                {traceFilter && (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs cursor-pointer"
                    onClick={() => setTraceFilter("")}
                  >
                    Trace: {traceFilter.slice(0, 8)}... ×
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Showing {table.getRowModel().rows.length} of {totalLogs} events
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
                        ? "Loading logs..."
                        : "No log entries found for this filter."}
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

        {/* Structured JSON Inspector Dialog */}
        <Dialog
          open={!!inspectTarget}
          onOpenChange={(open) => !open && setInspectTarget(null)}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Structured Log Entry
              </DialogTitle>
              <DialogDescription className="text-xs">
                Attributes, OpenTelemetry trace context, and payload details
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
                    <SelectItem value="7d">
                      Delete logs older than 7 days
                    </SelectItem>
                    <SelectItem value="30d">
                      Delete logs older than 30 days
                    </SelectItem>
                    <SelectItem value="all">
                      Truncate entire log table (Clear All)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isClearing}>
                Cancel
              </AlertDialogCancel>
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
    </DashboardShell>
  );
}

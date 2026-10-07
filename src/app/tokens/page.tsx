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
  Check,
  Clock,
  Copy,
  Download,
  Filter,
  Gauge,
  Key,
  KeyRound,
  MoreHorizontal,
  Plus,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface APITokenItem {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  rate_limit_rpm: number;
  last_used_at?: string;
  expires_at?: string;
  is_revoked: boolean;
  created_at: string;
}

function TokensContent() {
  const [tokens, setTokens] = React.useState<APITokenItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "status", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "active" | "revoked"
  >("all");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  React.useEffect(() => {
    void globalFilter;
    void statusFilter;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [globalFilter, statusFilter]);

  // Create modal state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [scopeOption, setScopeOption] = React.useState("*");
  const [rateLimitRpm, setRateLimitRpm] = React.useState("60");
  const [expiryOption, setExpiryOption] = React.useState("0");
  const [isCreating, setIsCreating] = React.useState(false);

  // Created secret banner
  const [createdRawToken, setCreatedRawToken] = React.useState<string | null>(
    null,
  );
  const [copiedRaw, setCopiedRaw] = React.useState(false);

  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = React.useState<APITokenItem | null>(
    null,
  );
  const [isRevoking, setIsRevoking] = React.useState(false);

  // Bulk Revoke dialog
  const [bulkRevokeOpen, setBulkRevokeOpen] = React.useState(false);
  const [isBulkRevoking, setIsBulkRevoking] = React.useState(false);

  const fetchTokens = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tokens");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.tokens) {
        setTokens(json.tokens);
      }
    } catch {
      toast.error("Failed to load API tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const scopes = scopeOption === "*" ? ["*"] : scopeOption.split(",");
      const expiresInSec = parseInt(expiryOption, 10);

      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          scopes,
          rate_limit_rpm: parseInt(rateLimitRpm, 10) || 60,
          expires_in_seconds: expiresInSec > 0 ? expiresInSec : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create token");

      setCreatedRawToken(json.raw_token);
      toast.success("API Token generated successfully");
      setCreateOpen(false);
      setName("");
      fetchTokens();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      const res = await fetch(`/api/tokens?id=${revokeTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Revocation failed");

      setTokens((prev) =>
        prev.map((t) =>
          t.id === revokeTarget.id ? { ...t, is_revoked: true } : t,
        ),
      );
      toast.success("Token revoked successfully");
      setRevokeTarget(null);
    } catch {
      toast.error("Failed to revoke token");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleBulkRevoke = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedItems = selectedIndices
      .map((idx) => table.getRowModel().rows[idx]?.original)
      .filter((t) => t && !t.is_revoked);

    if (!selectedItems.length) return;

    setIsBulkRevoking(true);
    try {
      await Promise.all(
        selectedItems.map((token) =>
          fetch(`/api/tokens?id=${token.id}`, { method: "DELETE" }),
        ),
      );

      const revokedIdSet = new Set(selectedItems.map((t) => t.id));
      setTokens((prev) =>
        prev.map((t) =>
          revokedIdSet.has(t.id) ? { ...t, is_revoked: true } : t,
        ),
      );
      toast.success(`Successfully revoked ${selectedItems.length} token(s)`);
      setRowSelection({});
      setBulkRevokeOpen(false);
    } catch {
      toast.error("Failed to revoke selected tokens");
    } finally {
      setIsBulkRevoking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
    toast.success("Token copied to clipboard");
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
      a.download = `tokens-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = [
        "id",
        "name",
        "token_prefix",
        "scopes",
        "rate_limit_rpm",
        "is_revoked",
        "last_used_at",
        "created_at",
      ];
      const rows = exportData.map((item) => [
        `"${item.id}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.token_prefix}"`,
        `"${(item.scopes || []).join(";")}"`,
        item.rate_limit_rpm,
        item.is_revoked ? "revoked" : "active",
        `"${item.last_used_at || ""}"`,
        `"${item.created_at}"`,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tokens-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(
      `Exported ${exportData.length} tokens as ${format.toUpperCase()}`,
    );
  };

  // Filtered dataset
  const filteredData = React.useMemo(() => {
    return tokens.filter((item) => {
      // Status filter
      if (statusFilter === "active" && item.is_revoked) return false;
      if (statusFilter === "revoked" && !item.is_revoked) return false;

      // Global search
      if (globalFilter.trim()) {
        const q = globalFilter.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(q);
        const prefixMatch = item.token_prefix.toLowerCase().includes(q);
        const scopeMatch = item.scopes?.some((s) =>
          s.toLowerCase().includes(q),
        );
        if (!nameMatch && !prefixMatch && !scopeMatch) return false;
      }

      return true;
    });
  }, [tokens, statusFilter, globalFilter]);

  const columns: ColumnDef<APITokenItem>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all tokens on page"
          className="translate-y-0.5"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={row.original.is_revoked}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select token row"
          className="translate-y-0.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name / Identifier" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-foreground">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "token_prefix",
      header: "Prefix",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.token_prefix}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "scopes",
      header: "Scopes",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.scopes?.map((sc) => (
            <Badge
              key={sc}
              variant="outline"
              className="font-mono text-[10px] px-1.5 py-0"
            >
              {sc}
            </Badge>
          ))}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "rate_limit_rpm",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rate Limit" />
      ),
      cell: ({ row }) => (
        <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <Gauge className="h-3 w-3" />
          {row.original.rate_limit_rpm} RPM
        </span>
      ),
    },
    {
      accessorKey: "last_used_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Used" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {row.original.last_used_at ? (
            new Date(row.original.last_used_at).toLocaleString()
          ) : (
            <span className="italic">Never</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: "is_revoked",
      id: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) =>
        row.original.is_revoked ? (
          <Badge
            variant="destructive"
            className="text-[10px] uppercase font-mono px-1.5 py-0"
          >
            Revoked
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-mono px-1.5 py-0 text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
          >
            Active
          </Badge>
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {!item.is_revoked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevokeTarget(item)}
                className="h-8 px-2 text-xs text-destructive hover:text-destructive cursor-pointer"
                title="Revoke Token"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Revoke
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(item.token_prefix);
                    toast.success("Token prefix copied");
                  }}
                  className="text-xs cursor-pointer gap-2"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  Copy Prefix
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(item.id);
                    toast.success("Token ID copied");
                  }}
                  className="text-xs cursor-pointer gap-2"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  Copy ID
                </DropdownMenuItem>
                {!item.is_revoked && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setRevokeTarget(item)}
                      className="text-xs cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke Token
                    </DropdownMenuItem>
                  </>
                )}
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
      pagination,
    },
    enableRowSelection: (row) => !row.original.is_revoked,
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
            <KeyRound className="h-5 w-5 text-primary" />
            API Keys
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create and manage API keys to authenticate external apps and
            services.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTokens}
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
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Generate Token
          </Button>
        </div>
      </div>

      {/* Newly Created Token Banner */}
      {createdRawToken && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-500">
              <Key className="h-4 w-4" />
              Copy Your Secret API Token
            </CardTitle>
            <CardDescription className="text-xs">
              This secret will never be shown again. Save it in your environment
              configuration now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={createdRawToken}
                className="font-mono text-xs bg-background text-foreground h-9"
              />
              <Button
                size="sm"
                onClick={() => copyToClipboard(createdRawToken)}
                className="gap-1.5 shrink-0 h-9"
              >
                {copiedRaw ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Token
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tokens List Table Card */}
      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3 border-b border-border bg-card/40 space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by token name, prefix..."
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

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  if (val) setStatusFilter(val as "all" | "active" | "revoked");
                }}
              >
                <SelectTrigger className="h-9 w-full sm:w-40 text-xs bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground font-normal">
                      Status:
                    </span>
                    <SelectValue>
                      {(val) => {
                        if (val === "active") {
                          return (
                            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-500">
                              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                              Active
                            </span>
                          );
                        }
                        if (val === "revoked") {
                          return (
                            <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                              <span className="size-1.5 rounded-full bg-destructive shrink-0" />
                              Revoked
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
                <SelectContent align="start" className="min-w-[160px]">
                  <SelectItem value="all" className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                      All Tokens ({tokens.length})
                    </span>
                  </SelectItem>
                  <SelectItem value="active" className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Active Only
                    </span>
                  </SelectItem>
                  <SelectItem value="revoked" className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-destructive" />
                      Revoked Only
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {(globalFilter || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGlobalFilter("");
                    setStatusFilter("all");
                  }}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/80 hover:border-border hover:bg-accent/40 gap-1.5 transition-colors"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset</span>
                </Button>
              )}
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
                      ? "Loading tokens..."
                      : "No API tokens found matching your search."}
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
        totalCount={filteredData.filter((t) => !t.is_revoked).length}
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
          onClick={() => setBulkRevokeOpen(true)}
          disabled={isBulkRevoking}
          className="h-8 text-xs gap-1.5 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Revoke Tokens
        </Button>
      </DataTableBulkActions>

      {/* Create Token Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Generate API Token</DialogTitle>
            <DialogDescription className="text-xs">
              Issue a signed, scoped API token for automated integrations.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="token-name" className="text-xs font-semibold">
                Token Name / Client Label
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="token-name"
                  placeholder="e.g. CI/CD Ingest Pipeline"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-8 text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scopes" className="text-xs font-semibold">
                Granted Scopes
              </Label>
              <Select
                value={scopeOption}
                onValueChange={(val) => {
                  if (val) setScopeOption(val);
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select scopes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="*" className="text-xs">
                    Wildcard Full Access (*)
                  </SelectItem>
                  <SelectItem
                    value="storage:read,storage:write"
                    className="text-xs"
                  >
                    Storage Read &amp; Write
                  </SelectItem>
                  <SelectItem value="comments:moderate" className="text-xs">
                    Comments Moderation
                  </SelectItem>
                  <SelectItem value="metrics:read" className="text-xs">
                    Metrics &amp; Telemetry Read
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rate-limit" className="text-xs font-semibold">
                  Rate Limit (RPM)
                </Label>
                <div className="relative">
                  <Gauge className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="rate-limit"
                    type="number"
                    min="1"
                    max="10000"
                    value={rateLimitRpm}
                    onChange={(e) => setRateLimitRpm(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expiry" className="text-xs font-semibold">
                  TTL Expiration
                </Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Select
                    value={expiryOption}
                    onValueChange={(val) => {
                      if (val) setExpiryOption(val);
                    }}
                  >
                    <SelectTrigger className="pl-8 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" className="text-xs">
                        Never Expires
                      </SelectItem>
                      <SelectItem value="2592000" className="text-xs">
                        30 Days
                      </SelectItem>
                      <SelectItem value="7776000" className="text-xs">
                        90 Days
                      </SelectItem>
                      <SelectItem value="31536000" className="text-xs">
                        1 Year
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating || !name.trim()}
              >
                {isCreating ? "Generating..." : "Generate Token"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Single Revoke Confirmation Alert Dialog */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Revoke API Token?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to revoke{" "}
              <span className="font-semibold text-foreground">
                {revokeTarget?.name} ({revokeTarget?.token_prefix}...)
              </span>
              ? Any service or worker using this credential will receive 401
              Unauthorized immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isRevoking ? "Revoking..." : "Revoke Token"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Revoke Confirmation Alert Dialog */}
      <AlertDialog
        open={bulkRevokeOpen}
        onOpenChange={(open) => !open && setBulkRevokeOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Revoke {selectedCount} Selected API Tokens?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to permanently revoke{" "}
              <span className="font-semibold text-foreground">
                {selectedCount}
              </span>{" "}
              active API tokens? Any clients or background workers using these
              tokens will immediately be rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkRevoking}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRevoke}
              disabled={isBulkRevoking}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isBulkRevoking
                ? "Revoking..."
                : `Revoke ${selectedCount} Tokens`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TokensPage() {
  return (
    <DashboardShell>
      <React.Suspense
        fallback={
          <TableSkeleton
            title="API Keys"
            description="Create and manage API keys to authenticate external apps and services."
            rowCount={8}
            columnCount={6}
          />
        }
      >
        <TokensContent />
      </React.Suspense>
    </DashboardShell>
  );
}

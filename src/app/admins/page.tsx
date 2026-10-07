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
  Copy,
  Download,
  Edit2,
  Lock,
  Mail,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { TwoFactorDialog } from "@/components/auth/two-factor-dialog";
import {
  DataTableBulkActions,
  DataTableColumnHeader,
  DataTablePagination,
} from "@/components/data-table";
import { DashboardShell } from "@/components/layout/dashboard-shell";
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
import { useAuth } from "@/lib/auth/auth-context";
import {
  ALL_AVAILABLE_PERMISSIONS,
  getPermissionLabel,
  PERMISSION_CATEGORIES,
} from "@/lib/auth/permissions";

interface AdminUserRecord {
  id: string;
  is_superadmin: boolean;
  permissions: string[];
  created_at: string;
  user: {
    id: string;
    email: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

function AdminsContent() {
  const { user, admin: currentAdmin } = useAuth();
  const [admins, setAdmins] = React.useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "role", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<
    "all" | "superadmin" | "staff"
  >("all");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  React.useEffect(() => {
    void globalFilter;
    void roleFilter;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [globalFilter, roleFilter]);

  // Add Admin modal
  const [addOpen, setAddOpen] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");
  const [newPermissions, setNewPermissions] = React.useState<string[]>([]);
  const [isAdding, setIsAdding] = React.useState(false);
  const newPermSet = React.useMemo(
    () => new Set(newPermissions),
    [newPermissions],
  );

  // Edit Permissions modal
  const [editTarget, setEditTarget] = React.useState<AdminUserRecord | null>(
    null,
  );
  const [editPermissions, setEditPermissions] = React.useState<string[]>([]);
  const [isEditing, setIsEditing] = React.useState(false);
  const editPermSet = React.useMemo(
    () => new Set(editPermissions),
    [editPermissions],
  );

  // Remove Admin dialog
  const [removeTarget, setRemoveTarget] =
    React.useState<AdminUserRecord | null>(null);
  const [isRemoving, setIsRemoving] = React.useState(false);

  // Bulk Revoke dialog
  const [bulkRevokeOpen, setBulkRevokeOpen] = React.useState(false);
  const [isBulkRevoking, setIsBulkRevoking] = React.useState(false);

  const fetchAdmins = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admins");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.admins) {
        setAdmins(json.admins);
      }
    } catch {
      toast.error("Failed to load admin roster");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const toggleNewPermission = (permId: string) => {
    setNewPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId],
    );
  };

  const toggleCategoryNewPermissions = (permIds: string[]) => {
    const allSelected = permIds.every((id) => newPermSet.has(id));
    if (allSelected) {
      const removeSet = new Set(permIds);
      setNewPermissions((prev) => prev.filter((p) => !removeSet.has(p)));
    } else {
      setNewPermissions((prev) => Array.from(new Set([...prev, ...permIds])));
    }
  };

  const toggleEditPermission = (permId: string) => {
    setEditPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId],
    );
  };

  const toggleCategoryEditPermissions = (permIds: string[]) => {
    const allSelected = permIds.every((id) => editPermSet.has(id));
    if (allSelected) {
      const removeSet = new Set(permIds);
      setEditPermissions((prev) => prev.filter((p) => !removeSet.has(p)));
    } else {
      setEditPermissions((prev) => Array.from(new Set([...prev, ...permIds])));
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          permissions: newPermissions,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to onboard admin");
      }

      toast.success("Administrator successfully added");
      setAddOpen(false);
      setNewEmail("");
      setNewPermissions([]);
      fetchAdmins();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to onboard admin",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editTarget) return;

    setIsEditing(true);
    try {
      const res = await fetch("/api/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_id: editTarget.id,
          permissions: editPermissions,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to update permissions");
      }

      toast.success("Permissions updated atomically");
      setEditTarget(null);
      fetchAdmins();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update permissions",
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!removeTarget) return;

    setIsRemoving(true);
    try {
      const res = await fetch(`/api/admins?admin_id=${removeTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to revoke admin");
      }

      toast.success("Admin privileges revoked");
      setRemoveTarget(null);
      fetchAdmins();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke admin",
      );
    } finally {
      setIsRemoving(false);
    }
  };

  // Filtered dataset
  const filteredData = React.useMemo(() => {
    return admins.filter((item) => {
      // Role filter
      if (roleFilter === "superadmin" && !item.is_superadmin) return false;
      if (roleFilter === "staff" && item.is_superadmin) return false;

      // Global search
      if (globalFilter.trim()) {
        const q = globalFilter.toLowerCase();
        const nameMatch = (item.user?.full_name || "")
          .toLowerCase()
          .includes(q);
        const usernameMatch = (item.user?.username || "")
          .toLowerCase()
          .includes(q);
        const emailMatch = (item.user?.email || "").toLowerCase().includes(q);
        if (!nameMatch && !usernameMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [admins, roleFilter, globalFilter]);

  const handleBulkRevoke = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedItems = selectedIndices
      .map((idx) => table.getRowModel().rows[idx]?.original)
      .filter((item) => item && !item.is_superadmin);

    if (!selectedItems.length) return;

    setIsBulkRevoking(true);
    try {
      await Promise.all(
        selectedItems.map((item) =>
          fetch(`/api/admins?admin_id=${item.id}`, { method: "DELETE" }),
        ),
      );

      toast.success(
        `Revoked privileges for ${selectedItems.length} administrator(s)`,
      );
      setRowSelection({});
      setBulkRevokeOpen(false);
      fetchAdmins();
    } catch {
      toast.error("Failed to revoke selected administrators");
    } finally {
      setIsBulkRevoking(false);
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
      a.download = `admins-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = [
        "id",
        "username",
        "full_name",
        "email",
        "is_superadmin",
        "permissions",
        "created_at",
      ];
      const rows = exportData.map((item) => [
        `"${item.id}"`,
        `"${item.user?.username || ""}"`,
        `"${item.user?.full_name || ""}"`,
        `"${item.user?.email || ""}"`,
        item.is_superadmin ? "true" : "false",
        `"${(item.permissions || []).join(";")}"`,
        `"${item.created_at}"`,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admins-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(
      `Exported ${exportData.length} admins as ${format.toUpperCase()}`,
    );
  };

  const columns: ColumnDef<AdminUserRecord>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all admins on page"
          className="translate-y-0.5"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={row.original.is_superadmin}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select admin row"
          className="translate-y-0.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "user",
      id: "user",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User / Account" />
      ),
      cell: ({ row }) => {
        const user = row.original.user;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {user?.full_name || user?.username}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {user?.email}
            </span>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const nameA =
          rowA.original.user?.full_name || rowA.original.user?.username || "";
        const nameB =
          rowB.original.user?.full_name || rowB.original.user?.username || "";
        return nameA.localeCompare(nameB);
      },
    },
    {
      accessorKey: "is_superadmin",
      id: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const isSuper = row.original.is_superadmin;
        return isSuper ? (
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px] gap-1 px-1.5 py-0"
          >
            <ShieldCheck className="h-3 w-3" /> Superadmin
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
            <UserCheck className="h-3 w-3" /> Staff Admin
          </Badge>
        );
      },
    },
    {
      accessorKey: "permissions",
      header: "Granular Permissions",
      cell: ({ row }) => {
        const item = row.original;
        if (item.is_superadmin) {
          return (
            <span className="text-xs text-muted-foreground font-mono italic">
              Full Root Access (*)
            </span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {item.permissions?.length ? (
              item.permissions.map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="text-[10px] font-mono px-1.5 py-0"
                  title={getPermissionLabel(p)}
                >
                  {p}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">None</span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assigned On" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {!item.is_superadmin && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditTarget(item);
                    setEditPermissions(item.permissions || []);
                  }}
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="Edit Permissions"
                >
                  <Edit2 className="h-3.5 w-3.5" />
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
                      onClick={() => {
                        setEditTarget(item);
                        setEditPermissions(item.permissions || []);
                      }}
                      className="text-xs cursor-pointer gap-2"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Edit Permissions
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(item.user.email);
                        toast.success("Admin email copied");
                      }}
                      className="text-xs cursor-pointer gap-2"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      Copy Email
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setRemoveTarget(item)}
                      className="text-xs cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke Privileges
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
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
    enableRowSelection: (row) => !row.original.is_superadmin,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedCount = Object.keys(rowSelection).length;

  if (!currentAdmin?.is_superadmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto space-y-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Superadmin Access Required
        </h2>
        <p className="text-xs text-muted-foreground">
          Only designated site superadmins configured via the server environment
          can manage administrators and change team roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Administrators
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage administrator accounts, assign roles, and control access
            permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <TwoFactorDialog
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs cursor-pointer"
              >
                <ShieldCheck
                  className={`h-3.5 w-3.5 ${user?.two_factor_enabled ? "text-emerald-500" : ""}`}
                />
                {user?.two_factor_enabled ? "2FA Active" : "Setup 2FA"}
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAdmins}
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
            onClick={() => setAddOpen(true)}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Add Administrator
          </Button>
        </div>
      </div>

      {/* Admin Roster Table Card */}
      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3 border-b border-border bg-card/40 space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter admins by name, email..."
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
                value={roleFilter}
                onValueChange={(val) => {
                  if (val) setRoleFilter(val as "all" | "superadmin" | "staff");
                }}
              >
                <SelectTrigger className="h-9 w-full sm:w-40 text-xs bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors">
                  <div className="flex items-center gap-1.5 truncate">
                    <ShieldCheck className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground font-normal">
                      Role:
                    </span>
                    <SelectValue>
                      {(val) => {
                        if (val === "superadmin") {
                          return (
                            <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                              <span className="size-1.5 rounded-full bg-primary shrink-0" />
                              Superadmin
                            </span>
                          );
                        }
                        if (val === "staff") {
                          return (
                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                              <span className="size-1.5 rounded-full bg-muted-foreground shrink-0" />
                              Staff
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
                      All Roles ({admins.length})
                    </span>
                  </SelectItem>
                  <SelectItem value="superadmin" className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Superadmins
                    </span>
                  </SelectItem>
                  <SelectItem value="staff" className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-muted-foreground" />
                      Staff Admins
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {(globalFilter || roleFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGlobalFilter("");
                    setRoleFilter("all");
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
                    No administrators registered matching your search.
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
        totalCount={filteredData.filter((a) => !a.is_superadmin).length}
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
          Revoke Access
        </Button>
      </DataTableBulkActions>

      {/* Add Administrator Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg">Add New Administrator</DialogTitle>
            <DialogDescription className="text-xs">
              Look up an existing registered user by email and assign granular
              permissions.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleAddAdmin}
            className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col"
          >
            <div className="space-y-1.5 shrink-0">
              <Label htmlFor="admin-email" className="text-xs font-semibold">
                User Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="pl-8 text-xs h-9"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                The user must already have registered an account on Realm.
              </p>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Granular Permissions ({newPermissions.length} selected)
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-6 text-[11px] px-2"
                    onClick={() =>
                      setNewPermissions(
                        ALL_AVAILABLE_PERMISSIONS.map((p) => p.id),
                      )
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-6 text-[11px] px-2"
                    onClick={() => setNewPermissions([])}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {PERMISSION_CATEGORIES.map((cat) => {
                  const catPermIds = cat.permissions.map((p) => p.id);
                  const allCatSelected = catPermIds.every((id) =>
                    newPermSet.has(id),
                  );

                  return (
                    <div
                      key={cat.name}
                      className="rounded-lg border border-border p-2.5 bg-muted/15 space-y-2"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-border/40">
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {cat.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {cat.description}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="h-6 text-[10px] px-1.5"
                          onClick={() =>
                            toggleCategoryNewPermissions(catPermIds)
                          }
                        >
                          {allCatSelected ? "Deselect" : "Select"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {cat.permissions.map((perm) => (
                          <div
                            key={perm.id}
                            className="flex items-start space-x-2.5"
                          >
                            <Checkbox
                              id={`perm-${perm.id}`}
                              checked={newPermSet.has(perm.id)}
                              onCheckedChange={() =>
                                toggleNewPermission(perm.id)
                              }
                              className="mt-0.5"
                            />
                            <label
                              htmlFor={`perm-${perm.id}`}
                              className="text-xs font-medium leading-tight cursor-pointer"
                            >
                              <span>{perm.label}</span>
                              <span className="block text-[10px] text-muted-foreground">
                                {perm.description}
                              </span>
                              <span className="block text-[9px] text-muted-foreground/80 font-mono mt-0.5">
                                {perm.id}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(false)}
                disabled={isAdding}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isAdding || !newEmail.trim()}
              >
                {isAdding ? "Onboarding..." : "Add Admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Modal */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Edit Admin Permissions
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update granular capabilities for{" "}
              <span className="font-semibold text-foreground">
                {editTarget?.user?.email}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 flex-1 overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Assigned Permissions ({editPermissions.length} selected)
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="h-6 text-[11px] px-2"
                  onClick={() =>
                    setEditPermissions(
                      ALL_AVAILABLE_PERMISSIONS.map((p) => p.id),
                    )
                  }
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="h-6 text-[11px] px-2"
                  onClick={() => setEditPermissions([])}
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {PERMISSION_CATEGORIES.map((cat) => {
                const catPermIds = cat.permissions.map((p) => p.id);
                const allCatSelected = catPermIds.every((id) =>
                  editPermSet.has(id),
                );

                return (
                  <div
                    key={cat.name}
                    className="rounded-lg border border-border p-2.5 bg-muted/15 space-y-2"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-border/40">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {cat.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {cat.description}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="h-6 text-[10px] px-1.5"
                        onClick={() =>
                          toggleCategoryEditPermissions(catPermIds)
                        }
                      >
                        {allCatSelected ? "Deselect" : "Select"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {cat.permissions.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-start space-x-2.5"
                        >
                          <Checkbox
                            id={`edit-perm-${perm.id}`}
                            checked={editPermSet.has(perm.id)}
                            onCheckedChange={() =>
                              toggleEditPermission(perm.id)
                            }
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`edit-perm-${perm.id}`}
                            className="text-xs font-medium leading-tight cursor-pointer"
                          >
                            <span>{perm.label}</span>
                            <span className="block text-[10px] text-muted-foreground">
                              {perm.description}
                            </span>
                            <span className="block text-[9px] text-muted-foreground/80 font-mono mt-0.5">
                              {perm.id}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditTarget(null)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdatePermissions}
              disabled={isEditing}
            >
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Admin Confirmation Alert Dialog */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Revoke Admin Privileges?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to revoke admin rights for{" "}
              <span className="font-semibold text-foreground">
                {removeTarget?.user?.full_name || removeTarget?.user?.username}{" "}
                ({removeTarget?.user?.email})
              </span>
              ? They will lose access to Command Centre modules immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAdmin}
              disabled={isRemoving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isRemoving ? "Revoking..." : "Revoke Access"}
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
              Revoke {selectedCount} Selected Administrator(s)?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to revoke administrator access for{" "}
              <span className="font-semibold text-foreground">
                {selectedCount}
              </span>{" "}
              selected staff account(s)? They will immediately lose access to
              Realm HQ.
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
                : `Revoke ${selectedCount} Staff Admin(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminsPage() {
  return (
    <DashboardShell>
      <React.Suspense
        fallback={
          <TableSkeleton
            icon={ShieldCheck}
            title="Administrators"
            description="Manage administrator accounts, assign roles, and control access permissions."
            rowCount={8}
            columnCount={5}
          />
        }
      >
        <AdminsContent />
      </React.Suspense>
    </DashboardShell>
  );
}

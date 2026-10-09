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
  CheckCircle2,
  Copy,
  Download,
  Eye,
  KeyRound,
  Link as LinkIcon,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteUser,
  fetchUsers,
  type UserDTO,
  updateUser,
} from "@/lib/api/users";
import { useAuth } from "@/lib/auth/auth-context";

function UsersContent() {
  const router = useRouter();
  const { admin, hasPermission } = useAuth();
  const canManageUsers = admin?.is_superadmin || hasPermission("users:manage");

  const [users, setUsers] = React.useState<UserDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState<string>("all");
  const [twoFactorFilter, setTwoFactorFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Selected User for Detailed Inspection
  const [selectedUser, setSelectedUser] = React.useState<UserDTO | null>(null);

  // User Edit State
  const [editingUser, setEditingUser] = React.useState<UserDTO | null>(null);
  const [editFullName, setEditFullName] = React.useState("");
  const [editUsername, setEditUsername] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editIsActive, setEditIsActive] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Quick Deactivate / Reactivate Confirmation State
  const [userToToggleStatus, setUserToToggleStatus] =
    React.useState<UserDTO | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = React.useState(false);

  // User Deletion State
  const [userToDelete, setUserToDelete] = React.useState<UserDTO | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Bulk Deletion State
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  // Load Users Data
  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers({ limit: 100, offset: 0 });
      setUsers(data.users || []);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load platform users",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Reset pagination on filter change
  React.useEffect(() => {
    void searchQuery;
    void providerFilter;
    void twoFactorFilter;
    void statusFilter;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, providerFilter, twoFactorFilter, statusFilter]);

  const openEditModal = React.useCallback((u: UserDTO) => {
    setEditingUser(u);
    setEditFullName(u.full_name || "");
    setEditUsername(u.username || "");
    setEditEmail(u.email || "");
    setEditIsActive(u.is_active !== false);
  }, []);

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingUser) return;
    if (!editUsername.trim()) {
      toast.error("Username cannot be empty");
      return;
    }
    if (!editEmail.trim()) {
      toast.error("Email address cannot be empty");
      return;
    }

    setIsUpdating(true);
    try {
      await updateUser(editingUser.id, {
        full_name: editFullName.trim(),
        username: editUsername.trim(),
        email: editEmail.trim(),
        is_active: editIsActive,
      });
      toast.success(`User @${editUsername.trim()} updated successfully`);
      setEditingUser(null);
      loadUsers();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update user account",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!userToToggleStatus) return;
    const newActive = userToToggleStatus.is_active === false;
    setIsTogglingStatus(true);
    try {
      await updateUser(userToToggleStatus.id, {
        is_active: newActive,
      });
      toast.success(
        newActive
          ? `User @${userToToggleStatus.username} reactivated successfully`
          : `User @${userToToggleStatus.username} deactivated successfully`,
      );
      setUserToToggleStatus(null);
      loadUsers();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to change account status",
      );
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Filtered dataset
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = u.full_name?.toLowerCase().includes(q);
        const matchesUser = u.username?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        if (!matchesName && !matchesUser && !matchesEmail) return false;
      }

      // Status filter
      if (statusFilter === "active" && u.is_active === false) return false;
      if (statusFilter === "deactivated" && u.is_active !== false) return false;

      // Provider filter
      if (providerFilter !== "all") {
        if (providerFilter === "local") {
          const isLocal =
            u.has_password ||
            u.provider?.toLowerCase() === "local" ||
            u.connected_providers?.some((p) => p.toLowerCase() === "local");
          if (!isLocal) return false;
        } else if (providerFilter === "google") {
          const hasGoogle =
            u.provider?.toLowerCase() === "google" ||
            u.connected_providers?.some((p) => p.toLowerCase() === "google") ||
            u.connected_accounts?.some(
              (a) => a.provider.toLowerCase() === "google",
            );
          if (!hasGoogle) return false;
        } else if (providerFilter === "github") {
          const hasGitHub =
            u.provider?.toLowerCase() === "github" ||
            u.connected_providers?.some((p) => p.toLowerCase() === "github") ||
            u.connected_accounts?.some(
              (a) => a.provider.toLowerCase() === "github",
            );
          if (!hasGitHub) return false;
        }
      }

      // 2FA filter
      if (twoFactorFilter === "enabled" && !u.two_factor_enabled) return false;
      if (twoFactorFilter === "disabled" && u.two_factor_enabled) return false;

      return true;
    });
  }, [users, searchQuery, providerFilter, twoFactorFilter, statusFilter]);

  // Summary Metrics
  const metrics = React.useMemo(() => {
    const total = users.length;
    const with2FA = users.filter((u) => u.two_factor_enabled).length;
    const rate2FA = total > 0 ? Math.round((with2FA / total) * 100) : 0;
    const activeUsers = users.filter((u) => u.is_active !== false).length;
    const deactivatedUsers = total - activeUsers;
    const googleUsers = users.filter(
      (u) =>
        u.provider?.toLowerCase() === "google" ||
        u.connected_providers?.some((p) => p.toLowerCase() === "google") ||
        u.connected_accounts?.some(
          (a) => a.provider.toLowerCase() === "google",
        ),
    ).length;
    const githubUsers = users.filter(
      (u) =>
        u.provider?.toLowerCase() === "github" ||
        u.connected_providers?.some((p) => p.toLowerCase() === "github") ||
        u.connected_accounts?.some(
          (a) => a.provider.toLowerCase() === "github",
        ),
    ).length;
    const oauthUsers = users.filter(
      (u) =>
        (u.provider && u.provider.toLowerCase() !== "local") ||
        (u.connected_providers && u.connected_providers.length > 0) ||
        (u.connected_accounts && u.connected_accounts.length > 0),
    ).length;
    const localUsers = users.filter(
      (u) => u.has_password || u.provider?.toLowerCase() === "local",
    ).length;

    return {
      total,
      with2FA,
      rate2FA,
      activeUsers,
      deactivatedUsers,
      oauthUsers,
      localUsers,
      googleUsers,
      githubUsers,
    };
  }, [users]);

  // Delete Single User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      toast.success(`User ${userToDelete.username} deleted permanently`);
      setUserToDelete(null);
      loadUsers();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete user account",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete Selected Users
  const handleBulkDelete = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedItems = selectedIndices
      .map((idx) => table.getRowModel().rows[idx]?.original)
      .filter(Boolean) as UserDTO[];

    if (!selectedItems.length) return;

    setIsBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        selectedItems.map((item) => deleteUser(item.id)),
      );
      const deletedCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;

      toast.success(`Deleted ${deletedCount} user account(s)`);
      setRowSelection({});
      setBulkDeleteOpen(false);
      loadUsers();
    } catch {
      toast.error("Failed to complete bulk deletion");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Export Users (JSON / CSV)
  const handleExport = (format: "json" | "csv") => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedItems = selectedIndices
      .map((idx) => table.getRowModel().rows[idx]?.original)
      .filter(Boolean) as UserDTO[];
    const exportData = selectedItems.length > 0 ? selectedItems : filteredUsers;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `realm-users-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = [
        "id",
        "username",
        "full_name",
        "email",
        "provider",
        "two_factor_enabled",
        "connected_providers",
        "created_at",
      ];
      const rows = exportData.map((u) => [
        u.id,
        u.username,
        `"${(u.full_name || "").replace(/"/g, '""')}"`,
        u.email,
        u.provider,
        u.two_factor_enabled ? "true" : "false",
        `"${(u.connected_providers || []).join(",")}"`,
        u.created_at,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `realm-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Table Column Definitions
  const columns: ColumnDef<UserDTO>[] = React.useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "user",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="User" />
        ),
        cell: ({ row }) => {
          const u = row.original;
          const initials = (u.full_name || u.username || "U")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 rounded-lg border border-border/60">
                {u.avatar_url && (
                  <AvatarImage src={u.avatar_url} alt={u.username} />
                )}
                <AvatarFallback className="rounded-lg text-xs font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">
                  {u.full_name || u.username}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono truncate">
                  @{u.username}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email Address" />
        ),
        cell: ({ row }) => {
          const email = row.original.email;
          return (
            <div className="flex items-center gap-1.5 group">
              <span className="text-xs text-foreground font-mono">{email}</span>
              <Button
                variant="ghost"
                size="xs"
                className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 transition-opacity"
                onClick={() => {
                  navigator.clipboard.writeText(email);
                  toast.success("Email copied to clipboard");
                }}
                title="Copy email"
              >
                <Copy className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          );
        },
      },
      {
        id: "providers",
        header: "Authentication",
        cell: ({ row }) => {
          const u = row.original;
          const allList: string[] = [];
          if (u.has_password || u.provider?.toLowerCase() === "local") {
            allList.push("Password");
          }
          if (u.provider && u.provider.toLowerCase() !== "local") {
            allList.push(u.provider);
          }
          if (u.connected_providers) {
            for (const p of u.connected_providers) {
              if (p.toLowerCase() !== "local") allList.push(p);
            }
          }
          if (u.connected_accounts) {
            for (const a of u.connected_accounts) {
              if (a.provider && a.provider.toLowerCase() !== "local") {
                allList.push(a.provider);
              }
            }
          }
          const uniqueProviders = Array.from(
            new Set(allList.map((p) => p.toLowerCase())),
          ).map((p) => {
            if (p === "password") return "Password";
            if (p === "github") return "GitHub";
            if (p === "google") return "Google";
            return p.charAt(0).toUpperCase() + p.slice(1);
          });

          return (
            <div className="flex flex-wrap gap-1 items-center">
              {uniqueProviders.map((p) => {
                const isPassword = p === "Password";
                return (
                  <Badge
                    key={p}
                    variant={isPassword ? "outline" : "secondary"}
                    className="text-[10px] font-mono px-1.5 py-0"
                  >
                    {p}
                  </Badge>
                );
              })}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "two_factor_enabled",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Security (2FA)" />
        ),
        cell: ({ row }) => {
          const enabled = row.original.two_factor_enabled;
          return enabled ? (
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[10px] gap-1 px-1.5 py-0"
            >
              <ShieldCheck className="h-3 w-3" /> Enabled
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-border text-muted-foreground text-[10px] gap-1 px-1.5 py-0"
            >
              <ShieldAlert className="h-3 w-3" /> Disabled
            </Badge>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const isActive = row.original.is_active !== false;
          return isActive ? (
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[10px] gap-1 px-1.5 py-0"
            >
              <CheckCircle2 className="h-3 w-3" /> Active
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-destructive/40 text-destructive bg-destructive/10 text-[10px] gap-1 px-1.5 py-0"
            >
              <UserX className="h-3 w-3" /> Deactivated
            </Badge>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Registered" />
        ),
        cell: ({ row }) => {
          const date = new Date(row.original.created_at);
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
              {date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const u = row.original;

          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="xs"
                className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedUser(u)}
                title="View user details"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={() => setSelectedUser(u)}
                    className="text-xs cursor-pointer gap-2"
                  >
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    Inspect Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(u.id);
                      toast.success("User ID copied");
                    }}
                    className="text-xs cursor-pointer gap-2"
                  >
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    Copy User ID
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      router.push(
                        `/admins?prefill=${encodeURIComponent(u.email)}`,
                      );
                    }}
                    className="text-xs cursor-pointer gap-2"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    Grant Admin Role
                  </DropdownMenuItem>

                  {canManageUsers && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openEditModal(u)}
                        className="text-xs cursor-pointer gap-2"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        Edit Account
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setUserToToggleStatus(u)}
                        className={`text-xs cursor-pointer gap-2 ${
                          u.is_active !== false
                            ? "text-amber-500 focus:text-amber-500"
                            : "text-emerald-500 focus:text-emerald-500"
                        }`}
                      >
                        {u.is_active !== false ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            Deactivate Account
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Reactivate Account
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setUserToDelete(u)}
                        className="text-xs cursor-pointer gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete User
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [canManageUsers, router, openEditModal],
  );

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Platform Users
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage registered user accounts, social authentication links,
              security posture, and administrative roles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              disabled={loading}
              className="cursor-pointer gap-1.5 text-xs"
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
                  className="cursor-pointer gap-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onClick={() => handleExport("csv")}
                  className="text-xs cursor-pointer"
                >
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("json")}
                  className="text-xs cursor-pointer"
                >
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Metric Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3.5">
            <CardHeader className="p-0 pb-1 flex flex-row items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Total Users
              </span>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold font-mono tracking-tight">
                {metrics.total}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Registered platform accounts
              </p>
            </CardContent>
          </Card>

          <Card className="p-3.5">
            <CardHeader className="p-0 pb-1 flex flex-row items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                2FA Protection
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold font-mono tracking-tight">
                {metrics.rate2FA}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {metrics.with2FA} accounts secured
              </p>
            </CardContent>
          </Card>

          <Card className="p-3.5">
            <CardHeader className="p-0 pb-1 flex flex-row items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                OAuth Connected
              </span>
              <LinkIcon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold font-mono tracking-tight">
                {metrics.oauthUsers}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Google & GitHub logins
              </p>
            </CardContent>
          </Card>

          <Card className="p-3.5">
            <CardHeader className="p-0 pb-1 flex flex-row items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Active Accounts
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold font-mono tracking-tight">
                {metrics.activeUsers}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {metrics.deactivatedUsers > 0
                  ? `${metrics.deactivatedUsers} deactivated`
                  : "All accounts active"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Directory Table Card */}
        <Card className="overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-border bg-card/40 space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, @username, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Select
                  value={providerFilter}
                  onValueChange={(val) => {
                    if (val) setProviderFilter(val);
                  }}
                >
                  <SelectTrigger
                    aria-label="Filter by authentication provider"
                    className="h-9 w-full sm:w-44 text-xs bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <KeyRound className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground font-normal">
                        Provider:
                      </span>
                      <SelectValue>
                        {(val) => {
                          if (val === "local") {
                            return (
                              <span className="inline-flex items-center gap-1.5 font-medium text-amber-500">
                                <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                                Password
                              </span>
                            );
                          }
                          if (val === "google") {
                            return (
                              <span className="inline-flex items-center gap-1.5 font-medium text-blue-500">
                                <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                                Google
                              </span>
                            );
                          }
                          if (val === "github") {
                            return (
                              <span className="inline-flex items-center gap-1.5 font-medium text-purple-400">
                                <span className="size-1.5 rounded-full bg-purple-400 shrink-0" />
                                GitHub
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
                  <SelectContent align="start" className="min-w-[170px]">
                    <SelectItem value="all" className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                        All Providers ({users.length})
                      </span>
                    </SelectItem>
                    <SelectItem value="local" className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        Local Password ({metrics.localUsers})
                      </span>
                    </SelectItem>
                    <SelectItem value="google" className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-blue-500" />
                        Google Account ({metrics.googleUsers})
                      </span>
                    </SelectItem>
                    <SelectItem value="github" className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-purple-400" />
                        GitHub Account ({metrics.githubUsers})
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    if (val) setStatusFilter(val);
                  }}
                >
                  <SelectTrigger
                    aria-label="Filter by account status"
                    className="h-9 w-full sm:w-36 text-xs bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <SlidersHorizontal className="size-3.5 text-muted-foreground shrink-0" />
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
                          if (val === "deactivated") {
                            return (
                              <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                                <span className="size-1.5 rounded-full bg-destructive shrink-0" />
                                Inactive
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
                        All Status ({users.length})
                      </span>
                    </SelectItem>
                    <SelectItem value="active" className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Active ({metrics.activeUsers})
                      </span>
                    </SelectItem>
                    <SelectItem value="deactivated" className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-destructive" />
                        Deactivated ({metrics.deactivatedUsers})
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={twoFactorFilter}
                  onValueChange={(val) => {
                    if (val) setTwoFactorFilter(val);
                  }}
                >
                  <SelectTrigger
                    aria-label="Filter by two-factor authentication status"
                    className="h-9 w-full sm:w-36 text-xs bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <ShieldCheck className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground font-normal">
                        2FA:
                      </span>
                      <SelectValue>
                        {(val) => {
                          if (val === "enabled") {
                            return (
                              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-500">
                                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                                Enabled
                              </span>
                            );
                          }
                          if (val === "disabled") {
                            return (
                              <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                                <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                                Disabled
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
                        All 2FA States ({users.length})
                      </span>
                    </SelectItem>
                    <SelectItem value="enabled" className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        2FA Enabled ({metrics.with2FA})
                      </span>
                    </SelectItem>
                    <SelectItem value="disabled" className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                        2FA Disabled ({users.length - metrics.with2FA})
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {(searchQuery ||
                  providerFilter !== "all" ||
                  twoFactorFilter !== "all" ||
                  statusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setProviderFilter("all");
                      setTwoFactorFilter("all");
                      setStatusFilter("all");
                    }}
                    className="h-9 text-xs px-2.5 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="text-xs">
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
                  ) : table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-2.5">
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
                        No users found matching your search criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Component */}
            <DataTablePagination
              table={table}
              totalCount={filteredUsers.length}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </CardContent>
        </Card>

        {/* Bulk Action Bar */}
        <DataTableBulkActions
          selectedCount={selectedCount}
          totalCount={filteredUsers.length}
          onClearSelection={() => setRowSelection({})}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          {canManageUsers && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={isBulkDeleting}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected
            </Button>
          )}
        </DataTableBulkActions>
      </div>

      {/* User Inspection Modal */}
      <Dialog
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Profile Overview
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete account metadata and linked social authentication
              identities.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-2 text-xs">
              {/* Profile Card */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                <Avatar className="h-12 w-12 rounded-lg border border-border">
                  {selectedUser.avatar_url && (
                    <AvatarImage
                      src={selectedUser.avatar_url}
                      alt={selectedUser.username}
                    />
                  )}
                  <AvatarFallback className="rounded-lg text-sm font-semibold bg-primary/10 text-primary">
                    {(selectedUser.full_name || selectedUser.username)
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {selectedUser.full_name || selectedUser.username}
                  </p>
                  <p className="text-muted-foreground font-mono">
                    @{selectedUser.username}
                  </p>
                </div>
              </div>

              {/* Account Details Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                    Account ID
                  </span>
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono text-[11px] truncate"
                      title={selectedUser.id}
                    >
                      {selectedUser.id.slice(0, 13)}...
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-5 w-5 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedUser.id);
                        toast.success("ID copied");
                      }}
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                    Primary Email
                  </span>
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono text-[11px] truncate"
                      title={selectedUser.email}
                    >
                      {selectedUser.email}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-5 w-5 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedUser.email);
                        toast.success("Email copied");
                      }}
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                    Two-Factor Auth
                  </span>
                  <div>
                    {selectedUser.two_factor_enabled ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[10px] gap-1 px-1.5 py-0"
                      >
                        <ShieldCheck className="h-3 w-3" /> Enabled
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-border text-muted-foreground text-[10px] gap-1 px-1.5 py-0"
                      >
                        <ShieldAlert className="h-3 w-3" /> Disabled
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                    Password Protected
                  </span>
                  <div>
                    {selectedUser.has_password ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] gap-1 px-1.5 py-0"
                      >
                        <Check className="h-3 w-3 text-primary" /> Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-muted-foreground px-1.5 py-0"
                      >
                        OAuth Only
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Connected OAuth Accounts */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground block">
                  Connected Social Accounts
                </span>
                {selectedUser.connected_accounts?.length ? (
                  <div className="space-y-1.5">
                    {selectedUser.connected_accounts.map((acc, i) => (
                      <div
                        key={`${acc.provider}-${i}`}
                        className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/10"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-mono"
                          >
                            {acc.provider}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {acc.email || "No email disclosed"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-[11px]">
                    No external social providers linked.
                  </p>
                )}
              </div>

              {/* Timestamps */}
              <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between">
                <span>
                  Registered:{" "}
                  {new Date(selectedUser.created_at).toLocaleDateString()}
                </span>
                <span>
                  Updated:{" "}
                  {new Date(selectedUser.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-2">
              {canManageUsers && selectedUser && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const u = selectedUser;
                      setSelectedUser(null);
                      openEditModal(u);
                    }}
                    className="text-xs gap-1.5 cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Account
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const u = selectedUser;
                      setSelectedUser(null);
                      setUserToToggleStatus(u);
                    }}
                    className={`text-xs gap-1.5 cursor-pointer ${
                      selectedUser.is_active !== false
                        ? "text-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                        : "text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10"
                    }`}
                  >
                    {selectedUser.is_active !== false ? (
                      <>
                        <UserX className="h-3.5 w-3.5" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        Reactivate
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedUser(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Account Modal */}
      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" />
                Edit User Account
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update account details and manage login privileges for @
                {editingUser?.username}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="edit-fullname" className="text-xs">
                  Full Name
                </Label>
                <Input
                  id="edit-fullname"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-username" className="text-xs">
                  Username
                </Label>
                <Input
                  id="edit-username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="username"
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-xs">
                  Email Address
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              {/* Status Toggle Card */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs text-foreground">
                      Account Status
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        editIsActive
                          ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                          : "border-destructive/40 text-destructive bg-destructive/10"
                      }`}
                    >
                      {editIsActive ? "Active" : "Deactivated"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {editIsActive
                      ? "User is authorized to sign in and interact on Realm."
                      : "User is deactivated and barred from logging in."}
                  </p>
                </div>
                <Switch
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
                  aria-label="Toggle user active status"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingUser(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUpdating}
                className="gap-1.5 cursor-pointer"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate / Reactivate User Confirmation Dialog */}
      <AlertDialog
        open={!!userToToggleStatus}
        onOpenChange={(open) => !open && setUserToToggleStatus(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {userToToggleStatus?.is_active !== false ? (
                <>
                  <UserX className="h-5 w-5 text-amber-500" />
                  Deactivate User Account?
                </>
              ) : (
                <>
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                  Reactivate User Account?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {userToToggleStatus?.is_active !== false ? (
                <>
                  Are you sure you want to deactivate{" "}
                  <span className="font-semibold text-foreground">
                    @{userToToggleStatus?.username} ({userToToggleStatus?.email}
                    )
                  </span>
                  ? They will immediately be barred from signing in, commenting,
                  and performing actions on the platform until reactivated.
                </>
              ) : (
                <>
                  Are you sure you want to reactivate{" "}
                  <span className="font-semibold text-foreground">
                    @{userToToggleStatus?.username} ({userToToggleStatus?.email}
                    )
                  </span>
                  ? This will restore their ability to log in and access Realm.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTogglingStatus}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggleStatus}
              disabled={isTogglingStatus}
              className={
                userToToggleStatus?.is_active !== false
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {isTogglingStatus
                ? "Processing..."
                : userToToggleStatus?.is_active !== false
                  ? "Deactivate Account"
                  : "Reactivate Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete User Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                @{userToDelete?.username} ({userToDelete?.email})
              </span>
              ? This action will permanently remove their profile and
              cascade-delete their comments, reactions, and login sessions. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Alert Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Bulk Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              You are about to permanently delete{" "}
              <span className="font-semibold text-foreground">
                {selectedCount}
              </span>{" "}
              user account(s). All associated comments, reactions, and
              authentication tokens will be purged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isBulkDeleting ? "Deleting..." : "Delete Selected Users"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function UsersPage() {
  return (
    <DashboardShell>
      <React.Suspense
        fallback={
          <TableSkeleton
            icon={Users}
            title="Platform Users"
            description="Manage registered user accounts, inspect provider identities, and control status."
            rowCount={8}
            columnCount={6}
          />
        }
      >
        <UsersContent />
      </React.Suspense>
    </DashboardShell>
  );
}

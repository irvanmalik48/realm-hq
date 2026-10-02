"use client";

import {
  AlertTriangle,
  Edit2,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth/auth-context";

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

const AVAILABLE_PERMISSIONS = [
  { id: "storage:write", label: "Upload & Modify Storage" },
  { id: "storage:delete", label: "Delete Storage Objects" },
  { id: "comments:moderate", label: "Moderate & Edit Comments" },
  { id: "tokens:manage", label: "Issue & Revoke API Tokens" },
  { id: "logs:delete", label: "Purge System Logs" },
  { id: "system:telemetry", label: "Inspect Telemetry & DBPool" },
];

export default function AdminsPage() {
  const { admin: currentAdmin } = useAuth();
  const [admins, setAdmins] = React.useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Add Admin modal
  const [addOpen, setAddOpen] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");
  const [newPermissions, setNewPermissions] = React.useState<string[]>([]);
  const [isAdding, setIsAdding] = React.useState(false);

  // Edit Permissions modal
  const [editTarget, setEditTarget] = React.useState<AdminUserRecord | null>(
    null,
  );
  const [editPermissions, setEditPermissions] = React.useState<string[]>([]);
  const [isEditing, setIsEditing] = React.useState(false);

  // Remove Admin dialog
  const [removeTarget, setRemoveTarget] =
    React.useState<AdminUserRecord | null>(null);
  const [isRemoving, setIsRemoving] = React.useState(false);

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

  const toggleEditPermission = (permId: string) => {
    setEditPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId],
    );
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

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to onboard admin");

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

      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to update permissions");

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

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to revoke admin");

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

  if (!currentAdmin?.is_superadmin) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto space-y-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Superadmin Access Required
          </h2>
          <p className="text-xs text-muted-foreground">
            Only designated site superadmins configured via the server
            environment can manage administrators and modify atomic RBAC roles.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Admin Management &amp; RBAC
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Seed superadmins and grant atomic, granular permissions to
              authorized staff.
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Admin Roster Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Authorized Administrators
            </CardTitle>
            <CardDescription className="text-xs">
              Staff accounts with elevated access to Command Centre modules
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 border-t border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User / Account</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Granular Permissions</TableHead>
                  <TableHead>Assigned On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length ? (
                  admins.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {item.user?.full_name || item.user?.username}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {item.user?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.is_superadmin ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px] gap-1 px-1.5 py-0"
                          >
                            <ShieldCheck className="h-3 w-3" /> Superadmin
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] gap-1 px-1.5 py-0"
                          >
                            <UserCheck className="h-3 w-3" /> Staff Admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.is_superadmin ? (
                          <span className="text-xs text-muted-foreground font-mono italic">
                            Full Root Access (*)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {item.permissions?.length ? (
                              item.permissions.map((p) => (
                                <Badge
                                  key={p}
                                  variant="outline"
                                  className="text-[10px] font-mono px-1.5 py-0"
                                >
                                  {p}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                None
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {!item.is_superadmin && (
                          <div className="flex items-center justify-end gap-1">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRemoveTarget(item)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
                              title="Revoke Admin Access"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-xs text-muted-foreground"
                    >
                      {loading
                        ? "Loading administrators..."
                        : "No administrators registered."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Administrator Modal */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Add New Administrator
              </DialogTitle>
              <DialogDescription className="text-xs">
                Look up an existing registered user by email and assign granular
                permissions.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddAdmin} className="space-y-4 py-2">
              <div className="space-y-1.5">
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

              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  Granular Permissions
                </Label>
                <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/20">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <div key={perm.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`new-${perm.id}`}
                        checked={newPermissions.includes(perm.id)}
                        onCheckedChange={() => toggleNewPermission(perm.id)}
                      />
                      <label
                        htmlFor={`new-${perm.id}`}
                        className="text-xs text-foreground cursor-pointer select-none font-medium"
                      >
                        {perm.label}{" "}
                        <span className="text-[10px] text-muted-foreground font-mono font-normal">
                          ({perm.id})
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
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
                  {isAdding ? "Onboarding..." : "Grant Admin Access"}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Edit Admin Permissions
              </DialogTitle>
              <DialogDescription className="text-xs">
                Atomically update permission scopes for{" "}
                {editTarget?.user?.email}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  Granted Permissions
                </Label>
                <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/20">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <div key={perm.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${perm.id}`}
                        checked={editPermissions.includes(perm.id)}
                        onCheckedChange={() => toggleEditPermission(perm.id)}
                      />
                      <label
                        htmlFor={`edit-${perm.id}`}
                        className="text-xs text-foreground cursor-pointer select-none font-medium"
                      >
                        {perm.label}{" "}
                        <span className="text-[10px] text-muted-foreground font-mono font-normal">
                          ({perm.id})
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
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
                {isEditing ? "Saving..." : "Save Permissions"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke Admin Alert Dialog */}
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
                Are you sure you want to remove administrator rights from{" "}
                <span className="font-semibold text-foreground">
                  {removeTarget?.user?.email}
                </span>
                ? They will lose all access to Realm HQ.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRemoving}>
                Cancel
              </AlertDialogCancel>
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
      </div>
    </DashboardShell>
  );
}

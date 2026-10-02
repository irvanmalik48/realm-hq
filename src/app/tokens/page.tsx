"use client";

import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Gauge,
  Key,
  KeyRound,
  Plus,
  RefreshCw,
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

export default function TokensPage() {
  const [tokens, setTokens] = React.useState<APITokenItem[]>([]);
  const [loading, setLoading] = React.useState(true);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
    toast.success("Token copied to clipboard");
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              API Tokens &amp; Keys
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Issue and revoke cryptographic tokens with rate limiting and
              scoped permissions.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
                This secret will never be shown again. Save it in your
                environment configuration now.
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

        {/* Tokens List Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Registered API Tokens
            </CardTitle>
            <CardDescription className="text-xs">
              Active and revoked credentials with rate limit envelopes
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 border-t border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Identifier</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.length ? (
                  tokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell className="font-semibold text-xs text-foreground">
                        {token.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {token.token_prefix}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {token.scopes?.map((sc) => (
                            <Badge
                              key={sc}
                              variant="outline"
                              className="font-mono text-[10px] px-1.5 py-0"
                            >
                              {sc}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <Gauge className="h-3 w-3" />
                          {token.rate_limit_rpm} RPM
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {token.last_used_at ? (
                          new Date(token.last_used_at).toLocaleString()
                        ) : (
                          <span className="italic">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {token.is_revoked ? (
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
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!token.is_revoked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRevokeTarget(token)}
                            className="h-8 px-2 text-xs text-destructive hover:text-destructive cursor-pointer"
                            title="Revoke Token"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-xs text-muted-foreground"
                    >
                      {loading
                        ? "Loading API tokens..."
                        : "No tokens registered."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Generate Token Modal */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">Generate API Token</DialogTitle>
              <DialogDescription className="text-xs">
                Create a high-entropy secret token for programmatic gRPC / REST
                authentication.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="token-name" className="text-xs font-semibold">
                  Token Name / Client Description
                </Label>
                <Input
                  id="token-name"
                  placeholder="e.g. Next.js Static Worker"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="token-scope" className="text-xs font-semibold">
                  Permission Scopes
                </Label>
                <Select
                  value={scopeOption}
                  onValueChange={(val) => {
                    if (val) setScopeOption(val);
                  }}
                >
                  <SelectTrigger id="token-scope" className="text-xs h-9">
                    <SelectValue placeholder="Select scopes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">Full Access (*)</SelectItem>
                    <SelectItem value="storage:read,storage:write">
                      Storage Read &amp; Write
                    </SelectItem>
                    <SelectItem value="comments:moderate">
                      Comment Moderation
                    </SelectItem>
                    <SelectItem value="telemetry:read">
                      Telemetry Monitoring
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rate-limit" className="text-xs font-semibold">
                    Rate Limit (RPM)
                  </Label>
                  <Input
                    id="rate-limit"
                    type="number"
                    min="1"
                    max="10000"
                    value={rateLimitRpm}
                    onChange={(e) => setRateLimitRpm(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="token-expiry"
                    className="text-xs font-semibold"
                  >
                    Lifespan Expiry
                  </Label>
                  <Select
                    value={expiryOption}
                    onValueChange={(val) => {
                      if (val) setExpiryOption(val);
                    }}
                  >
                    <SelectTrigger id="token-expiry" className="text-xs h-9">
                      <SelectValue placeholder="Select expiry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Never Expires</SelectItem>
                      <SelectItem value="2592000">30 Days</SelectItem>
                      <SelectItem value="7776000">90 Days</SelectItem>
                      <SelectItem value="31536000">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
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
                  {isCreating ? "Generating..." : "Generate Secret"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Revoke Confirmation Dialog */}
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
                Are you sure you want to revoke token{" "}
                <span className="font-semibold text-foreground">
                  {revokeTarget?.name}
                </span>
                ? Any client using this token will immediately receive HTTP 401
                / gRPC Unauthenticated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRevoking}>
                Cancel
              </AlertDialogCancel>
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
      </div>
    </DashboardShell>
  );
}

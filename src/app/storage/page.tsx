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
  Check,
  Cloud,
  Copy,
  ExternalLink,
  FileIcon,
  HardDrive,
  Key,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Trash2,
  TrendingDown,
  UploadCloud,
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

interface FileItem {
  id: string;
  filename: string;
  content_type: string;
  original_size: number;
  compressed_size: number;
  savings_percent: number;
  sha256: string;
  blurhash?: string;
  width?: number;
  height?: number;
  url: string;
  webp_url?: string;
  storage_backend: string;
  s3_bucket?: string;
  s3_key?: string;
  s3_etag?: string;
  created_at: string;
}

interface StorageStats {
  active_backend: string;
  total_files: number;
  total_original_bytes: number;
  total_compressed_bytes: number;
  average_savings_percent: number;
  s3_bucket_name?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

export default function StoragePage() {
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [stats, setStats] = React.useState<StorageStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [backendFilter, setBackendFilter] = React.useState<string>("all");

  // Upload modal
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  // Presign modal
  const [presignTarget, setPresignTarget] = React.useState<FileItem | null>(
    null,
  );
  const [presignExpiry, setPresignExpiry] = React.useState("3600");
  const [presignedUrl, setPresignedUrl] = React.useState("");
  const [isGeneratingPresign, setIsGeneratingPresign] = React.useState(false);
  const [copiedPresign, setCopiedPresign] = React.useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchFiles = React.useCallback(async () => {
    setLoading(true);
    try {
      const backendQuery =
        backendFilter !== "all" ? `&backend=${backendFilter}` : "";
      const fetchJson = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      };
      const [filesRes, statsRes] = await Promise.all([
        fetchJson(`/api/storage?limit=100${backendQuery}`),
        fetchJson("/api/storage?type=stats"),
      ]);

      if (filesRes.files) {
        setFiles(filesRes.files);
      }
      if (!statsRes.error) {
        setStats(statsRes);
      }
    } catch {
      toast.error("Failed to load storage files");
    } finally {
      setLoading(false);
    }
  }, [backendFilter]);

  React.useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/storage", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      toast.success("File uploaded & compressed successfully", {
        description: `Saved ${json.file?.savings_percent?.toFixed(1) || 0}% via Zstandard`,
      });

      setUploadOpen(false);
      setSelectedFile(null);
      fetchFiles();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGeneratePresignedUrl = async () => {
    if (!presignTarget) return;
    setIsGeneratingPresign(true);
    try {
      const res = await fetch("/api/storage/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: presignTarget.id,
          expiry_seconds: parseInt(presignExpiry, 10),
        }),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to generate presigned URL");

      setPresignedUrl(json.presigned_url);
      toast.success("Presigned URL Generated");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Presigned URL generation failed",
      );
    } finally {
      setIsGeneratingPresign(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/storage?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      toast.success("File deleted successfully");
      setDeleteTarget(null);
      fetchFiles();
    } catch {
      toast.error("Failed to delete file");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPresign(true);
    setTimeout(() => setCopiedPresign(false), 2000);
    toast.success("Copied to clipboard");
  };

  const columns: ColumnDef<FileItem>[] = [
    {
      accessorKey: "filename",
      header: "File",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col truncate max-w-[200px]">
            <span
              className="text-xs font-semibold text-foreground truncate"
              title={row.original.filename}
            >
              {row.original.filename}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {row.original.content_type}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "storage_backend",
      header: "Backend",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`text-[10px] uppercase font-mono px-1.5 py-0 gap-1 ${
            row.original.storage_backend === "s3"
              ? "border-sky-500/40 text-sky-500 bg-sky-500/5"
              : "border-border text-muted-foreground"
          }`}
        >
          {row.original.storage_backend === "s3" ? (
            <>
              <Cloud className="h-2.5 w-2.5" /> S3
            </>
          ) : (
            <>
              <Server className="h-2.5 w-2.5" /> Local
            </>
          )}
        </Badge>
      ),
    },
    {
      accessorKey: "original_size",
      header: "Sizes",
      cell: ({ row }) => (
        <div className="flex flex-col text-xs">
          <span className="text-foreground font-medium">
            {formatBytes(row.original.compressed_size)}
          </span>
          <span className="text-[10px] text-muted-foreground line-through">
            {formatBytes(row.original.original_size)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "savings_percent",
      header: "Savings",
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
          <TrendingDown className="h-3 w-3" />
          {row.original.savings_percent
            ? `${row.original.savings_percent.toFixed(1)}%`
            : "0%"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {row.original.storage_backend === "s3" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPresignTarget(row.original);
                setPresignedUrl("");
              }}
              className="h-8 w-8 p-0 cursor-pointer"
              title="Generate S3 Presigned URL"
            >
              <Key className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(row.original)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
            title="Delete File"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: files,
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
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Storage &amp; S3 Object Explorer
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Dual-engine storage management with real-time Zstd compression and
              presigned URL access.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFiles}
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
              onClick={() => setUploadOpen(true)}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <UploadCloud className="h-4 w-4" />
              Upload Object
            </Button>
          </div>
        </div>

        {/* Storage Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Active Engine
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className="font-mono text-xs uppercase px-2 py-0.5"
              >
                {stats?.active_backend === "s3"
                  ? "AWS S3 / R2"
                  : "Local Disk (Zstd)"}
              </Badge>
            </div>
            {stats?.s3_bucket_name && (
              <span className="text-[11px] text-muted-foreground mt-1 block truncate">
                Bucket: {stats.s3_bucket_name}
              </span>
            )}
          </Card>

          <Card className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Total Files
            </span>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {stats?.total_files ?? 0}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Indexed records
            </span>
          </Card>

          <Card className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Compressed Volume
            </span>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {formatBytes(stats?.total_compressed_bytes || 0)}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Original: {formatBytes(stats?.total_original_bytes || 0)}
            </span>
          </Card>

          <Card className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Average Savings
            </span>
            <div className="text-2xl font-bold mt-1 text-emerald-500">
              {stats?.average_savings_percent
                ? `${stats.average_savings_percent.toFixed(1)}%`
                : "0%"}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Compression ratio
            </span>
          </Card>
        </div>

        {/* Explorer Table Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search objects..."
                    value={globalFilter ?? ""}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-8 text-sm h-9"
                  />
                </div>

                <Select
                  value={backendFilter}
                  onValueChange={(val) => {
                    if (val) setBackendFilter(val);
                  }}
                >
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue placeholder="All engines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Engines</SelectItem>
                    <SelectItem value="s3">S3 Backend</SelectItem>
                    <SelectItem value="local">Local Disk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground">
                Showing {table.getRowModel().rows.length} of {files.length}{" "}
                objects
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
                        ? "Loading storage records..."
                        : "No objects stored yet."}
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

        {/* Upload Modal */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">Upload Object</DialogTitle>
              <DialogDescription className="text-xs">
                Upload files with transparent Zstandard compression to the
                active backend.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpload} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="file-input" className="text-xs font-semibold">
                  Choose File
                </Label>
                <Input
                  id="file-input"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="cursor-pointer file:cursor-pointer"
                  disabled={isUploading}
                />
                {selectedFile && (
                  <p className="text-[11px] text-muted-foreground">
                    Selected: {selectedFile.name} (
                    {formatBytes(selectedFile.size)})
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs flex items-center justify-between">
                <span className="text-muted-foreground">
                  Active Storage Destination:
                </span>
                <span className="font-mono font-semibold uppercase">
                  {stats?.active_backend === "s3"
                    ? "AWS S3 / R2"
                    : "Local Disk"}
                </span>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!selectedFile || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Compressing &amp; Uploading...
                    </>
                  ) : (
                    "Upload File"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Generate Presigned URL Dialog */}
        <Dialog
          open={!!presignTarget}
          onOpenChange={(open) => !open && setPresignTarget(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Generate S3 Presigned URL
              </DialogTitle>
              <DialogDescription className="text-xs">
                Generate a temporary signed URL allowing direct download from
                S3.
              </DialogDescription>
            </DialogHeader>

            {presignTarget && (
              <div className="space-y-4 py-2">
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs flex justify-between items-center">
                  <span className="font-semibold text-foreground truncate max-w-[260px]">
                    {presignTarget.filename}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {presignTarget.s3_bucket || "S3"}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expiry" className="text-xs font-semibold">
                    Link Expiry (TTL)
                  </Label>
                  <Select
                    value={presignExpiry}
                    onValueChange={(val) => {
                      if (val) setPresignExpiry(val);
                    }}
                  >
                    <SelectTrigger id="expiry" className="text-xs h-9">
                      <SelectValue placeholder="Select TTL" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="900">15 minutes</SelectItem>
                      <SelectItem value="3600">1 hour (Standard)</SelectItem>
                      <SelectItem value="86400">24 hours</SelectItem>
                      <SelectItem value="604800">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {presignedUrl ? (
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-semibold">
                      Generated URL
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={presignedUrl}
                        className="font-mono text-xs h-9 truncate"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(presignedUrl)}
                        className="shrink-0 h-9"
                        aria-label="Copy presigned URL"
                      >
                        {copiedPresign ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <a
                        href={presignedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input hover:bg-muted text-muted-foreground hover:text-foreground"
                        aria-label="Open presigned URL in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresignTarget(null)}
              >
                Close
              </Button>
              {!presignedUrl && (
                <Button
                  size="sm"
                  onClick={handleGeneratePresignedUrl}
                  disabled={isGeneratingPresign}
                >
                  {isGeneratingPresign ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    "Generate Signed URL"
                  )}
                </Button>
              )}
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
                Delete Object?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  {deleteTarget?.filename}
                </span>
                ? This will permanently erase the object from{" "}
                <span className="font-mono text-foreground font-semibold">
                  {deleteTarget?.storage_backend === "s3"
                    ? "AWS S3"
                    : "local storage"}
                </span>
                .
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

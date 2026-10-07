"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowUpDown,
  Check,
  ChevronRight,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileIcon,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Key,
  Layers,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Lock,
  Music,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingDown,
  UploadCloud,
  Video,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/data-table";
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
import { Card } from "@/components/ui/card";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes } from "@/lib/utils";

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
  total_files: number | string;
  total_original_bytes: number | string;
  total_compressed_bytes: number | string;
  average_savings_percent: number;
  s3_bucket_name?: string;
}

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "avif",
]);
const DOC_EXTENSIONS = new Set([
  "pdf",
  "txt",
  "md",
  "json",
  "csv",
  "xml",
  "log",
  "yaml",
  "yml",
]);
const MEDIA_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "flac",
  "ogg",
  "mp4",
  "webm",
  "mkv",
  "mov",
]);
const ARCHIVE_EXTENSIONS = new Set([
  "zip",
  "tar",
  "gz",
  "zst",
  "7z",
  "rar",
  "bz2",
]);

function getFileVisual(mime: string, filename: string) {
  const m = (mime || "").toLowerCase();
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (m.startsWith("image/") || IMAGE_EXTENSIONS.has(ext)) {
    return {
      type: "image",
      icon: FileImage,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
      badge: "Image",
    };
  }
  if (
    m.includes("pdf") ||
    m.includes("text") ||
    m.includes("markdown") ||
    m.includes("json") ||
    m.includes("csv") ||
    m.includes("xml") ||
    DOC_EXTENSIONS.has(ext)
  ) {
    return {
      type: "document",
      icon: FileText,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      badge: "Document",
    };
  }
  if (
    m.startsWith("audio/") ||
    m.startsWith("video/") ||
    MEDIA_EXTENSIONS.has(ext)
  ) {
    return {
      type: "media",
      icon: m.startsWith("video/") ? Video : Music,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      badge: "Media",
    };
  }
  if (
    m.includes("zip") ||
    m.includes("tar") ||
    m.includes("gzip") ||
    m.includes("zstd") ||
    ARCHIVE_EXTENSIONS.has(ext)
  ) {
    return {
      type: "archive",
      icon: FileArchive,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      badge: "Archive",
    };
  }
  return {
    type: "other",
    icon: FileIcon,
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    badge: ext.toUpperCase() || "File",
  };
}

function StorageContent() {
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [stats, setStats] = React.useState<StorageStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [backendFilter, setBackendFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("newest");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });

  React.useEffect(() => {
    void backendFilter;
    void categoryFilter;
    void globalFilter;
    void sortBy;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [backendFilter, categoryFilter, globalFilter, sortBy]);

  // Inspector sheet
  const [activeInspector, setActiveInspector] = React.useState<FileItem | null>(
    null,
  );

  // Upload modal & drag drop
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragCounter = React.useRef(0);

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

  const uploadSingleFile = async (file: File) => {
    setIsUploading(true);
    const toastId = toast.loading(`Uploading & compressing ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/storage", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      toast.success("File uploaded & compressed successfully", {
        id: toastId,
        description: `Saved ${json.file?.savings_percent?.toFixed(1) || 0}% via Zstandard`,
      });

      setUploadOpen(false);
      setSelectedFile(null);
      fetchFiles();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload file",
        { id: toastId },
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    await uploadSingleFile(selectedFile);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      await uploadSingleFile(droppedFiles[0]);
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
      if (activeInspector?.id === deleteTarget.id) {
        setActiveInspector(null);
      }
      toast.success("File deleted successfully");
      setDeleteTarget(null);
      fetchFiles();
    } catch {
      toast.error("Failed to delete file");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = React.useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPresign(true);
    setTimeout(() => setCopiedPresign(false), 2000);
    toast.success("Copied to clipboard");
  }, []);

  const copyFileUrl = React.useCallback((file: FileItem) => {
    const fullUrl = `http://localhost:8080${file.url}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Public URL copied to clipboard");
  }, []);

  const handleDownload = React.useCallback((file: FileItem) => {
    const downloadUrl = `http://localhost:8080${file.url}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${file.filename}`);
  }, []);

  // Metrics computation
  const totalFiles = Number(stats?.total_files || 0);
  const totalOriginalBytes = Number(stats?.total_original_bytes || 0);
  const totalCompressedBytes = Number(stats?.total_compressed_bytes || 0);
  const averageSavings = Number(stats?.average_savings_percent || 0);

  const bytesSaved = Math.max(0, totalOriginalBytes - totalCompressedBytes);
  const compressionRatio =
    totalCompressedBytes > 0
      ? (totalOriginalBytes / totalCompressedBytes).toFixed(2)
      : averageSavings > 0
        ? (100 / Math.max(1, 100 - averageSavings)).toFixed(2)
        : "1.00";

  // Category counts & volume
  const fileBreakdown = React.useMemo(() => {
    const images = { count: 0, compressed: 0, original: 0 };
    const docs = { count: 0, compressed: 0, original: 0 };
    const media = { count: 0, compressed: 0, original: 0 };
    const archives = { count: 0, compressed: 0, original: 0 };
    const others = { count: 0, compressed: 0, original: 0 };

    for (const f of files) {
      const mime = (f.content_type || "").toLowerCase();
      const ext = f.filename.split(".").pop()?.toLowerCase() || "";
      const comp = Number(f.compressed_size || 0);
      const orig = Number(f.original_size || 0);

      if (mime.startsWith("image/") || IMAGE_EXTENSIONS.has(ext)) {
        images.count++;
        images.compressed += comp;
        images.original += orig;
      } else if (
        mime.includes("pdf") ||
        mime.includes("text") ||
        mime.includes("json") ||
        mime.includes("markdown") ||
        mime.includes("csv") ||
        mime.includes("xml") ||
        DOC_EXTENSIONS.has(ext)
      ) {
        docs.count++;
        docs.compressed += comp;
        docs.original += orig;
      } else if (
        mime.startsWith("audio/") ||
        mime.startsWith("video/") ||
        MEDIA_EXTENSIONS.has(ext)
      ) {
        media.count++;
        media.compressed += comp;
        media.original += orig;
      } else if (
        mime.includes("zip") ||
        mime.includes("tar") ||
        mime.includes("gzip") ||
        mime.includes("zstd") ||
        ARCHIVE_EXTENSIONS.has(ext)
      ) {
        archives.count++;
        archives.compressed += comp;
        archives.original += orig;
      } else {
        others.count++;
        others.compressed += comp;
        others.original += orig;
      }
    }

    const totalCalculatedBytes =
      images.compressed +
      docs.compressed +
      media.compressed +
      archives.compressed +
      others.compressed;

    return [
      {
        id: "image",
        label: "Images",
        count: images.count,
        compressedBytes: images.compressed,
        originalBytes: images.original,
        percentage:
          totalCalculatedBytes > 0
            ? Math.round((images.compressed / totalCalculatedBytes) * 100)
            : 0,
        color: "bg-sky-500",
        textColor: "text-sky-400",
        borderActive: "border-sky-500/50 bg-sky-500/10",
        icon: FileImage,
      },
      {
        id: "doc",
        label: "Documents",
        count: docs.count,
        compressedBytes: docs.compressed,
        originalBytes: docs.original,
        percentage:
          totalCalculatedBytes > 0
            ? Math.round((docs.compressed / totalCalculatedBytes) * 100)
            : 0,
        color: "bg-indigo-500",
        textColor: "text-indigo-400",
        borderActive: "border-indigo-500/50 bg-indigo-500/10",
        icon: FileText,
      },
      {
        id: "media",
        label: "Media",
        count: media.count,
        compressedBytes: media.compressed,
        originalBytes: media.original,
        percentage:
          totalCalculatedBytes > 0
            ? Math.round((media.compressed / totalCalculatedBytes) * 100)
            : 0,
        color: "bg-amber-500",
        textColor: "text-amber-400",
        borderActive: "border-amber-500/50 bg-amber-500/10",
        icon: Sparkles,
      },
      {
        id: "archive",
        label: "Archives",
        count: archives.count,
        compressedBytes: archives.compressed,
        originalBytes: archives.original,
        percentage:
          totalCalculatedBytes > 0
            ? Math.round((archives.compressed / totalCalculatedBytes) * 100)
            : 0,
        color: "bg-purple-500",
        textColor: "text-purple-400",
        borderActive: "border-purple-500/50 bg-purple-500/10",
        icon: FileArchive,
      },
      {
        id: "other",
        label: "Other Objects",
        count: others.count,
        compressedBytes: others.compressed,
        originalBytes: others.original,
        percentage:
          totalCalculatedBytes > 0
            ? Math.round((others.compressed / totalCalculatedBytes) * 100)
            : 0,
        color: "bg-zinc-500",
        textColor: "text-zinc-400",
        borderActive: "border-zinc-500/50 bg-zinc-500/10",
        icon: Layers,
      },
    ];
  }, [files]);

  // Filtering & Sorting
  const filteredAndSortedFiles = React.useMemo(() => {
    return files
      .filter((file) => {
        // Backend filter
        if (backendFilter !== "all" && file.storage_backend !== backendFilter) {
          return false;
        }

        // Category filter
        if (categoryFilter !== "all") {
          const mime = (file.content_type || "").toLowerCase();
          const ext = file.filename.split(".").pop()?.toLowerCase() || "";
          if (
            categoryFilter === "image" &&
            !mime.startsWith("image/") &&
            !IMAGE_EXTENSIONS.has(ext)
          ) {
            return false;
          }
          if (
            categoryFilter === "doc" &&
            !mime.includes("pdf") &&
            !mime.includes("text") &&
            !mime.includes("json") &&
            !mime.includes("markdown") &&
            !mime.includes("csv") &&
            !mime.includes("xml") &&
            !DOC_EXTENSIONS.has(ext)
          ) {
            return false;
          }
          if (
            categoryFilter === "media" &&
            !mime.startsWith("audio/") &&
            !mime.startsWith("video/") &&
            !MEDIA_EXTENSIONS.has(ext)
          ) {
            return false;
          }
          if (
            categoryFilter === "archive" &&
            !mime.includes("zip") &&
            !mime.includes("tar") &&
            !mime.includes("gzip") &&
            !mime.includes("zstd") &&
            !ARCHIVE_EXTENSIONS.has(ext)
          ) {
            return false;
          }
        }

        // Global search filter
        if (globalFilter.trim()) {
          const q = globalFilter.toLowerCase();
          const matchesName = file.filename.toLowerCase().includes(q);
          const matchesMime = file.content_type.toLowerCase().includes(q);
          const matchesSha = (file.sha256 || "").toLowerCase().includes(q);
          return matchesName || matchesMime || matchesSha;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
        if (sortBy === "oldest") {
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
        if (sortBy === "name") {
          return a.filename.localeCompare(b.filename);
        }
        if (sortBy === "size-desc") {
          return (
            (Number(b.compressed_size) || 0) - (Number(a.compressed_size) || 0)
          );
        }
        if (sortBy === "size-asc") {
          return (
            (Number(a.compressed_size) || 0) - (Number(b.compressed_size) || 0)
          );
        }
        if (sortBy === "savings") {
          return (
            (Number(b.savings_percent) || 0) - (Number(a.savings_percent) || 0)
          );
        }
        return 0;
      });
  }, [files, backendFilter, categoryFilter, globalFilter, sortBy]);

  // Table columns for List View
  const columns: ColumnDef<FileItem>[] = React.useMemo(
    () => [
      {
        accessorKey: "filename",
        header: "File",
        cell: ({ row }) => {
          const visual = getFileVisual(
            row.original.content_type,
            row.original.filename,
          );
          const Icon = visual.icon;
          return (
            <button
              type="button"
              className="flex items-center gap-3 cursor-pointer group text-left border-0 bg-transparent p-0 text-inherit font-inherit"
              onClick={() => setActiveInspector(row.original)}
            >
              <div
                className={`h-9 w-9 rounded-lg ${visual.bg} ${visual.color} border ${visual.border} flex items-center justify-center shrink-0 overflow-hidden`}
              >
                {visual.type === "image" ? (
                  // biome-ignore lint/performance/noImgElement: dynamic user-uploaded asset preview
                  <img
                    src={`http://localhost:8080${row.original.url}`}
                    alt={row.original.filename}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="flex flex-col truncate max-w-[240px]">
                <span
                  className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors"
                  title={row.original.filename}
                >
                  {row.original.filename}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {row.original.content_type}
                </span>
              </div>
            </button>
          );
        },
      },
      {
        accessorKey: "storage_backend",
        header: "Storage",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={`text-[10px] uppercase font-mono px-1.5 py-0 gap-1 ${
              row.original.storage_backend === "s3"
                ? "border-sky-500/40 text-sky-400 bg-sky-500/5"
                : "border-emerald-500/40 text-emerald-400 bg-emerald-500/5"
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
          <div className="flex flex-col text-xs font-mono">
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
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5 font-mono">
            <TrendingDown className="h-3 w-3" />
            {row.original.savings_percent
              ? `${row.original.savings_percent.toFixed(1)}%`
              : "0%"}
          </span>
        ),
      },
      {
        accessorKey: "sha256",
        header: "SHA-256",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <span className="truncate max-w-[90px]" title={row.original.sha256}>
              {row.original.sha256.slice(0, 10)}...
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(row.original.sha256);
              }}
              className="p-1 hover:text-foreground transition-colors cursor-pointer"
              title="Copy SHA-256"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
            {new Date(row.original.created_at).toLocaleDateString()}
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
              onClick={() => setActiveInspector(row.original)}
              className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
              title="Inspect File"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(row.original)}
              className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
              title="Download Decompressed"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyFileUrl(row.original)}
              className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
              title="Copy Public URL"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {row.original.storage_backend === "s3" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPresignTarget(row.original);
                  setPresignedUrl("");
                }}
                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                title="Generate Presigned URL"
              >
                <Key className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(row.original)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive cursor-pointer"
              title="Delete File"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [copyFileUrl, copyToClipboard, handleDownload],
  );

  const table = useReactTable({
    data: filteredAndSortedFiles,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            File Storage
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload, organize, preview, and manage your stored files and media.
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
            className="gap-1.5 text-xs cursor-pointer shadow-xs"
          >
            <UploadCloud className="h-4 w-4" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Storage Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Storage Location Card */}
        <Card className="relative overflow-hidden p-4.5 border-border/80 bg-card/80 transition-colors duration-200 hover:border-sky-500/30 hover:shadow-xs">
          <div className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-sky-500/5 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {stats?.active_backend === "s3" ? (
                  <Cloud className="h-3.5 w-3.5" />
                ) : (
                  <HardDrive className="h-3.5 w-3.5" />
                )}
              </span>
              Storage Location
            </span>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-normal border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </Badge>
          </div>

          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-foreground truncate">
              {stats?.active_backend === "s3"
                ? "Cloud Storage (S3)"
                : "Local Storage"}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className="text-[10px] font-mono px-1.5 py-0"
              >
                {stats?.active_backend === "s3" ? "Cloud Bucket" : "Local Disk"}
              </Badge>
              <Badge
                variant="secondary"
                className="text-[10px] font-mono px-1.5 py-0 flex items-center gap-1 text-emerald-400 border-emerald-500/20"
              >
                <ShieldCheck className="h-3 w-3" />
                Protected
              </Badge>
            </div>
            <div
              className="mt-2 text-[11px] text-muted-foreground font-mono truncate"
              title={
                stats?.s3_bucket_name
                  ? `bucket: ${stats.s3_bucket_name}`
                  : "path: ./data/storage"
              }
            >
              {stats?.s3_bucket_name
                ? `bucket: ${stats.s3_bucket_name}`
                : "path: ./data/storage"}
            </div>
          </div>
        </Card>

        {/* 2. Total Files Card */}
        <Card className="relative overflow-hidden p-4.5 border-border/80 bg-card/80 transition-colors duration-200 hover:border-indigo-500/30 hover:shadow-xs">
          <div className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-indigo-500/5 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Layers className="h-3.5 w-3.5" />
              </span>
              Total Files
            </span>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 text-muted-foreground"
            >
              Catalog
            </Badge>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {totalFiles.toLocaleString()}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Cataloged files</span>
              <span className="text-[10px] text-indigo-400">
                {files.length > 0 ? `${files.length} active` : "Ready"}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground truncate">
              Automatic deduplication
            </div>
          </div>
        </Card>

        {/* 3. Storage Footprint Card */}
        <Card className="relative overflow-hidden p-4.5 border-border/80 bg-card/80 transition-colors duration-200 hover:border-purple-500/30 hover:shadow-xs">
          <div className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-purple-500/5 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Archive className="h-3.5 w-3.5" />
              </span>
              Disk Usage
            </span>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-mono text-muted-foreground truncate max-w-[130px]"
              title={`Original: ${formatBytes(totalOriginalBytes)}`}
            >
              Original: {formatBytes(totalOriginalBytes)}
            </Badge>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatBytes(totalCompressedBytes)}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Actual disk usage</span>
              {bytesSaved > 0 ? (
                <span className="text-purple-400 font-mono font-medium text-[10px]">
                  -{formatBytes(bytesSaved)}
                </span>
              ) : (
                <span className="text-[10px]">Standard</span>
              )}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground truncate">
              {bytesSaved > 0
                ? `Saved ${formatBytes(bytesSaved)} of storage space`
                : "Storage optimized"}
            </div>
          </div>
        </Card>

        {/* 4. Compression Savings Card */}
        <Card className="relative overflow-hidden p-4.5 border-border/80 bg-card/80 transition-colors duration-200 hover:border-emerald-500/30 hover:shadow-xs">
          <div className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-emerald-500/5 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingDown className="h-3.5 w-3.5" />
              </span>
              Storage Savings
            </span>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
            >
              {compressionRatio}x smaller
            </Badge>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-emerald-500 flex items-center gap-1">
              {averageSavings > 0 ? `${averageSavings.toFixed(1)}%` : "0%"}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Space saved</span>
              <span className="text-emerald-400/90 font-medium text-[10px]">
                {averageSavings > 0 ? "Optimized" : "Standard"}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground truncate">
              Automatic compression applied
            </div>
          </div>
        </Card>
      </div>

      {/* Storage Architecture & Category Distribution Insights */}
      <Card className="p-4.5 border-border/80 bg-card/60 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3.5 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Storage Overview &amp; Features
              </h3>
              <p className="text-[11px] text-muted-foreground">
                File type breakdown, security controls, and storage status
              </p>
            </div>
          </div>

          {/* Engine Capability Specification Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/40">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
              <span>Protected Storage</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/40">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Optimized Compression</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/40">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Secure Signed Links</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown & Interactive Filter Section */}
        <div className="mt-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground text-[11px]">
              Storage by File Type
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {files.length} file{files.length === 1 ? "" : "s"} &bull;{" "}
              {formatBytes(totalCompressedBytes)} total
            </span>
          </div>

          {/* Multi-segment distribution visual bar */}
          <div className="h-2.5 w-full bg-muted/40 rounded-full overflow-hidden flex border border-border/40">
            {files.length === 0 ? (
              <div
                className="h-full w-full bg-muted/60"
                title="No stored objects indexed yet"
              />
            ) : (
              fileBreakdown
                .filter((cat) => cat.count > 0)
                .map((cat) => (
                  <div
                    key={cat.id}
                    className={`h-full ${cat.color} transition-all duration-300`}
                    style={{
                      width: `${Math.max(
                        3,
                        (cat.compressedBytes /
                          Math.max(1, totalCompressedBytes)) *
                          100,
                      )}%`,
                    }}
                    title={`${cat.label}: ${cat.count} files (${formatBytes(cat.compressedBytes)})`}
                  />
                ))
            )}
          </div>

          {/* Interactive Category Filter Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {fileBreakdown.map((cat) => {
              const Icon = cat.icon;
              const isFiltered = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(isFiltered ? "all" : cat.id);
                  }}
                  disabled={cat.count === 0}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all duration-150 ${
                    cat.count > 0
                      ? isFiltered
                        ? `${cat.borderActive} text-foreground shadow-xs cursor-pointer`
                        : "bg-muted/15 border-border/50 hover:bg-muted/40 hover:border-border cursor-pointer text-muted-foreground hover:text-foreground"
                      : "opacity-40 border-border/30 bg-transparent cursor-not-allowed text-muted-foreground"
                  }`}
                >
                  <div
                    className={`p-1 rounded-md ${cat.textColor} bg-muted/40`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium truncate">
                        {cat.label}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {cat.count}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                      {formatBytes(cat.compressedBytes)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Modern File Manager Explorer */}
      <Card
        className="relative overflow-hidden border-border/80 bg-card shadow-sm"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag & Drop Visual Ingest Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-40 bg-background/90 backdrop-blur-sm border-2 border-dashed border-primary flex flex-col items-center justify-center gap-3 animate-in fade-in-50 duration-150 pointer-events-none">
            <div className="p-4 rounded-full bg-primary/10 text-primary border border-primary/20 animate-bounce">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-foreground">
                Drop File to Ingest
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Will be transparently compressed via Zstandard and sandboxed
              </p>
            </div>
          </div>
        )}

        {/* File Manager Breadcrumb & Path Location Header */}
        <div className="p-4 border-b border-border/60 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="p-1 rounded-md bg-muted text-foreground">
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
            </span>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all");
                setBackendFilter("all");
                setGlobalFilter("");
              }}
              className="hover:text-foreground transition-colors cursor-pointer font-medium"
            >
              storage
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-foreground font-semibold">
              {categoryFilter === "all"
                ? backendFilter === "all"
                  ? "all-objects"
                  : `${backendFilter}-backend`
                : categoryFilter}
            </span>
            <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50 ml-1">
              {filteredAndSortedFiles.length} item
              {filteredAndSortedFiles.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Quick Category Tabs Bar */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium whitespace-nowrap ${
                categoryFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              All Files ({files.length})
            </button>
            {fileBreakdown.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setCategoryFilter(categoryFilter === cat.id ? "all" : cat.id)
                }
                className={`text-xs px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? "bg-accent border border-primary/40 text-foreground font-medium shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[10px] font-mono opacity-80">
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* File Manager Controls Toolbar */}
        <div className="p-3.5 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left search & filter controls */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, sha256..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8 pr-7 text-xs h-8.5 rounded-lg"
              />
              {globalFilter && (
                <button
                  type="button"
                  onClick={() => setGlobalFilter("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Select
              value={backendFilter}
              onValueChange={(val) => {
                if (val) setBackendFilter(val);
              }}
            >
              <SelectTrigger className="flex-1 sm:w-36 h-8.5 text-xs rounded-lg bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors">
                <div className="flex items-center gap-1.5 truncate">
                  <Server className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground font-normal">
                    Engine:
                  </span>
                  <SelectValue>
                    {(val) => {
                      if (val === "s3")
                        return (
                          <span className="font-medium text-foreground">
                            AWS S3
                          </span>
                        );
                      if (val === "local")
                        return (
                          <span className="font-medium text-foreground">
                            Local Disk
                          </span>
                        );
                      return (
                        <span className="font-medium text-foreground">All</span>
                      );
                    }}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Engines</SelectItem>
                <SelectItem value="s3">AWS S3</SelectItem>
                <SelectItem value="local">Local Disk</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(val) => {
                if (val) setSortBy(val);
              }}
            >
              <SelectTrigger className="flex-1 sm:w-40 h-8.5 text-xs rounded-lg bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors">
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground font-normal">
                    Sort:
                  </span>
                  <SelectValue>
                    {(val) => {
                      const labels: Record<string, string> = {
                        newest: "Newest",
                        oldest: "Oldest",
                        name: "Name",
                        "size-desc": "Largest",
                        "size-asc": "Smallest",
                        savings: "Savings",
                      };
                      return (
                        <span className="font-medium text-foreground">
                          {labels[val] || val}
                        </span>
                      );
                    }}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="size-desc">Largest Size</SelectItem>
                <SelectItem value="size-asc">Smallest Size</SelectItem>
                <SelectItem value="savings">Highest Savings</SelectItem>
              </SelectContent>
            </Select>

            {(globalFilter ||
              backendFilter !== "all" ||
              sortBy !== "newest") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setGlobalFilter("");
                  setBackendFilter("all");
                  setSortBy("newest");
                }}
                className="h-8.5 px-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/80 hover:border-border hover:bg-accent/40 gap-1.5 transition-colors"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>

          {/* Right action & view switch controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`h-7 px-2.5 text-xs cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-background text-foreground shadow-xs font-medium"
                    : "text-muted-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`h-7 px-2.5 text-xs cursor-pointer ${
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-xs font-medium"
                    : "text-muted-foreground"
                }`}
                title="List View"
              >
                <ListIcon className="h-3.5 w-3.5 mr-1" />
                List
              </Button>
            </div>

            <Button
              size="sm"
              onClick={() => setUploadOpen(true)}
              className="h-8.5 px-3 text-xs gap-1.5 cursor-pointer shadow-xs"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload
            </Button>
          </div>
        </div>

        {/* File Manager Content Area */}
        <div className="p-4">
          {loading ? (
            <TableSkeleton rowCount={6} />
          ) : filteredAndSortedFiles.length === 0 ? (
            /* Empty State */
            <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-center text-muted-foreground mb-3 shadow-inner">
                <Folder className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {files.length === 0
                  ? "No objects stored yet"
                  : "No objects match your filters"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                {files.length === 0
                  ? "Drag & drop files anywhere in this window or click below to upload with transparent Zstandard compression."
                  : "Try clearing search queries, backend filters, or category tabs to find what you're looking for."}
              </p>
              {files.length === 0 ? (
                <Button
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                  className="gap-1.5 text-xs cursor-pointer shadow-xs"
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload First Object
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCategoryFilter("all");
                    setBackendFilter("all");
                    setGlobalFilter("");
                  }}
                  className="text-xs cursor-pointer"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {table.getRowModel().rows.map((row) => {
                const file = row.original;
                const visual = getFileVisual(file.content_type, file.filename);
                const Icon = visual.icon;
                return (
                  // biome-ignore lint/a11y/useSemanticElements: card container with nested interactive buttons
                  <div
                    key={file.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveInspector(file)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveInspector(file);
                      }
                    }}
                    className="group relative rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-md transition-colors duration-200 cursor-pointer overflow-hidden flex flex-col text-left"
                  >
                    {/* Preview Thumbnail Container */}
                    <div className="relative aspect-4/3 w-full bg-muted/20 border-b border-border/50 flex items-center justify-center overflow-hidden">
                      {visual.type === "image" ? (
                        // biome-ignore lint/performance/noImgElement: dynamic user-uploaded asset preview
                        <img
                          src={`http://localhost:8080${file.url}`}
                          alt={file.filename}
                          className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display =
                              "none";
                            e.currentTarget.parentElement
                              ?.querySelector(".fallback-icon")
                              ?.classList.remove("hidden");
                          }}
                        />
                      ) : null}

                      {/* Icon preview (default for non-images or image fallback) */}
                      <div
                        className={`fallback-icon ${
                          visual.type === "image" ? "hidden" : "flex"
                        } flex-col items-center justify-center gap-1.5 p-4`}
                      >
                        <div
                          className={`p-3 rounded-xl ${visual.bg} ${visual.color} border ${visual.border} transition-transform duration-200 group-hover:scale-110 shadow-xs`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">
                          {visual.badge}
                        </span>
                      </div>

                      {/* Storage Badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono px-1.5 py-0 uppercase backdrop-blur-xs ${
                            file.storage_backend === "s3"
                              ? "border-sky-500/40 text-sky-400 bg-sky-950/60"
                              : "border-emerald-500/40 text-emerald-400 bg-emerald-950/60"
                          }`}
                        >
                          {file.storage_backend === "s3" ? "S3" : "Local"}
                        </Badge>
                      </div>

                      {/* Hover Action Overlay */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-background/90 backdrop-blur-sm p-1 rounded-lg border border-border shadow-xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Inspect Details"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveInspector(file);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Download File"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file);
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Copy Public Link"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyFileUrl(file);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive cursor-pointer"
                          title="Delete Object"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(file);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Card Content Footer */}
                    <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                      <div>
                        <h4
                          className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors"
                          title={file.filename}
                        >
                          {file.filename}
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                          {file.content_type}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px]">
                        <span className="font-mono font-medium text-foreground">
                          {formatBytes(file.compressed_size)}
                        </span>
                        {Number(file.savings_percent) > 0 ? (
                          <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                            -{Number(file.savings_percent).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-mono text-[9px]">
                            {new Date(file.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <Table className="min-w-[700px]">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-muted/20">
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
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="hover:bg-muted/40 transition-colors"
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Configurable Pagination Controls */}
          <div className="rounded-lg border border-border/80 overflow-hidden">
            <DataTablePagination
              table={table}
              totalCount={filteredAndSortedFiles.length}
              pageSizeOptions={[10, 15, 25, 50, 100]}
            />
          </div>
        </div>
      </Card>

      {/* File Inspector Side Sheet */}
      <Sheet
        open={!!activeInspector}
        onOpenChange={(open) => !open && setActiveInspector(null)}
      >
        <SheetContent
          side="right"
          className="sm:max-w-md w-full overflow-y-auto p-0 flex flex-col border-l border-border bg-card shadow-2xl"
        >
          {activeInspector && (
            <div className="flex flex-col h-full">
              {/* Inspector Header */}
              <div className="p-4 border-b border-border/70 bg-muted/20">
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono uppercase px-1.5 py-0"
                    >
                      {activeInspector.storage_backend}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Inspector
                    </span>
                  </div>
                  <SheetTitle className="text-base font-semibold text-foreground truncate mt-1 text-left">
                    {activeInspector.filename}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground font-mono truncate text-left">
                    {activeInspector.content_type}
                  </SheetDescription>
                </SheetHeader>
              </div>

              {/* Inspector Body */}
              <div className="p-4 space-y-4 flex-1">
                {/* Visual Preview Hero */}
                <div className="w-full aspect-16/10 rounded-xl bg-muted/30 border border-border/70 flex items-center justify-center overflow-hidden p-2 relative">
                  {getFileVisual(
                    activeInspector.content_type,
                    activeInspector.filename,
                  ).type === "image" ? (
                    // biome-ignore lint/performance/noImgElement: dynamic user-uploaded asset preview
                    <img
                      src={`http://localhost:8080${activeInspector.url}`}
                      alt={activeInspector.filename}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                        {React.createElement(
                          getFileVisual(
                            activeInspector.content_type,
                            activeInspector.filename,
                          ).icon,
                          { className: "h-8 w-8" },
                        )}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground uppercase">
                        {activeInspector.filename.split(".").pop()} File
                      </span>
                    </div>
                  )}

                  {activeInspector.width && activeInspector.height && (
                    <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-background/80 backdrop-blur-xs px-1.5 py-0.5 rounded border border-border">
                      {activeInspector.width} &times; {activeInspector.height}{" "}
                      px
                    </span>
                  )}
                </div>

                {/* Compression Efficiency Widget */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      Zstandard Compaction
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {activeInspector.savings_percent > 0
                        ? `${activeInspector.savings_percent.toFixed(1)}% Saved`
                        : "0% Reduction"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">
                        Compressed On-Disk
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {formatBytes(activeInspector.compressed_size)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-background/60 border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">
                        Raw Original
                      </span>
                      <span className="text-sm font-bold text-muted-foreground line-through">
                        {formatBytes(activeInspector.original_size)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata Details Table */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    File Details
                  </h4>
                  <div className="divide-y divide-border/50 rounded-xl border border-border/70 bg-card text-xs">
                    <div className="p-2.5 flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">File ID</span>
                      <span className="font-mono text-[11px] text-foreground truncate max-w-[180px]">
                        {activeInspector.id}
                      </span>
                    </div>
                    <div className="p-2.5 flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        Storage Location
                      </span>
                      <span className="font-mono text-[11px] text-foreground">
                        {activeInspector.storage_backend === "s3"
                          ? "Cloud Storage (S3)"
                          : "Local Storage"}
                      </span>
                    </div>
                    <div className="p-2.5 flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">SHA-256</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <span className="truncate max-w-[140px]">
                          {activeInspector.sha256}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(activeInspector.sha256)
                          }
                          aria-label="Copy SHA-256"
                          className="hover:text-primary transition-colors cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {activeInspector.blurhash && (
                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Blurhash</span>
                        <span className="font-mono text-[11px] truncate max-w-[160px]">
                          {activeInspector.blurhash}
                        </span>
                      </div>
                    )}
                    <div className="p-2.5 flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Uploaded At</span>
                      <span className="font-mono text-[11px] text-foreground">
                        {new Date(activeInspector.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inspector Footer Actions */}
              <div className="p-4 border-t border-border/70 bg-muted/20 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleDownload(activeInspector)}
                    className="gap-1.5 text-xs cursor-pointer shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyFileUrl(activeInspector)}
                    className="gap-1.5 text-xs cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy URL
                  </Button>
                </div>

                {activeInspector.storage_backend === "s3" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPresignTarget(activeInspector);
                      setPresignedUrl("");
                    }}
                    className="w-full gap-1.5 text-xs cursor-pointer"
                  >
                    <Key className="h-3.5 w-3.5" />
                    Generate S3 Presigned URL
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(activeInspector)}
                  className="w-full gap-1.5 text-xs text-destructive hover:text-destructive cursor-pointer hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Object
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Upload Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Upload Object</DialogTitle>
            <DialogDescription className="text-xs">
              Upload files with transparent Zstandard compression to the active
              backend.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 py-2">
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
                {stats?.active_backend === "s3" ? "AWS S3 / R2" : "Local Disk"}
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
              Generate a temporary signed URL allowing direct download from S3.
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
                  <Label className="text-xs font-semibold">Generated URL</Label>
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
            <Button
              size="sm"
              onClick={handleGeneratePresignedUrl}
              disabled={isGeneratingPresign}
            >
              {isGeneratingPresign ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing URL...
                </>
              ) : (
                "Generate Signed URL"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Object
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">
                {deleteTarget?.filename}
              </strong>
              ? This will remove the file from both the active storage backend
              and database index. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function StoragePage() {
  return (
    <DashboardShell>
      <React.Suspense
        fallback={
          <TableSkeleton
            title="File Storage"
            description="Manage uploaded media, documents, and bucket assets"
            rowCount={8}
            columnCount={6}
          />
        }
      >
        <StorageContent />
      </React.Suspense>
    </DashboardShell>
  );
}

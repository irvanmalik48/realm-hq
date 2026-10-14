"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
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
  Check,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode,
  Globe,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import {
  DataTableBulkActions,
  DataTableColumnHeader,
  DataTablePagination,
} from "@/components/data-table";
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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createPaste,
  deletePaste,
  fetchPastes,
  type PasteSummary,
} from "@/lib/api/pastes";
import { cn } from "@/lib/utils";

const SYNTAX_OPTIONS = [
  { value: "plaintext", label: "Plain Text" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "go", label: "Go" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "java", label: "Java" },
  { value: "kotlin", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "toml", label: "TOML" },
  { value: "xml", label: "XML" },
  { value: "shell", label: "Shell / Bash" },
  { value: "markdown", label: "Markdown" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "graphql", label: "GraphQL" },
  { value: "lua", label: "Lua" },
  { value: "zig", label: "Zig" },
];

const SYNTAX_FILTER_OPTIONS = [
  { value: "all", label: "All Syntaxes" },
  ...SYNTAX_OPTIONS,
];

const TTL_OPTIONS = [
  { value: "never", label: "Never (Permanent)" },
  { value: "10m", label: "10 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "1d", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatExpiration(expiresAt?: string): {
  text: string;
  isExpired: boolean;
} {
  if (!expiresAt) return { text: "Never", isExpired: false };
  const expDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { text: "Expired", isExpired: true };
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return { text: `in ${diffDays}d`, isExpired: false };
  if (diffHours > 0) return { text: `in ${diffHours}h`, isExpired: false };
  return { text: `in ${Math.max(1, diffMins)}m`, isExpired: false };
}

function PastesContent() {
  const [pastes, setPastes] = React.useState<PasteSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [syntaxFilter, setSyntaxFilter] = React.useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = React.useState<string>("all");

  // Create Dialog State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createTitle, setCreateTitle] = React.useState("");
  const [createContent, setCreateContent] = React.useState("");
  const [createSyntax, setCreateSyntax] = React.useState("plaintext");
  const [createTTL, setCreateTTL] = React.useState("never");
  const [createIsPublic, setCreateIsPublic] = React.useState(true);
  const [createHasPassword, setCreateHasPassword] = React.useState(false);
  const [createPassword, setCreatePassword] = React.useState("");
  const [showCreatePassword, setShowCreatePassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Delete Dialog State
  const [pasteToDelete, setPasteToDelete] = React.useState<PasteSummary | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Copy tracking state
  const [copiedSlug, setCopiedSlug] = React.useState<string | null>(null);

  const loadPastes = React.useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const data = await fetchPastes({
        limit: 100,
        offset: 0,
      });
      setPastes(data.pastes);
    } catch (err) {
      console.error("Failed to load pastes:", err);
      toast.error("Failed to fetch pastes");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadPastes();
  }, [loadPastes]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPastes(true);
    toast.success("Pastes refreshed");
  };

  const handleCopy = React.useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  }, []);

  const handleCopySlug = React.useCallback((slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    toast.success(`Copied slug "${slug}"`);
    setTimeout(() => {
      setCopiedSlug(null);
    }, 2000);
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createContent.trim()) {
      toast.error("Paste content cannot be empty");
      return;
    }

    if (createHasPassword && !createPassword.trim()) {
      toast.error("Please enter a password for encryption");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createPaste({
        title: createTitle.trim() || undefined,
        content: createContent,
        syntax: createSyntax,
        password: createHasPassword ? createPassword.trim() : undefined,
        ttl: createTTL,
        is_public: createIsPublic,
      });

      toast.success(
        createHasPassword
          ? `Paste created & encrypted with 7-letter slug: ${created.slug}`
          : `Paste created successfully with 7-letter slug: ${created.slug}`,
      );
      setIsCreateOpen(false);
      setCreateTitle("");
      setCreateContent("");
      setCreatePassword("");
      setCreateHasPassword(false);
      setShowCreatePassword(false);
      setCreateSyntax("plaintext");
      setCreateTTL("never");
      setCreateIsPublic(true);
      await loadPastes(true);
    } catch (err) {
      console.error("Failed to create paste:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to create paste",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pasteToDelete) return;
    setIsDeleting(true);
    try {
      await deletePaste(pasteToDelete.slug);
      toast.success(`Paste "${pasteToDelete.slug}" deleted`);
      setPastes((prev) => prev.filter((p) => p.slug !== pasteToDelete.slug));
      setPasteToDelete(null);
    } catch (err) {
      console.error("Failed to delete paste:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete paste",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedPastes = selectedIndices
      .map((idx) => table.getRowModel().rows[idx]?.original)
      .filter(Boolean);

    if (selectedPastes.length === 0) return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedPastes.map((p) => deletePaste(p.slug)));
      toast.success(`Deleted ${selectedPastes.length} paste(s)`);
      setRowSelection({});
      setIsBulkDeleteOpen(false);
      await loadPastes(true);
    } catch (err) {
      console.error("Failed to delete pastes in bulk:", err);
      toast.error("Failed to delete selected pastes");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Filtered data based on search, syntax filter, and visibility filter
  const filteredData = React.useMemo(() => {
    return pastes.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.slug.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q);

      const matchesSyntax =
        syntaxFilter === "all" ||
        p.syntax.toLowerCase() === syntaxFilter.toLowerCase();

      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "public" ? p.is_public : !p.is_public);

      return matchesSearch && matchesSyntax && matchesVisibility;
    });
  }, [pastes, searchQuery, syntaxFilter, visibilityFilter]);

  // Quick stats
  const metrics = React.useMemo(() => {
    const total = pastes.length;
    const publicPastes = pastes.filter((p) => p.is_public).length;
    const unlisted = total - publicPastes;
    const views = pastes.reduce((acc, p) => acc + (p.views || 0), 0);
    return { total, publicPastes, unlisted, views };
  }, [pastes]);

  const columns: ColumnDef<PasteSummary>[] = React.useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
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
        accessorKey: "slug",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Slug (7-Letter)" />
        ),
        cell: ({ row }) => {
          const slug = row.getValue("slug") as string;
          const isCopied = copiedSlug === slug;
          return (
            <div className="flex items-center gap-2">
              <Link
                href={`/pastes/${slug}`}
                transitionTypes={["nav-forward"]}
                className="group flex items-center gap-1.5 font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                title="Click to view paste details"
              >
                <span>{slug}</span>
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopySlug(slug);
                }}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                title="Copy 7-letter slug"
              >
                {isCopied ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Title" />
        ),
        cell: ({ row }) => {
          const title = row.getValue("title") as string;
          const isEncrypted = row.original.is_encrypted;
          const slug = row.original.slug;
          return (
            <div className="flex items-center gap-1.5 max-w-[220px] truncate">
              <Link
                href={`/pastes/${slug}`}
                transitionTypes={["nav-forward"]}
                className="font-medium text-foreground truncate hover:text-primary transition-colors"
              >
                {title ? (
                  <span>{title}</span>
                ) : (
                  <span className="italic text-muted-foreground text-xs truncate">
                    Untitled
                  </span>
                )}
              </Link>
              {isEncrypted && (
                <Badge
                  variant="outline"
                  className="font-medium text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-500 bg-amber-500/10 gap-1 shrink-0"
                  title="Password protected snippet"
                >
                  <Lock className="size-2.5" />
                  <span>Protected</span>
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "syntax",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Syntax" />
        ),
        cell: ({ row }) => {
          const syntax = row.getValue("syntax") as string;
          return (
            <Badge
              variant="outline"
              className="font-mono text-[11px] font-normal uppercase tracking-wider bg-muted/40"
            >
              {syntax || "text"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "is_public",
        header: "Visibility",
        cell: ({ row }) => {
          const isPublic = row.getValue("is_public") as boolean;
          return (
            <div className="flex items-center gap-1.5 text-xs">
              {isPublic ? (
                <>
                  <Globe className="size-3.5 text-emerald-500" />
                  <span className="text-muted-foreground">Public</span>
                </>
              ) : (
                <>
                  <Lock className="size-3.5 text-amber-500" />
                  <span className="text-muted-foreground">Unlisted</span>
                </>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "size",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Size" />
        ),
        cell: ({ row }) => {
          const size = row.getValue("size") as number;
          return (
            <span className="text-xs text-muted-foreground font-mono">
              {formatBytes(size)}
            </span>
          );
        },
      },
      {
        accessorKey: "views",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Views" />
        ),
        cell: ({ row }) => {
          const views = row.getValue("views") as number;
          return (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="size-3.5 opacity-70" />
              <span>{views.toLocaleString()}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "expires_at",
        header: "Expires",
        cell: ({ row }) => {
          const expiresAt = row.getValue("expires_at") as string | undefined;
          const { text, isExpired } = formatExpiration(expiresAt);
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <Clock
                className={cn(
                  "size-3.5",
                  isExpired
                    ? "text-destructive"
                    : expiresAt
                      ? "text-amber-500"
                      : "text-muted-foreground opacity-60",
                )}
              />
              <span
                className={cn(
                  isExpired
                    ? "text-destructive font-medium"
                    : "text-muted-foreground",
                )}
              >
                {text}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        cell: ({ row }) => {
          const val = row.getValue("created_at") as string;
          if (!val) return null;
          const date = new Date(val);
          return (
            <span className="text-xs text-muted-foreground">
              {date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const item = row.original;
          const rawUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/pastes/${item.slug}/raw`;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8 p-0"
                    title="Options"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  render={
                    <Link
                      href={`/pastes/${item.slug}`}
                      transitionTypes={["nav-forward"]}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Eye data-icon="inline-start" />
                      <span>View Snippet</span>
                    </Link>
                  }
                />
                <DropdownMenuItem onClick={() => handleCopySlug(item.slug)}>
                  <Copy className="mr-2 size-4" />
                  <span>Copy 7-Letter Slug</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCopy(rawUrl, "raw content URL")}
                >
                  <Code2 className="mr-2 size-4" />
                  <span>Copy Raw Link</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    window.open(`/api/pastes/${item.slug}/raw`, "_blank")
                  }
                >
                  <ExternalLink className="mr-2 size-4" />
                  <span>Open Raw View</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setPasteToDelete(item)}
                >
                  <Trash2 className="mr-2 size-4" />
                  <span>Delete Paste</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [copiedSlug, handleCopySlug, handleCopy],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedRowsCount = Object.keys(rowSelection).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            Pastebin Service
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, manage, and share code snippets with short, shareable links.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw
              data-icon="inline-start"
              className={cn("size-3.5", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5"
          >
            <Plus data-icon="inline-start" />
            New Paste
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Total Snippets
            </span>
            <FileCode className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Public Pastes
            </span>
            <Globe className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.publicPastes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Unlisted
            </span>
            <Lock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {metrics.unlisted}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Total Views
            </span>
            <Eye className="size-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.views.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs md:max-w-sm min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by title or link code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-background/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Visibility Filter */}
          <Select
            value={visibilityFilter}
            onValueChange={(val) => {
              if (val) setVisibilityFilter(val);
            }}
          >
            <SelectTrigger className="h-9 text-xs min-w-[130px] bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors">
              <div className="flex items-center gap-1.5 truncate">
                <Globe className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground font-normal">
                  Visibility:
                </span>
                <SelectValue>
                  {(val) => {
                    if (val === "public") {
                      return (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-500">
                          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                          Public
                        </span>
                      );
                    }
                    if (val === "unlisted") {
                      return (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-500">
                          <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                          Unlisted
                        </span>
                      );
                    }
                    return (
                      <span className="font-medium text-foreground">All</span>
                    );
                  }}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent align="start" className="min-w-[150px]">
              <SelectItem value="all" className="text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                  All Visibility
                </span>
              </SelectItem>
              <SelectItem value="public" className="text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Public
                </span>
              </SelectItem>
              <SelectItem value="unlisted" className="text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Unlisted
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Syntax Filter Combobox */}
          <Combobox
            items={SYNTAX_FILTER_OPTIONS}
            value={syntaxFilter}
            onValueChange={(val) => setSyntaxFilter(val ?? "all")}
            itemToStringLabel={(val) =>
              SYNTAX_FILTER_OPTIONS.find((opt) => opt.value === val)?.label ??
              String(val || "")
            }
          >
            <ComboboxInput
              placeholder="Filter syntax..."
              showTrigger
              showClear={syntaxFilter !== "all"}
              className="h-9 text-xs min-w-[140px] max-w-[200px]"
            />
            <ComboboxContent className="max-h-64 min-w-[180px]">
              <ComboboxEmpty>No syntax found</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem
                    key={item.value}
                    value={item.value}
                    className="text-xs"
                  >
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          {(searchQuery ||
            syntaxFilter !== "all" ||
            visibilityFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSyntaxFilter("all");
                setVisibilityFilter("all");
              }}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/80 hover:border-border hover:bg-accent/40 gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                {(syntaxFilter !== "all" ? 1 : 0) +
                  (visibilityFilter !== "all" ? 1 : 0) +
                  (searchQuery ? 1 : 0)}
              </span>
            </Button>
          )}
        </div>

        <div className="hidden lg:flex items-center text-xs text-muted-foreground shrink-0">
          Showing{" "}
          <span className="font-medium text-foreground mx-1">
            {filteredData.length}
          </span>{" "}
          of {pastes.length} snippets
        </div>
      </div>

      {/* Pastes Table */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <Table className="min-w-[850px]">
          <TableHeader className="bg-muted/40">
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
            {isLoading ? (
              <TableRowSkeleton
                columnCount={columns.length}
                rowCount={pagination.pageSize || 8}
              />
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/30 transition-colors"
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
                  className="h-48 text-center"
                >
                  <Empty className="py-12 border-0">
                    <EmptyHeader>
                      <FileCode className="size-10 text-muted-foreground/60 mb-2" />
                      <EmptyTitle>No pastes found</EmptyTitle>
                      <EmptyDescription>
                        {searchQuery ||
                        syntaxFilter !== "all" ||
                        visibilityFilter !== "all"
                          ? "Try adjusting your search criteria or clear active filters."
                          : "No pastes have been created yet. Click 'New Paste' to create one."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <DataTablePagination
          table={table}
          totalCount={filteredData.length}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </div>

      {/* Floating Bulk Actions Bar */}
      <DataTableBulkActions
        selectedCount={selectedRowsCount}
        totalCount={filteredData.length}
        onClearSelection={() => setRowSelection({})}
      >
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setIsBulkDeleteOpen(true)}
          disabled={isBulkDeleting}
          className="gap-1.5 h-8 text-xs cursor-pointer"
        >
          <Trash2 className="size-3.5" />
          <span>Delete ({selectedRowsCount})</span>
        </Button>
      </DataTableBulkActions>

      {/* Bulk Delete Alert Dialog */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Pastes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRowsCount} selected
              paste(s)? This action cannot be undone and will permanently remove
              these snippets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
            >
              {isBulkDeleting
                ? "Deleting..."
                : `Delete ${selectedRowsCount} Pastes`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create New Paste Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCode className="size-5 text-primary" />
                <span>Create New Paste</span>
              </DialogTitle>
              <DialogDescription>
                A random 7-letter slug will automatically be generated as the
                unique identifier.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="paste-title">Title (Optional)</Label>
                  <Input
                    id="paste-title"
                    placeholder="e.g. server-config.yaml"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="paste-syntax">Syntax Highlighting</Label>
                  <Combobox
                    items={SYNTAX_OPTIONS}
                    value={createSyntax}
                    onValueChange={(val) => setCreateSyntax(val ?? "plaintext")}
                    itemToStringLabel={(val) =>
                      SYNTAX_OPTIONS.find((opt) => opt.value === val)?.label ??
                      String(val || "")
                    }
                  >
                    <ComboboxInput
                      id="paste-syntax"
                      placeholder="Select syntax..."
                      showTrigger
                      className="h-9 text-xs"
                    />
                    <ComboboxContent className="max-h-64 min-w-[200px]">
                      <ComboboxEmpty>No syntax found</ComboboxEmpty>
                      <ComboboxList>
                        {(opt) => (
                          <ComboboxItem
                            key={opt.value}
                            value={opt.value}
                            className="text-xs"
                          >
                            {opt.label}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="paste-ttl">Expiration (TTL)</Label>
                  <Select
                    value={createTTL}
                    onValueChange={(val) => {
                      if (val) setCreateTTL(val);
                    }}
                  >
                    <SelectTrigger id="paste-ttl">
                      <SelectValue placeholder="Expiration time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TTL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col justify-end gap-1.5">
                  <div className="flex items-center justify-between rounded-md border border-border/60 p-2.5">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="paste-visibility"
                        className="text-xs cursor-pointer font-medium"
                      >
                        Public Access
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        {createIsPublic
                          ? "Anyone with slug can view"
                          : "Unlisted"}
                      </p>
                    </div>
                    <Switch
                      id="paste-visibility"
                      checked={createIsPublic}
                      onCheckedChange={setCreateIsPublic}
                    />
                  </div>
                </div>
              </div>

              {/* Password Protection */}
              <div className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="size-4 text-amber-500" />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="paste-password-toggle"
                        className="text-xs font-semibold cursor-pointer"
                      >
                        Protect with Password
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Require a password to view or copy this snippet
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="paste-password-toggle"
                    checked={createHasPassword}
                    onCheckedChange={(checked) => {
                      setCreateHasPassword(checked);
                      if (!checked) setCreatePassword("");
                    }}
                  />
                </div>
                {createHasPassword && (
                  <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="relative">
                      <Input
                        type={showCreatePassword ? "text" : "password"}
                        placeholder="Enter a password..."
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        className="pr-10 text-xs font-mono h-9"
                        required={createHasPassword}
                      />
                      <button
                        type="button"
                        aria-label={
                          showCreatePassword ? "Hide password" : "Show password"
                        }
                        onClick={() =>
                          setShowCreatePassword(!showCreatePassword)
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      >
                        {showCreatePassword ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Only users with this password can decrypt and read the
                      paste content. The server stores only authenticated
                      ciphertext.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="paste-content">
                    Paste Content <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {createContent.length} chars (
                    {formatBytes(createContent.length)})
                  </span>
                </div>
                <Textarea
                  id="paste-content"
                  placeholder="Paste or type your code snippet or text here..."
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  onKeyDown={(e) => {
                    // Indent with tab
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const target = e.target as HTMLTextAreaElement;
                      const start = target.selectionStart;
                      const end = target.selectionEnd;
                      const val = target.value;
                      setCreateContent(
                        `${val.substring(0, start)}  ${val.substring(end)}`,
                      );
                      setTimeout(() => {
                        target.selectionStart = target.selectionEnd = start + 2;
                      }, 0);
                    }
                  }}
                  className="font-mono text-xs min-h-[260px] resize-y bg-muted/20"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    <span>Generate & Create Paste</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(pasteToDelete)}
        onOpenChange={(open) => {
          if (!open) setPasteToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Paste Snippet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete paste{" "}
              <strong className="font-mono text-foreground">
                {pasteToDelete?.slug}
              </strong>
              {pasteToDelete?.title ? ` ("${pasteToDelete.title}")` : ""}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PastesPage() {
  return (
    <React.Suspense
      fallback={
        <TableSkeleton
          icon={FileCode}
          title="Pastebin Service"
          description="Create, manage, and share code snippets with 7-letter unique slugs."
          rowCount={8}
          columnCount={8}
        />
      }
    >
      <PastesContent />
    </React.Suspense>
  );
}

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
  FileCode,
  Globe,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import {
  DataTableColumnHeader,
  DataTablePagination,
} from "@/components/data-table";
import { TableRowSkeleton } from "@/components/layout/table-skeleton";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  fetchPasteBySlug,
  fetchPastes,
  type PasteDetail,
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
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "shell", label: "Shell / Bash" },
  { value: "markdown", label: "Markdown" },
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

export default function PastesPage() {
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

  const [searchQuery, setSearchQuery] = React.useState("");
  const [syntaxFilter, setSyntaxFilter] = React.useState<string>("all");

  // Create Dialog State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createTitle, setCreateTitle] = React.useState("");
  const [createContent, setCreateContent] = React.useState("");
  const [createSyntax, setCreateSyntax] = React.useState("plaintext");
  const [createTTL, setCreateTTL] = React.useState("never");
  const [createIsPublic, setCreateIsPublic] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // View Sheet State
  const [viewPaste, setViewPaste] = React.useState<PasteDetail | null>(null);
  const [isViewLoading, setIsViewLoading] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);

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

  const handleOpenDetail = React.useCallback(async (slug: string) => {
    setIsViewLoading(true);
    setIsViewOpen(true);
    try {
      const detail = await fetchPasteBySlug(slug);
      setViewPaste(detail);
    } catch (err) {
      console.error("Failed to fetch paste details:", err);
      toast.error("Failed to load paste content");
      setIsViewOpen(false);
    } finally {
      setIsViewLoading(false);
    }
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createContent.trim()) {
      toast.error("Paste content cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createPaste({
        title: createTitle.trim() || undefined,
        content: createContent,
        syntax: createSyntax,
        ttl: createTTL,
        is_public: createIsPublic,
      });

      toast.success(
        `Paste created successfully with 7-letter slug: ${created.slug}`,
      );
      setIsCreateOpen(false);
      setCreateTitle("");
      setCreateContent("");
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
      if (viewPaste?.slug === pasteToDelete.slug) {
        setIsViewOpen(false);
        setViewPaste(null);
      }
    } catch (err) {
      console.error("Failed to delete paste:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete paste",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered data based on search and syntax filter
  const filteredData = React.useMemo(() => {
    return pastes.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSyntax =
        syntaxFilter === "all" ||
        p.syntax.toLowerCase() === syntaxFilter.toLowerCase();

      return matchesSearch && matchesSyntax;
    });
  }, [pastes, searchQuery, syntaxFilter]);

  // Quick stats
  const totalViews = React.useMemo(
    () => pastes.reduce((acc, p) => acc + (p.views || 0), 0),
    [pastes],
  );
  const publicCount = React.useMemo(
    () => pastes.filter((p) => p.is_public).length,
    [pastes],
  );

  const columns: ColumnDef<PasteSummary>[] = React.useMemo(
    () => [
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
              <button
                type="button"
                onClick={() => handleOpenDetail(slug)}
                className="group flex items-center gap-1.5 font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                title="Click to view paste details"
              >
                <span>{slug}</span>
              </button>
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
          return (
            <div className="max-w-[200px] truncate">
              {title ? (
                <span className="font-medium text-foreground">{title}</span>
              ) : (
                <span className="italic text-muted-foreground text-xs">
                  Untitled
                </span>
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
                <DropdownMenuItem onClick={() => handleOpenDetail(item.slug)}>
                  <Eye className="mr-2 size-4" />
                  <span>View Snippet</span>
                </DropdownMenuItem>
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
    [copiedSlug, handleCopySlug, handleOpenDetail, handleCopy],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top Header Card / Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileCode className="size-6 text-primary" />
            Pastebin Service
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dedicated pastebin service generating cryptographically unique
            7-letter slugs for sharing code and snippets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw
              className={cn("size-3.5", isRefreshing && "animate-spin")}
            />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 shadow-sm"
          >
            <Plus className="size-4" />
            <span>New Paste</span>
          </Button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Pastes
            </CardTitle>
            <FileCode className="size-4 text-primary opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {pastes.length.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active snippet records
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Public Snippets
            </CardTitle>
            <Globe className="size-4 text-emerald-500 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {publicCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Visible without restriction
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Views
            </CardTitle>
            <Eye className="size-4 text-sky-500 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Read impressions across all pastes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <Card className="shadow-xs border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or 7-letter slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm h-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select
                value={syntaxFilter}
                onValueChange={(val) => {
                  if (val) setSyntaxFilter(val);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
                  <SelectValue placeholder="All Syntaxes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Syntaxes</SelectItem>
                  {SYNTAX_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Pastes Table */}
      <Card className="shadow-xs border-border/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
                {isLoading ? (
                  <TableRowSkeleton columnCount={8} rowCount={6} />
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="hover:bg-muted/40 transition-colors"
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
                      <Empty>
                        <EmptyHeader>
                          <FileCode className="size-10 text-muted-foreground/60 mb-2" />
                          <EmptyTitle>No pastes found</EmptyTitle>
                          <EmptyDescription>
                            {searchQuery || syntaxFilter !== "all"
                              ? "No snippets match the selected criteria."
                              : "No pastes have been created yet. Click 'New Paste' to create one."}
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 border-t border-border/50">
            <DataTablePagination table={table} />
          </div>
        </CardContent>
      </Card>

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
                  <Select
                    value={createSyntax}
                    onValueChange={(val) => {
                      if (val) setCreateSyntax(val);
                    }}
                  >
                    <SelectTrigger id="paste-syntax">
                      <SelectValue placeholder="Select syntax" />
                    </SelectTrigger>
                    <SelectContent>
                      {SYNTAX_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      {/* View Paste Snippet Sheet */}
      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full overflow-hidden p-6">
          <SheetHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCode className="size-5 text-primary" />
                <SheetTitle className="text-lg">
                  {viewPaste?.title || "Paste Snippet"}
                </SheetTitle>
              </div>

              {viewPaste && (
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  <span>{viewPaste.slug}</span>
                </div>
              )}
            </div>

            <SheetDescription className="text-xs">
              {viewPaste ? (
                <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground">
                  <span>Syntax: {viewPaste.syntax}</span>
                  <span>•</span>
                  <span>
                    Size:{" "}
                    {formatBytes(viewPaste.size || viewPaste.content.length)}
                  </span>
                  <span>•</span>
                  <span>Views: {viewPaste.views}</span>
                  <span>•</span>
                  <span>
                    Expires: {formatExpiration(viewPaste.expires_at).text}
                  </span>
                </div>
              ) : (
                "Loading snippet details..."
              )}
            </SheetDescription>
          </SheetHeader>

          {isViewLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="size-6 animate-spin text-primary opacity-60" />
            </div>
          ) : viewPaste ? (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden py-4">
              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopy(viewPaste.content, "paste content")
                    }
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Copy className="size-3.5" />
                    <span>Copy Content</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopy(
                        `${window.location.origin}/api/pastes/${viewPaste.slug}/raw`,
                        "raw link",
                      )
                    }
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Code2 className="size-3.5" />
                    <span>Copy Raw Link</span>
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(`/api/pastes/${viewPaste.slug}/raw`, "_blank")
                  }
                  className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Raw View</span>
                </Button>
              </div>

              {/* Code display with line numbers */}
              <div className="flex-1 overflow-auto rounded-lg border border-border/60 bg-muted/30 p-4 font-mono text-xs leading-relaxed">
                <pre className="text-foreground whitespace-pre-wrap break-all select-text">
                  {viewPaste.content}
                </pre>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

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

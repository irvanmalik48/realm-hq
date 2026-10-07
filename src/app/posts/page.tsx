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
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  MoreHorizontal,
  PenSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  deletePost,
  fetchPosts,
  type PostSummary,
  updatePost,
} from "@/lib/api/posts";

export default function PostsPage() {
  const [posts, setPosts] = React.useState<PostSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "updated_at", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [tagFilter, setTagFilter] = React.useState<string>("all");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  React.useEffect(() => {
    void searchQuery;
    void statusFilter;
    void tagFilter;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, statusFilter, tagFilter]);

  // Deletion dialog states
  const [postToDelete, setPostToDelete] = React.useState<PostSummary | null>(
    null,
  );
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const loadPosts = React.useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const data = await fetchPosts({ limit: 200 });
      setPosts(data.posts);
      if (showToast) {
        toast.success("Articles refreshed from database");
      }
    } catch (err) {
      console.error("Failed to load posts:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to load articles",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Compute all available tags
  const allTags = React.useMemo(() => {
    const set = new Set<string>();
    for (const post of posts) {
      if (post.tags) {
        for (const tag of post.tags) {
          set.add(tag);
        }
      }
    }
    return Array.from(set).sort();
  }, [posts]);

  // Filtered posts based on local search, status, and tag
  const filteredData = React.useMemo(() => {
    return posts.filter((post) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = post.title.toLowerCase().includes(query);
        const matchSlug = post.slug.toLowerCase().includes(query);
        const matchDesc = post.description?.toLowerCase().includes(query);
        const matchTags = post.tags?.some((t) =>
          t.toLowerCase().includes(query),
        );
        if (!matchTitle && !matchSlug && !matchDesc && !matchTags) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === "published" && !post.is_published) return false;
      if (statusFilter === "draft" && post.is_published) return false;

      // Tag filter
      if (tagFilter !== "all") {
        if (!post.tags?.includes(tagFilter)) return false;
      }

      return true;
    });
  }, [posts, searchQuery, statusFilter, tagFilter]);

  // Toggle publish handler
  const handleTogglePublish = React.useCallback(async (post: PostSummary) => {
    const nextState = !post.is_published;
    try {
      await updatePost(post.slug, { is_published: nextState });
      setPosts((prev) =>
        prev.map((p) =>
          p.slug === post.slug ? { ...p, is_published: nextState } : p,
        ),
      );
      toast.success(
        nextState
          ? `Published "${post.title}"`
          : `Unpublished "${post.title}" (moved to draft)`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update article status",
      );
    }
  }, []);

  // Delete post handler
  const handleDeletePost = async () => {
    if (!postToDelete) return;
    try {
      await deletePost(postToDelete.slug);
      setPosts((prev) => prev.filter((p) => p.slug !== postToDelete.slug));
      toast.success(`Deleted "${postToDelete.title}"`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete article",
      );
    } finally {
      setPostToDelete(null);
    }
  };

  // Bulk publish / unpublish
  const handleBulkSetPublish = async (publish: boolean) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const targets = selectedRows.map((r) => r.original);
    if (targets.length === 0) return;

    try {
      await Promise.all(
        targets.map((post) => updatePost(post.slug, { is_published: publish })),
      );
      setPosts((prev) =>
        prev.map((p) => {
          if (targets.some((t) => t.slug === p.slug)) {
            return { ...p, is_published: publish };
          }
          return p;
        }),
      );
      setRowSelection({});
      toast.success(
        publish
          ? `Published ${targets.length} selected articles`
          : `Moved ${targets.length} selected articles to draft`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update selected articles",
      );
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const targets = selectedRows.map((r) => r.original);
    if (targets.length === 0) return;

    try {
      await Promise.all(targets.map((post) => deletePost(post.slug)));
      setPosts((prev) =>
        prev.filter((p) => !targets.some((t) => t.slug === p.slug)),
      );
      setRowSelection({});
      toast.success(`Deleted ${targets.length} selected articles`);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete selected articles",
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Metrics
  const metrics = React.useMemo(() => {
    const total = posts.length;
    const published = posts.filter((p) => p.is_published).length;
    const draft = total - published;
    return { total, published, draft, tagsCount: allTags.length };
  }, [posts, allTags]);

  const columns = React.useMemo<ColumnDef<PostSummary>[]>(
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
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Article" />
        ),
        cell: ({ row }) => {
          const post = row.original;
          return (
            <div className="flex flex-col gap-1 max-w-[380px]">
              <Link
                href={`/posts/${post.slug}`}
                className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
              >
                {post.title}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-mono text-[11px] text-muted-foreground/80">
                  /{post.slug}
                </span>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] h-4.5 px-1.5 font-normal"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{post.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "is_published",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const isPublished = row.original.is_published;
          return isPublished ? (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
            >
              <CheckCircle2 data-icon="inline-start" />
              Published
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
            >
              <Clock data-icon="inline-start" />
              Draft
            </Badge>
          );
        },
      },
      {
        accessorKey: "reading_time",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Reading Time" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock data-icon="inline-start" />
            <span>{row.original.reading_time || "1 min read"}</span>
          </div>
        ),
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Last Edited" />
        ),
        cell: ({ row }) => {
          const dateStr = row.original.updated_at || row.original.created_at;
          if (!dateStr)
            return <span className="text-xs text-muted-foreground">-</span>;
          const date = new Date(dateStr);
          return (
            <div className="flex flex-col text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="text-[11px]">
                {date.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created Date" />
        ),
        cell: ({ row }) => {
          const dateStr = row.original.created_at;
          if (!dateStr)
            return <span className="text-xs text-muted-foreground">-</span>;
          const date = new Date(dateStr);
          return (
            <div className="flex flex-col text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="text-[11px]">
                {date.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const post = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleTogglePublish(post)}
                title={
                  post.is_published ? "Unpublish to Draft" : "Publish Article"
                }
              >
                {post.is_published ? (
                  <EyeOff data-icon="inline-start" />
                ) : (
                  <Eye data-icon="inline-start" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" title="More options">
                      <MoreHorizontal data-icon="inline-start" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    render={
                      <Link
                        href={`/posts/${post.slug}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <PenSquare data-icon="inline-start" />
                        <span>Edit Article</span>
                      </Link>
                    }
                  />
                  <DropdownMenuItem
                    render={
                      <a
                        href={`${process.env.NEXT_PUBLIC_BLOG_URL || "http://localhost:3001"}/blog/${post.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <ExternalLink data-icon="inline-start" />
                        <span>View on Blog</span>
                      </a>
                    }
                  />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setPostToDelete(post)}
                    className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 data-icon="inline-start" />
                    <span>Delete Article</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [handleTogglePublish],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRowsCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Articles & Posts
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Create, manage, and publish articles dynamically stored in
              PostgreSQL.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPosts(true)}
              disabled={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw
                data-icon="inline-start"
                className={isRefreshing ? "animate-spin" : ""}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              render={<Link href="/posts/new" className="gap-1.5" />}
            >
              <Plus data-icon="inline-start" />
              New Post
            </Button>
          </div>
        </div>
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Total Articles
              </span>
              <FileText className="size-4 text-muted-foreground" />
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
                Published
              </span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {metrics.published}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Drafts
              </span>
              <Clock className="size-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {metrics.draft}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Unique Tags
              </span>
              <Tag className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metrics.tagsCount}
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
                placeholder="Search by title, slug, or content..."
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

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                if (val) setStatusFilter(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs min-w-[130px] bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors">
                <div className="flex items-center gap-1.5 truncate">
                  <SlidersHorizontal className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground font-normal">
                    Status:
                  </span>
                  <SelectValue>
                    {(val) => {
                      if (val === "published") {
                        return (
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-500">
                            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Published
                          </span>
                        );
                      }
                      if (val === "draft") {
                        return (
                          <span className="inline-flex items-center gap-1.5 font-medium text-amber-500">
                            <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                            Drafts
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
                    All Status
                  </span>
                </SelectItem>
                <SelectItem value="published" className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Published
                  </span>
                </SelectItem>
                <SelectItem value="draft" className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    Drafts
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Tag Filter */}
            <Select
              value={tagFilter}
              onValueChange={(val) => {
                if (val) setTagFilter(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs min-w-[125px] bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors">
                <div className="flex items-center gap-1.5 truncate">
                  <Tag className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground font-normal">
                    Tag:
                  </span>
                  <SelectValue>
                    {(val) => (
                      <span className="font-medium text-foreground truncate max-w-[100px]">
                        {val === "all" ? "All" : `#${val}`}
                      </span>
                    )}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent align="start" className="min-w-[160px] max-h-64">
                <SelectItem value="all" className="text-xs">
                  All Tags ({allTags.length})
                </SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag} className="text-xs">
                    <span className="text-muted-foreground mr-1">#</span>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchQuery || statusFilter !== "all" || tagFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setTagFilter("all");
                }}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/80 hover:border-border hover:bg-accent/40 gap-1.5 transition-colors"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                  {(statusFilter !== "all" ? 1 : 0) +
                    (tagFilter !== "all" ? 1 : 0) +
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
            of {posts.length} articles
          </div>
        </div>

        {/* Posts Table */}
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          {isLoading ? (
            <TableSkeleton rowCount={5} columnCount={6} />
          ) : filteredData.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyTitle>No articles found</EmptyTitle>
                <EmptyDescription>
                  {searchQuery || statusFilter !== "all" || tagFilter !== "all"
                    ? "Try adjusting your search criteria or clear active filters."
                    : "No articles found in the database. Create your first post using the button above."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Table className="min-w-[750px]">
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
                  {table.getRowModel().rows.map((row) => (
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
                  ))}
                </TableBody>
              </Table>

              <DataTablePagination
                table={table}
                totalCount={filteredData.length}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </>
          )}
        </div>

        {/* Floating Bulk Actions Bar */}
        <DataTableBulkActions
          selectedCount={selectedRowsCount}
          totalCount={filteredData.length}
          onClearSelection={() => setRowSelection({})}
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkSetPublish(true)}
            className="h-7 gap-1 text-xs"
          >
            <CheckCircle2 data-icon="inline-start" />
            Publish
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkSetPublish(false)}
            className="h-7 gap-1 text-xs"
          >
            <EyeOff data-icon="inline-start" />
            Draft
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setIsBulkDeleting(true)}
            className="h-7 gap-1 text-xs"
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </Button>
        </DataTableBulkActions>

        {/* Delete Single Post Alert Dialog */}
        <AlertDialog
          open={!!postToDelete}
          onOpenChange={(open) => !open && setPostToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Article</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{postToDelete?.title}
                &quot;? This action cannot be undone and will permanently remove
                this post and its revisions from PostgreSQL.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDeletePost}
              >
                Delete Article
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Alert Dialog */}
        <AlertDialog open={isBulkDeleting} onOpenChange={setIsBulkDeleting}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Selected Articles</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete {selectedRowsCount}{" "}
                selected articles? This action is irreversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleBulkDelete}
              >
                Delete {selectedRowsCount} Articles
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardShell>
  );
}

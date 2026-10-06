"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowLeft,
  Clock,
  Copy,
  CornerDownRight,
  Download,
  Edit2,
  FileText,
  LayoutGrid,
  MessageSquare,
  MessagesSquare,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Table as TableIcon,
  Trash2,
  User,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface CommentAuthor {
  id?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string | null;
}

interface CommentItem {
  id: string;
  post_slug: string;
  parent_id?: string | null;
  content: string;
  is_pinned?: boolean;
  is_edited?: boolean;
  is_author?: boolean;
  created_at: string;
  updated_at?: string;
  author?: CommentAuthor;
  author_name?: string;
  author_email?: string;
  user_id?: string;
}

interface PostMeta {
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  tags: string[];
}

interface PostGroup {
  slug: string;
  title: string;
  description?: string;
  tags?: string[];
  totalComments: number;
  rootCommentsCount: number;
  repliesCount: number;
  latestCommentDate: string;
  latestCommentSnippet: string;
  authors: Array<{ name: string; username: string; avatarUrl?: string | null }>;
  comments: CommentItem[];
}

interface ThreadNode {
  comment: CommentItem;
  replies: ThreadNode[];
  parentComment?: CommentItem;
  depth: number;
}

function normalizeComment(
  raw: Partial<CommentItem> & { [key: string]: unknown },
): CommentItem {
  const authorObj = raw.author as CommentAuthor | undefined;
  const username = authorObj?.username || raw.author_name || "user";
  const fullName =
    authorObj?.full_name || raw.author_name || username || "Community Member";

  return {
    id: String(raw.id || ""),
    post_slug: String(raw.post_slug || raw.postSlug || "untitled"),
    parent_id: raw.parent_id ? String(raw.parent_id) : null,
    content: String(raw.content || ""),
    is_pinned: Boolean(raw.is_pinned),
    is_edited: Boolean(raw.is_edited),
    is_author: Boolean(raw.is_author),
    created_at: String(
      raw.created_at || raw.createdAt || new Date().toISOString(),
    ),
    updated_at: String(raw.updated_at || raw.updatedAt || ""),
    author: authorObj || {
      id: String(raw.user_id || ""),
      username,
      full_name: fullName,
      avatar_url: null,
    },
    author_name: fullName,
    author_email: authorObj?.username
      ? `@${authorObj.username}`
      : String(raw.author_email || ""),
    user_id: String(raw.user_id || authorObj?.id || ""),
  };
}

function getAuthorName(comment: CommentItem): string {
  return (
    comment.author?.full_name ||
    comment.author_name ||
    comment.author?.username ||
    "Community Member"
  );
}

function getAuthorHandle(comment: CommentItem): string {
  if (comment.author?.username) {
    return `@${comment.author.username}`;
  }
  if (comment.author_email) {
    return comment.author_email;
  }
  return "@user";
}

function formatPostSlugTitle(slug: string): string {
  if (!slug) return "Untitled Post";
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatRelativeTime(dateStr: string, isMounted: boolean): string {
  if (!dateStr) return "";
  if (!isMounted) {
    return dateStr.slice(0, 10);
  }
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 30) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return "just now";
  } catch {
    return dateStr;
  }
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function CommentsContent() {
  const [data, setData] = React.useState<CommentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);

  // View state
  const [viewMode, setViewMode] = React.useState<"by-post" | "table">(
    "by-post",
  );
  const [selectedPostSlug, setSelectedPostSlug] = React.useState<string | null>(
    null,
  );

  // Thread view options
  const [threadSortOrder, setThreadSortOrder] = React.useState<"asc" | "desc">(
    "asc",
  );
  const [threadSearch, setThreadSearch] = React.useState("");

  // Post category search
  const [postCatalogSearch, setPostCatalogSearch] = React.useState("");

  // TanStack table state (for flat table view)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Single Item Modals
  const [editTarget, setEditTarget] = React.useState<CommentItem | null>(null);
  const [editContent, setEditContent] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<CommentItem | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Reply / New Comment Modal
  const [replyTarget, setReplyTarget] = React.useState<CommentItem | null>(
    null,
  );
  const [newCommentOpen, setNewCommentOpen] = React.useState(false);
  const [newCommentContent, setNewCommentContent] = React.useState("");
  const [newCommentSlug, setNewCommentSlug] = React.useState("");
  const [postsMeta, setPostsMeta] = React.useState<PostMeta[]>([]);
  const [isCreatingComment, setIsCreatingComment] = React.useState(false);

  // Bulk Actions
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [isBulkOperating, setIsBulkOperating] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const fetchComments = React.useCallback(async () => {
    setLoading(true);
    try {
      const [commentsRes, postsRes] = await Promise.all([
        fetch("/api/comments?limit=200"),
        fetch("/api/posts"),
      ]);

      if (commentsRes.ok) {
        const json = await commentsRes.json();
        if (json.comments && Array.isArray(json.comments)) {
          setData(json.comments.map(normalizeComment));
        } else {
          setData([]);
        }
      }

      if (postsRes.ok) {
        const pJson = await postsRes.json();
        if (pJson.posts && Array.isArray(pJson.posts)) {
          setPostsMeta(pJson.posts);
        }
      }
    } catch {
      toast.error("Failed to load discussions");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Group comments by Post Slug and map with real markdown posts
  const postGroups = React.useMemo<PostGroup[]>(() => {
    const commentsBySlug = new Map<string, CommentItem[]>();
    for (const c of data) {
      const slug = c.post_slug || "untitled";
      const existing = commentsBySlug.get(slug);
      if (existing) {
        existing.push(c);
      } else {
        commentsBySlug.set(slug, [c]);
      }
    }

    const metaBySlug = new Map<string, PostMeta>();
    for (const pm of postsMeta) {
      metaBySlug.set(pm.slug, pm);
    }

    // Merge slugs from realm-reference markdown posts and existing comments
    const allSlugs = new Set<string>();
    for (const pm of postsMeta) {
      allSlugs.add(pm.slug);
    }
    for (const slug of commentsBySlug.keys()) {
      allSlugs.add(slug);
    }

    const groups: PostGroup[] = [];
    for (const slug of allSlugs) {
      const items = commentsBySlug.get(slug) || [];
      const meta = metaBySlug.get(slug);

      const sortedByDateDesc = [...items].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const rootCount = items.filter((c) => !c.parent_id).length;
      const repliesCount = items.length - rootCount;

      const seenUsernames = new Set<string>();
      const authors: Array<{
        name: string;
        username: string;
        avatarUrl?: string | null;
      }> = [];
      for (const item of items) {
        const username = item.author?.username || item.author_name || "user";
        if (!seenUsernames.has(username)) {
          seenUsernames.add(username);
          authors.push({
            name: getAuthorName(item),
            username: getAuthorHandle(item),
            avatarUrl: item.author?.avatar_url,
          });
        }
      }

      const postTitle = meta?.title || formatPostSlugTitle(slug);
      const snippet =
        sortedByDateDesc[0]?.content ||
        (meta?.description
          ? meta.description
          : "No discussions yet on this article.");

      groups.push({
        slug,
        title: postTitle,
        description: meta?.description || "",
        tags: meta?.tags || [],
        totalComments: items.length,
        rootCommentsCount: rootCount,
        repliesCount,
        latestCommentDate:
          sortedByDateDesc[0]?.created_at || meta?.createdAt || "",
        latestCommentSnippet: snippet,
        authors,
        comments: items,
      });
    }

    return groups.sort((a, b) => {
      if (a.totalComments > 0 && b.totalComments === 0) return -1;
      if (a.totalComments === 0 && b.totalComments > 0) return 1;
      const timeA = a.latestCommentDate
        ? new Date(a.latestCommentDate).getTime()
        : 0;
      const timeB = b.latestCommentDate
        ? new Date(b.latestCommentDate).getTime()
        : 0;
      return timeB - timeA;
    });
  }, [data, postsMeta]);

  // Filtered post groups for the catalog
  const filteredPostGroups = React.useMemo(() => {
    if (!postCatalogSearch.trim()) return postGroups;
    const q = postCatalogSearch.toLowerCase();
    return postGroups.filter(
      (g) =>
        g.slug.toLowerCase().includes(q) ||
        g.title.toLowerCase().includes(q) ||
        (g.description?.toLowerCase().includes(q) ?? false) ||
        (g.tags?.some((t) => t.toLowerCase().includes(q)) ?? false) ||
        g.comments.some(
          (c) =>
            c.content.toLowerCase().includes(q) ||
            getAuthorName(c).toLowerCase().includes(q),
        ),
    );
  }, [postGroups, postCatalogSearch]);

  // Selected post group data
  const currentPostGroup = React.useMemo(() => {
    if (!selectedPostSlug) return null;
    return postGroups.find((g) => g.slug === selectedPostSlug) || null;
  }, [postGroups, selectedPostSlug]);

  // Build the threaded comment tree for the selected post
  const threadedComments = React.useMemo<ThreadNode[]>(() => {
    if (!currentPostGroup) return [];

    const postComments = currentPostGroup.comments;
    const commentMap = new Map<string, CommentItem>();
    for (const c of postComments) {
      commentMap.set(c.id, c);
    }

    const repliesByParent = new Map<string, CommentItem[]>();
    const rootItems: CommentItem[] = [];

    for (const c of postComments) {
      if (c.parent_id && commentMap.has(c.parent_id)) {
        const existing = repliesByParent.get(c.parent_id);
        if (existing) {
          existing.push(c);
        } else {
          repliesByParent.set(c.parent_id, [c]);
        }
      } else {
        rootItems.push(c);
      }
    }

    // Helper to recursively attach replies
    function buildNode(item: CommentItem, depth: number): ThreadNode {
      const children = repliesByParent.get(item.id) || [];
      // Replies are ordered chronologically (oldest to newest)
      children.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      const parentItem = item.parent_id
        ? commentMap.get(item.parent_id)
        : undefined;

      return {
        comment: item,
        parentComment: parentItem,
        depth,
        replies: children.map((ch) => buildNode(ch, depth + 1)),
      };
    }

    // Sort root items by selected sort order
    rootItems.sort((a, b) => {
      const tA = new Date(a.created_at).getTime();
      const tB = new Date(b.created_at).getTime();
      return threadSortOrder === "asc" ? tA - tB : tB - tA;
    });

    const tree = rootItems.map((root) => buildNode(root, 0));

    // Filter within thread if search query exists
    if (!threadSearch.trim()) return tree;

    const q = threadSearch.toLowerCase();
    function filterNode(node: ThreadNode): ThreadNode | null {
      const matchesSelf =
        node.comment.content.toLowerCase().includes(q) ||
        getAuthorName(node.comment).toLowerCase().includes(q) ||
        getAuthorHandle(node.comment).toLowerCase().includes(q);

      const filteredReplies = node.replies
        .map(filterNode)
        .filter((r): r is ThreadNode => r !== null);

      if (matchesSelf || filteredReplies.length > 0) {
        return {
          ...node,
          replies: filteredReplies,
        };
      }
      return null;
    }

    return tree.map(filterNode).filter((n): n is ThreadNode => n !== null);
  }, [currentPostGroup, threadSortOrder, threadSearch]);

  // Overall metrics
  const totalReplies = React.useMemo(() => {
    return data.filter((c) => Boolean(c.parent_id)).length;
  }, [data]);

  const totalUniqueAuthors = React.useMemo(() => {
    const authors = new Set(
      data.map((c) => c.author?.username || c.author_name).filter(Boolean),
    );
    return authors.size;
  }, [data]);

  // Handlers for comments
  const handleUpdate = async () => {
    if (!editTarget) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          content: editContent,
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      setData((prev) =>
        prev.map((c) =>
          c.id === editTarget.id
            ? { ...c, content: editContent, is_edited: true }
            : c,
        ),
      );

      toast.success("Comment updated successfully");
      setEditTarget(null);
    } catch {
      toast.error("Failed to update comment");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/comments?id=${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      // Cascading removal of the comment and its replies
      setData((prev) => {
        const deletedIds = new Set<string>([deleteTarget.id]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const c of prev) {
            if (
              c.parent_id &&
              deletedIds.has(c.parent_id) &&
              !deletedIds.has(c.id)
            ) {
              deletedIds.add(c.id);
              changed = true;
            }
          }
        }
        return prev.filter((c) => !deletedIds.has(c.id));
      });

      toast.success("Comment deleted successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateComment = async () => {
    const targetSlug =
      replyTarget?.post_slug ||
      selectedPostSlug ||
      newCommentSlug ||
      postGroups[0]?.slug;
    if (!targetSlug || !newCommentContent.trim()) return;

    setIsCreatingComment(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: targetSlug,
          content: newCommentContent.trim(),
          parent_id: replyTarget ? replyTarget.id : undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to post comment");
      const json = await res.json();

      if (json.comment) {
        const normalized = normalizeComment(json.comment);
        setData((prev) => [...prev, normalized]);
      } else {
        await fetchComments();
      }

      toast.success(
        replyTarget
          ? "Reply posted successfully"
          : "Comment added successfully",
      );
      setReplyTarget(null);
      setNewCommentOpen(false);
      setNewCommentContent("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setIsCreatingComment(false);
    }
  };

  const copyToClipboard = React.useCallback((text: string, label = "Item") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  // TanStack table columns for flat table view
  const columns = React.useMemo<ColumnDef<CommentItem>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
            aria-label="Select all"
            className="translate-y-0.5"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="Select row"
            className="translate-y-0.5"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "post_slug",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Article Slug" />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              setSelectedPostSlug(row.original.post_slug);
              setViewMode("by-post");
            }}
            className="font-mono text-xs text-primary hover:underline text-left cursor-pointer"
          >
            {row.original.post_slug}
          </button>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => {
          const isReply = Boolean(row.original.parent_id);
          return isReply ? (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 text-muted-foreground"
            >
              <CornerDownRight className="h-3 w-3 text-primary" /> Reply
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <MessageSquare className="h-3 w-3" /> Thread
            </Badge>
          );
        },
      },
      {
        accessorKey: "content",
        header: "Comment",
        cell: ({ row }) => (
          <div className="max-w-md">
            <p className="text-xs text-foreground line-clamp-2">
              {row.original.content}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "author_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Author" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">
              {getAuthorName(row.original)}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {getAuthorHandle(row.original)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(row.original.created_at, mounted)}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPostSlug(item.post_slug);
                  setViewMode("by-post");
                }}
                className="h-7 px-2 text-xs gap-1 cursor-pointer"
              >
                <CornerDownRight className="h-3 w-3" /> Thread
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={() => {
                      setReplyTarget(item);
                      setNewCommentContent("");
                      setNewCommentOpen(true);
                    }}
                    className="text-xs cursor-pointer gap-1.5"
                  >
                    <Reply className="h-3.5 w-3.5" /> Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditTarget(item);
                      setEditContent(item.content);
                    }}
                    className="text-xs cursor-pointer gap-1.5"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => copyToClipboard(item.id, "Comment ID")}
                    className="text-xs cursor-pointer gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(item)}
                    className="text-xs text-destructive focus:text-destructive cursor-pointer gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [mounted, copyToClipboard],
  );

  const filteredFlatData = React.useMemo(() => {
    if (!globalFilter.trim()) return data;
    const q = globalFilter.toLowerCase();
    return data.filter(
      (c) =>
        c.content.toLowerCase().includes(q) ||
        c.post_slug.toLowerCase().includes(q) ||
        getAuthorName(c).toLowerCase().includes(q) ||
        getAuthorHandle(c).toLowerCase().includes(q),
    );
  }, [data, globalFilter]);

  const table = useReactTable({
    data: filteredFlatData,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const selectedCount = Object.keys(rowSelection).length;

  const handleBulkDelete = async () => {
    setIsBulkOperating(true);
    const selectedRows = table.getSelectedRowModel().rows;
    const ids = selectedRows.map((r) => r.original.id);
    let successCount = 0;

    for (const id of ids) {
      try {
        const res = await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      } catch {
        // continue with remaining
      }
    }

    setData((prev) => prev.filter((c) => !ids.includes(c.id)));
    setRowSelection({});
    setBulkDeleteOpen(false);
    setIsBulkOperating(false);
    toast.success(`Deleted ${successCount} comments`);
  };

  // Export helper
  const handleExport = (format: "json" | "csv") => {
    const exportDataset = selectedPostSlug
      ? currentPostGroup?.comments || []
      : data;
    if (format === "json") {
      const blob = new Blob([JSON.stringify(exportDataset, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comments-${selectedPostSlug || "all"}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = [
        "ID",
        "Article Slug",
        "Parent ID",
        "Author",
        "Content",
        "Created At",
      ];
      const rows = exportDataset.map((c) => [
        c.id,
        c.post_slug,
        c.parent_id || "",
        getAuthorName(c),
        `"${c.content.replace(/"/g, '""')}"`,
        c.created_at,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comments-${selectedPostSlug || "all"}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-primary" />
            Comments & Discussions
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organized by article slug with hierarchical conversation threads and
            replies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/30">
            <Button
              variant={viewMode === "by-post" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("by-post")}
              className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer shadow-none"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              By Article
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer shadow-none"
            >
              <TableIcon className="h-3.5 w-3.5" />
              All Comments
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchComments}
            disabled={loading}
            className="h-8 gap-1.5 text-xs cursor-pointer"
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
                className="h-8 gap-1.5 text-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={() => handleExport("json")}
                className="text-xs cursor-pointer"
              >
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("csv")}
                className="text-xs cursor-pointer"
              >
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading && data.length === 0 ? (
        <TableSkeleton rowCount={6} />
      ) : viewMode === "by-post" ? (
        /* ========================================================================= */
        /* BY-POST VIEW: EITHER CATALOG OR SELECTED POST DISCUSSION THREAD */
        /* ========================================================================= */
        selectedPostSlug && currentPostGroup ? (
          /* THREAD VIEW FOR SELECTED POST */
          <div className="space-y-4">
            {/* Thread Navigation & Details Banner */}
            <Card className="border-border/80 bg-card/60">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPostSlug(null)}
                        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        All Articles
                      </Button>
                      <span className="text-muted-foreground/60 text-xs">
                        /
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs px-2 py-0.5"
                      >
                        {currentPostGroup.slug}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-bold text-foreground tracking-tight">
                      {currentPostGroup.title}
                    </h3>

                    {currentPostGroup.description && (
                      <p className="text-xs text-muted-foreground max-w-2xl">
                        {currentPostGroup.description}
                      </p>
                    )}

                    {currentPostGroup.tags &&
                      currentPostGroup.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {currentPostGroup.tags.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="text-[10px] px-2 py-0 text-muted-foreground/80 font-normal"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <MessageSquare className="h-3 w-3" />
                        {currentPostGroup.totalComments} comments
                      </Badge>
                      <span>•</span>
                      <span>
                        {currentPostGroup.rootCommentsCount} primary threads
                      </span>
                      <span>•</span>
                      <span>{currentPostGroup.repliesCount} replies</span>
                      <span>•</span>
                      <span>
                        Last active{" "}
                        {formatRelativeTime(
                          currentPostGroup.latestCommentDate,
                          mounted,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Switcher */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Switch Post Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={selectedPostSlug}
                        onValueChange={(slug) => setSelectedPostSlug(slug)}
                      >
                        <SelectTrigger className="h-8.5 w-[210px] text-xs">
                          <SelectValue placeholder="Switch article" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {postGroups.map((g) => (
                            <SelectItem
                              key={g.slug}
                              value={g.slug}
                              className="text-xs"
                            >
                              <span className="font-medium truncate">
                                {g.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-1.5">
                                ({g.totalComments})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sort Order Toggle */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setThreadSortOrder((prev) =>
                          prev === "asc" ? "desc" : "asc",
                        )
                      }
                      className="h-8.5 text-xs gap-1.5 cursor-pointer"
                      title={
                        threadSortOrder === "asc"
                          ? "Oldest First"
                          : "Newest First"
                      }
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {threadSortOrder === "asc"
                        ? "Reading Order"
                        : "Newest First"}
                    </Button>

                    {/* New Comment Button */}
                    <Button
                      size="sm"
                      onClick={() => {
                        setReplyTarget(null);
                        setNewCommentContent("");
                        setNewCommentOpen(true);
                      }}
                      className="h-8.5 text-xs gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Comment
                    </Button>
                  </div>
                </div>

                {/* Filter within thread */}
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-3">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filter comments in this article..."
                      value={threadSearch}
                      onChange={(e) => setThreadSearch(e.target.value)}
                      className="pl-8 text-xs h-7.5 rounded-md"
                    />
                    {threadSearch && (
                      <button
                        type="button"
                        onClick={() => setThreadSearch("")}
                        aria-label="Clear search"
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] text-muted-foreground">
                    Showing {threadedComments.length} thread
                    {threadedComments.length === 1 ? "" : "s"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Conversation Threads Tree */}
            <div className="space-y-4">
              {threadedComments.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    No comments match your search
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try clearing your filter or add a new comment to this
                    article.
                  </p>
                </Card>
              ) : (
                threadedComments.map((rootNode) => (
                  <ThreadNodeCard
                    key={rootNode.comment.id}
                    node={rootNode}
                    mounted={mounted}
                    onReply={(c) => {
                      setReplyTarget(c);
                      setNewCommentContent("");
                      setNewCommentOpen(true);
                    }}
                    onEdit={(c) => {
                      setEditTarget(c);
                      setEditContent(c.content);
                    }}
                    onDelete={(c) => setDeleteTarget(c)}
                    onCopyId={(id) => copyToClipboard(id, "Comment ID")}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          /* POST CATEGORIES OVERVIEW */
          <div className="space-y-6">
            {/* Summary Metrics Row */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-4 border-border/80 bg-card/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <span className="p-1 rounded-md bg-primary/10 text-primary">
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                    Active Articles
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Coverage
                  </Badge>
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {postGroups.length}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Articles with reader discussions
                  </p>
                </div>
              </Card>

              <Card className="p-4 border-border/80 bg-card/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <span className="p-1 rounded-md bg-indigo-500/10 text-indigo-400">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                    Total Comments
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Catalog
                  </Badge>
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {data.length}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Across all published posts
                  </p>
                </div>
              </Card>

              <Card className="p-4 border-border/80 bg-card/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <span className="p-1 rounded-md bg-amber-500/10 text-amber-400">
                      <CornerDownRight className="h-3.5 w-3.5" />
                    </span>
                    Threaded Replies
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Conversations
                  </Badge>
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {totalReplies}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Replies to previous remarks
                  </p>
                </div>
              </Card>

              <Card className="p-4 border-border/80 bg-card/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                      <User className="h-3.5 w-3.5" />
                    </span>
                    Contributors
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Community
                  </Badge>
                </div>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {totalUniqueAuthors}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Unique active comment authors
                  </p>
                </div>
              </Card>
            </div>

            {/* Catalog Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter articles by slug or comments..."
                  value={postCatalogSearch}
                  onChange={(e) => setPostCatalogSearch(e.target.value)}
                  className="pl-8 text-xs h-9 rounded-lg"
                />
                {postCatalogSearch && (
                  <button
                    type="button"
                    onClick={() => setPostCatalogSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <span className="text-xs text-muted-foreground">
                Showing {filteredPostGroups.length} article discussion
                {filteredPostGroups.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Post Catalog Cards Grid */}
            {filteredPostGroups.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-foreground">
                  No articles with comments found
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {postCatalogSearch
                    ? "Try adjusting your filter search term."
                    : "No comments have been posted to any articles yet."}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPostGroups.map((group) => (
                  <Card
                    key={group.slug}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPostSlug(group.slug)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPostSlug(group.slug);
                      }
                    }}
                    className="group relative overflow-hidden border-border/80 bg-card/70 hover:bg-card hover:border-primary/40 hover:shadow-md transition-colors duration-200 cursor-pointer flex flex-col justify-between text-left"
                  >
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Top Badges & Slug */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{group.slug}</span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0.5 shrink-0 font-medium"
                        >
                          {group.totalComments}{" "}
                          {group.totalComments === 1 ? "comment" : "comments"}
                        </Badge>
                      </div>

                      {/* Post Title */}
                      <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {group.title}
                      </h4>

                      {/* Post Tags */}
                      {group.tags && group.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {group.tags.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 text-muted-foreground/80 font-normal"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Comment metrics */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {group.rootCommentsCount} thread
                          {group.rootCommentsCount === 1 ? "" : "s"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CornerDownRight className="h-3 w-3" />
                          {group.repliesCount} repl
                          {group.repliesCount === 1 ? "y" : "ies"}
                        </span>
                      </div>

                      {/* Latest Comment Snippet */}
                      {group.latestCommentSnippet && (
                        <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
                          <div className="text-[10px] text-muted-foreground mb-1 flex items-center justify-between">
                            <span>Latest discussion</span>
                            <span>
                              {formatRelativeTime(
                                group.latestCommentDate,
                                mounted,
                              )}
                            </span>
                          </div>
                          <p className="text-foreground/80 line-clamp-2 italic">
                            "{group.latestCommentSnippet}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                      {/* Authors avatars cluster */}
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {group.authors.slice(0, 4).map((a) => (
                          <Avatar
                            key={a.username || a.name}
                            className="h-6 w-6 border-2 border-background ring-1 ring-border text-[9px]"
                          >
                            <AvatarImage src={a.avatarUrl || ""} alt={a.name} />
                            <AvatarFallback className="text-[9px] font-semibold bg-muted">
                              {a.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {group.authors.length > 4 && (
                          <span className="text-[10px] text-muted-foreground pl-2">
                            +{group.authors.length - 4} more
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-medium text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>View thread</span>
                        <CornerDownRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* FLAT DATA TABLE VIEW (FOR BULK MODERATION) */
        /* ========================================================================= */
        <Card className="overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-border bg-card/40 space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search comments, author, slug..."
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

              <span className="text-xs text-muted-foreground">
                {filteredFlatData.length} comment
                {filteredFlatData.length === 1 ? "" : "s"} total
              </span>
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
                {table.getRowModel().rows.length ? (
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
                      className="h-24 text-center text-xs"
                    >
                      No comments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>

          <DataTablePagination table={table} />
        </Card>
      )}

      {/* Bulk Action Sticky Bar (Table View) */}
      {viewMode === "table" && (
        <DataTableBulkActions
          selectedCount={selectedCount}
          totalCount={filteredFlatData.length}
          onClearSelection={() => setRowSelection({})}
        >
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Selected
          </Button>
        </DataTableBulkActions>
      )}

      {/* Edit Comment Modal */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Edit Comment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify the comment content. Updates will be visible in the thread.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Author</Label>
              <Input
                disabled
                value={
                  editTarget
                    ? `${getAuthorName(editTarget)} (${getAuthorHandle(editTarget)})`
                    : ""
                }
                className="text-xs h-8 bg-muted"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Article</Label>
              <Input
                disabled
                value={editTarget?.post_slug || ""}
                className="text-xs h-8 bg-muted font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comment-content" className="text-xs">
                Comment Content
              </Label>
              <Textarea
                id="comment-content"
                rows={4}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditTarget(null)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={isUpdating || !editContent.trim()}
              className="text-xs cursor-pointer"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply / Add Comment Modal */}
      <Dialog
        open={newCommentOpen}
        onOpenChange={(open) => {
          if (!open) {
            setNewCommentOpen(false);
            setReplyTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {replyTarget
                ? `Reply to ${getAuthorName(replyTarget)}`
                : "Add Comment to Article"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {replyTarget
                ? `Replying to comment #${replyTarget.id.slice(0, 8)} on "${formatPostSlugTitle(replyTarget.post_slug)}".`
                : `Posting a new root comment on "${formatPostSlugTitle(selectedPostSlug || "")}".`}
            </DialogDescription>
          </DialogHeader>

          {replyTarget && (
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <span>{getAuthorName(replyTarget)} wrote:</span>
              </div>
              <p className="text-foreground/80 line-clamp-3 italic">
                "{replyTarget.content}"
              </p>
            </div>
          )}

          {!replyTarget && !selectedPostSlug && (
            <div className="space-y-1.5 py-1">
              <Label className="text-xs">Article</Label>
              <Select
                value={newCommentSlug || postGroups[0]?.slug || ""}
                onValueChange={(val) => setNewCommentSlug(val || "")}
              >
                <SelectTrigger className="h-8.5 text-xs">
                  <SelectValue placeholder="Select an article" />
                </SelectTrigger>
                <SelectContent>
                  {postGroups.map((g) => (
                    <SelectItem key={g.slug} value={g.slug} className="text-xs">
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="new-comment" className="text-xs">
                Your Response
              </Label>
              <Textarea
                id="new-comment"
                rows={4}
                placeholder="Type comment or reply..."
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewCommentOpen(false);
                setReplyTarget(null);
              }}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateComment}
              disabled={isCreatingComment || !newCommentContent.trim()}
              className="text-xs cursor-pointer gap-1.5"
            >
              {isCreatingComment
                ? "Posting..."
                : replyTarget
                  ? "Post Reply"
                  : "Post Comment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Delete Comment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete this comment
              {deleteTarget?.parent_id
                ? ""
                : " and any direct replies under it"}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Alert */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Delete {selectedCount} Selected Comments?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove {selectedCount} comments? This
              action will permanently delete them from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkOperating}
              className="text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isBulkOperating
                ? "Deleting..."
                : `Delete ${selectedCount} Comments`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Single Thread Node component (renders comment and recursively its replies)
interface ThreadNodeCardProps {
  node: ThreadNode;
  mounted: boolean;
  onReply: (comment: CommentItem) => void;
  onEdit: (comment: CommentItem) => void;
  onDelete: (comment: CommentItem) => void;
  onCopyId: (id: string) => void;
}

function ThreadNodeCard({
  node,
  mounted,
  onReply,
  onEdit,
  onDelete,
  onCopyId,
}: ThreadNodeCardProps) {
  const { comment, replies, parentComment, depth } = node;
  const authorName = getAuthorName(comment);
  const authorHandle = getAuthorHandle(comment);
  const isReply = depth > 0;

  return (
    <div className={`relative ${isReply ? "mt-3" : "mt-4"}`}>
      <Card
        className={`border-border/80 ${
          isReply ? "bg-card/40 border-l-2 border-l-primary/60" : "bg-card/80"
        } transition-colors duration-200`}
      >
        <CardContent className="p-3.5 sm:p-4 space-y-2.5">
          {/* Comment Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-7 w-7 rounded-full border border-border text-[10px]">
                <AvatarImage
                  src={comment.author?.avatar_url || ""}
                  alt={authorName}
                />
                <AvatarFallback className="text-[10px] font-medium bg-muted">
                  {authorName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                <span className="font-semibold text-xs text-foreground truncate">
                  {authorName}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono truncate">
                  {authorHandle}
                </span>

                {comment.is_author && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                  >
                    Author
                  </Badge>
                )}

                {comment.is_edited && (
                  <span className="text-[10px] text-muted-foreground/70 italic">
                    (edited)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-[11px] text-muted-foreground whitespace-nowrap"
                title={formatFullDate(comment.created_at)}
              >
                {formatRelativeTime(comment.created_at, mounted)}
              </span>

              {/* Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 cursor-pointer"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    onClick={() => onReply(comment)}
                    className="text-xs cursor-pointer gap-1.5"
                  >
                    <Reply className="h-3.5 w-3.5" /> Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onEdit(comment)}
                    className="text-xs cursor-pointer gap-1.5"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onCopyId(comment.id)}
                    className="text-xs cursor-pointer gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(comment)}
                    className="text-xs text-destructive focus:text-destructive cursor-pointer gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Replying-to contextual banner */}
          {parentComment && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/40 w-fit">
              <CornerDownRight className="h-3 w-3 text-primary shrink-0" />
              <span>
                Replying to{" "}
                <strong className="text-foreground">
                  {getAuthorName(parentComment)}
                </strong>
              </span>
            </div>
          )}

          {/* Comment Content */}
          <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </div>

          {/* Bottom inline actions */}
          <div className="pt-1 flex items-center justify-between border-t border-border/40 text-[11px]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment)}
              className="h-6 px-1.5 text-[11px] gap-1 text-muted-foreground hover:text-primary cursor-pointer -ml-1"
            >
              <Reply className="h-3 w-3" />
              Reply
            </Button>

            {replies.length > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <CornerDownRight className="h-3 w-3" />
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recursive replies with visual vertical thread connector line */}
      {replies.length > 0 && (
        <div className="ml-4 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-border/70 space-y-2">
          {replies.map((replyNode) => (
            <ThreadNodeCard
              key={replyNode.comment.id}
              node={replyNode}
              mounted={mounted}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onCopyId={onCopyId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentsPage() {
  return (
    <DashboardShell>
      <CommentsContent />
    </DashboardShell>
  );
}

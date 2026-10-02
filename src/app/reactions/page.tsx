"use client";

import {
  AlertTriangle,
  Flame,
  Heart,
  RefreshCw,
  Rocket,
  Sparkles,
  ThumbsUp,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReactionDetail {
  reaction_type: string;
  count: number;
}

interface PostReactionSummary {
  post_slug: string;
  total_reactions: number;
  reactions: ReactionDetail[];
}

const reactionIcons: Record<string, React.ReactNode> = {
  heart: <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />,
  fire: <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />,
  thumbs_up: <ThumbsUp className="h-3.5 w-3.5 text-blue-500 fill-blue-500" />,
  sparkles: (
    <Sparkles className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
  ),
  rocket: <Rocket className="h-3.5 w-3.5 text-violet-500 fill-violet-500" />,
};

export default function ReactionsPage() {
  const [summaries, setSummaries] = React.useState<PostReactionSummary[]>([]);
  const [totalReactions, setTotalReactions] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    post_slug: string;
    reaction_type: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchReactions = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reactions");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.summaries) {
        setSummaries(json.summaries);
        setTotalReactions(json.total_reactions || 0);
      }
    } catch {
      toast.error("Failed to load reactions");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/reactions?post_slug=${encodeURIComponent(
          deleteTarget.post_slug,
        )}&reaction_type=${encodeURIComponent(deleteTarget.reaction_type)}`,
        { method: "DELETE" },
      );

      if (!res.ok) throw new Error("Delete failed");

      toast.success("Reaction counts cleared");
      fetchReactions();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to reset reaction count");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Post Reactions
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Aggregate sentiment, likes, and engagement per article.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReactions}
              disabled={loading}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Aggregate Stats Card */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Total Reactions
            </span>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {totalReactions}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Across all blog posts
            </span>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Engaged Articles
            </span>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {summaries.length}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Articles with reactions
            </span>
          </Card>
        </div>

        {/* Reaction Breakdown Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Post Reaction Ledger
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown by article and reaction type
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 border-t border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post Slug</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Reactions Breakdown</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.length ? (
                  summaries.map((item) => (
                    <TableRow key={item.post_slug}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {item.post_slug}
                      </TableCell>
                      <TableCell className="font-semibold text-xs">
                        {item.total_reactions}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {item.reactions?.map((r) => (
                            <Badge
                              key={r.reaction_type}
                              variant="outline"
                              className="text-xs gap-1 py-0.5 px-2 font-normal"
                            >
                              {reactionIcons[r.reaction_type] || (
                                <Sparkles className="h-3 w-3" />
                              )}
                              <span className="capitalize">
                                {r.reaction_type}
                              </span>
                              :<span className="font-bold">{r.count}</span>
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.reactions?.map((r) => (
                            <Button
                              key={r.reaction_type}
                              variant="ghost"
                              size="sm"
                              title={`Reset ${r.reaction_type}`}
                              onClick={() =>
                                setDeleteTarget({
                                  post_slug: item.post_slug,
                                  reaction_type: r.reaction_type,
                                })
                              }
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {r.reaction_type}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-xs text-muted-foreground"
                    >
                      {loading
                        ? "Loading reactions..."
                        : "No post reactions recorded."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Reset Reaction Count?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Are you sure you want to reset all{" "}
                <span className="font-semibold text-foreground">
                  {deleteTarget?.reaction_type}
                </span>{" "}
                reactions for post{" "}
                <span className="font-mono text-foreground">
                  {deleteTarget?.post_slug}
                </span>
                ?
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
                {isDeleting ? "Resetting..." : "Confirm Reset"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardShell>
  );
}

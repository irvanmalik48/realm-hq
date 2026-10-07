"use client";

import {
  ArrowLeft,
  Clock,
  ExternalLink,
  FileEdit,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  deletePost,
  fetchPostBySlug,
  type PostDetail,
  updatePost,
} from "@/lib/api/posts";

export default function EditPostPage() {
  return (
    <React.Suspense
      fallback={
        <DashboardShell>
          <div className="flex h-[50vh] items-center justify-center">
            <Skeleton className="h-48 w-full max-w-xl rounded-xl" />
          </div>
        </DashboardShell>
      }
    >
      <EditPostContent />
    </React.Suspense>
  );
}

function EditPostContent() {
  const params = useParams();
  const router = useRouter();
  const slugParam = params.slug as string;

  const [post, setPost] = React.useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  // Form states
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [coverImage, setCoverImage] = React.useState("");
  const [content, setContent] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [isPublished, setIsPublished] = React.useState(true);

  React.useEffect(() => {
    let ignore = false;
    async function loadPost() {
      if (!slugParam) return;
      try {
        setIsLoading(true);
        const data = await fetchPostBySlug(slugParam);
        if (ignore) return;
        setPost(data);
        setTitle(data.title);
        setSlug(data.slug);
        setDescription(data.description || "");
        setCoverImage(data.cover_image || "");
        setContent(data.content || "");
        setTags(data.tags || []);
        setIsPublished(data.is_published);
      } catch (err) {
        if (ignore) return;
        console.error("Failed to load post:", err);
        toast.error(err instanceof Error ? err.message : "Article not found");
      } finally {
        setIsLoading(false);
      }
    }
    loadPost();
    return () => {
      ignore = true;
    };
  }, [slugParam]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async (publishOverride?: boolean) => {
    if (!post) return;
    if (!title.trim()) {
      toast.error("Article title is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Article content is required");
      return;
    }

    const nextPublished =
      publishOverride !== undefined ? publishOverride : isPublished;

    try {
      setIsSaving(true);
      const updated = await updatePost(post.slug, {
        title: title.trim(),
        slug: slug.trim() !== post.slug ? slug.trim() : undefined,
        description: description.trim() || undefined,
        cover_image: coverImage.trim() || undefined,
        content: content.trim(),
        tags,
        is_published: nextPublished,
      });

      setPost(updated);
      setIsPublished(updated.is_published);
      toast.success("Article updated successfully!");

      // If slug changed, update URL
      if (updated.slug !== post.slug) {
        router.replace(`/posts/${updated.slug}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save article",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    try {
      setIsDeleting(true);
      await deletePost(post.slug);
      toast.success(`Deleted "${post.title}"`);
      router.push("/posts");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete article",
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[500px] lg:col-span-2" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!post) {
    return (
      <DashboardShell>
        <Empty className="py-20">
          <EmptyHeader>
            <EmptyTitle>Article not found</EmptyTitle>
            <EmptyDescription>
              The requested article slug &quot;{slugParam}&quot; does not exist
              in the database.
            </EmptyDescription>
          </EmptyHeader>
          <Button render={<Link href="/posts" />} className="mt-4">
            <ArrowLeft data-icon="inline-start" />
            Back to Posts
          </Button>
        </Empty>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-primary" />
              {post.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Editing article /{post.slug}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/posts" className="gap-1.5" />}
              className="flex-1 sm:flex-initial"
            >
              <ArrowLeft data-icon="inline-start" />
              Posts
            </Button>

            <Button
              variant="outline"
              size="sm"
              render={
                <a
                  href={`${process.env.NEXT_PUBLIC_BLOG_URL || "http://localhost:3001"}/blog/${post.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="gap-1.5"
                >
                  Preview
                </a>
              }
              className="flex-1 sm:flex-initial"
            >
              <ExternalLink data-icon="inline-start" />
              Preview
            </Button>

            <Button
              size="sm"
              disabled={isSaving}
              onClick={() => handleSave()}
              className="gap-1.5 flex-1 sm:flex-initial"
            >
              <Save data-icon="inline-start" />
              <span className="hidden xs:inline">Save Changes</span>
              <span className="xs:hidden">Save</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-start gap-6 pb-12">
          {/* Main Editor Section */}
          <div className="flex-1 w-full flex flex-col gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">
                  Article Content
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock data-icon="inline-start" />
                  <span>{post.reading_time || "1 min read"}</span>
                </div>
              </CardHeader>
              <CardContent>
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write your article in markdown..."
                  minHeight="550px"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Metadata Section */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
            {/* Status & Actions Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Publication
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-foreground">
                      {isPublished ? "Published" : "Draft"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {isPublished
                        ? "Visible on realm. blog"
                        : "Hidden from readers"}
                    </span>
                  </div>
                  <Switch
                    checked={isPublished}
                    onCheckedChange={(val) => {
                      setIsPublished(val);
                      handleSave(val);
                    }}
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    disabled={isSaving}
                    onClick={() => handleSave()}
                    className="w-full gap-1.5"
                  >
                    <Save data-icon="inline-start" />
                    Save Changes
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full gap-1.5"
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete Article
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Article Details Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Article Metadata
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup className="flex flex-col gap-4">
                  {/* Title */}
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel
                      htmlFor="edit-title"
                      className="text-xs font-medium"
                    >
                      Title <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="edit-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </Field>

                  {/* Slug */}
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel
                      htmlFor="edit-slug"
                      className="text-xs font-medium"
                    >
                      URL Slug
                    </FieldLabel>
                    <Input
                      id="edit-slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="h-9 font-mono text-xs"
                    />
                    <FieldDescription className="text-[11px] text-muted-foreground">
                      URL: /blog/{slug}
                    </FieldDescription>
                  </Field>

                  {/* Description */}
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel
                      htmlFor="edit-desc"
                      className="text-xs font-medium"
                    >
                      Summary / Excerpt
                    </FieldLabel>
                    <Textarea
                      id="edit-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[80px] text-xs resize-none"
                    />
                  </Field>

                  {/* Tags */}
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel className="text-xs font-medium">
                      Tags
                    </FieldLabel>
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="Add tag and press Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={handleAddTag}
                        className="h-8 px-2"
                      >
                        <Plus data-icon="inline-start" />
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="h-5 gap-1 px-1.5 text-[10px]"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-destructive cursor-pointer"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <X className="size-2.5" />
                              <span className="sr-only">Remove tag {tag}</span>
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Field>

                  {/* Cover Image */}
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel
                      htmlFor="edit-cover"
                      className="text-xs font-medium"
                    >
                      Cover Image URL
                    </FieldLabel>
                    <Input
                      id="edit-cover"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </Field>

                  {/* Timestamps */}
                  <div className="flex flex-col gap-1.5 pt-3 border-t border-border text-[11px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Created:</span>
                      <span className="font-mono">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last Updated:</span>
                      <span className="font-mono">
                        {new Date(post.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Article</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete &quot;{post.title}
                &quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                Delete Article
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardShell>
  );
}

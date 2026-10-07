"use client";

import { ArrowLeft, FileEdit, Plus, Save, Send, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createPost } from "@/lib/api/posts";

export default function NewPostPage() {
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [autoSlug, setAutoSlug] = React.useState(true);
  const [description, setDescription] = React.useState("");
  const [coverImage, setCoverImage] = React.useState("");
  const [content, setContent] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [isPublished, setIsPublished] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Auto slugify when title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    if (autoSlug) {
      const generated = nextTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      setSlug(generated);
    }
  };

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

  const handleSubmit = async (publishState: boolean) => {
    if (!title.trim()) {
      toast.error("Article title is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Article content is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const post = await createPost({
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        cover_image: coverImage.trim() || undefined,
        content: content.trim(),
        tags,
        is_published: publishState,
      });

      toast.success(
        publishState
          ? `Article "${post.title}" published successfully!`
          : `Article "${post.title}" saved as draft!`,
      );
      router.push("/posts");
    } catch (err) {
      console.error("Create post error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to create article",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-primary" />
              Create New Article
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compose a new post using the WYSIWYG markdown editor.
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
              <span className="hidden xs:inline">Back to Posts</span>
              <span className="xs:hidden">Back</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="gap-1.5 flex-1 sm:flex-initial"
            >
              <Save data-icon="inline-start" />
              <span className="hidden xs:inline">Save Draft</span>
              <span className="xs:hidden">Draft</span>
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="gap-1.5 flex-1 sm:flex-initial"
            >
              <Send data-icon="inline-start" />
              <span className="hidden xs:inline">Publish Article</span>
              <span className="xs:hidden">Publish</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-start gap-6 pb-12">
          {/* Main Editor Section */}
          <div className="flex-1 w-full flex flex-col gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Article Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write your article in markdown or use visual formatting..."
                  minHeight="500px"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Metadata Section */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
            {/* Publishing Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Publish Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-foreground">
                      Publish Immediately
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Make article live on realm.
                    </span>
                  </div>
                  <Switch
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleSubmit(isPublished)}
                    className="w-full gap-1.5"
                  >
                    {isPublished ? (
                      <>
                        <Send data-icon="inline-start" />
                        Publish Article
                      </>
                    ) : (
                      <>
                        <Save data-icon="inline-start" />
                        Save as Draft
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Article Metadata Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Article Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup className="flex flex-col gap-4">
                  {/* Title */}
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="title" className="text-xs font-medium">
                      Title <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="title"
                      placeholder="e.g. My Arch Linux Setup"
                      value={title}
                      onChange={handleTitleChange}
                      className="h-9 text-xs"
                    />
                  </Field>

                  {/* Slug */}
                  <Field className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <FieldLabel
                        htmlFor="slug"
                        className="text-xs font-medium"
                      >
                        URL Slug
                      </FieldLabel>
                      <button
                        type="button"
                        onClick={() => setAutoSlug(!autoSlug)}
                        className="text-[11px] text-primary hover:underline cursor-pointer"
                      >
                        {autoSlug ? "Manual Slug" : "Auto Slug"}
                      </button>
                    </div>
                    <Input
                      id="slug"
                      placeholder="my-arch-linux-setup"
                      value={slug}
                      onChange={(e) => {
                        setAutoSlug(false);
                        setSlug(e.target.value);
                      }}
                      className="h-9 font-mono text-xs"
                    />
                    <FieldDescription className="text-[11px] text-muted-foreground">
                      Served at /blog/{slug || "..."}
                    </FieldDescription>
                  </Field>

                  {/* Description */}
                  <Field className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="desc" className="text-xs font-medium">
                      Summary / Excerpt
                    </FieldLabel>
                    <Textarea
                      id="desc"
                      placeholder="Short description displayed on article cards..."
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
                    <FieldLabel htmlFor="cover" className="text-xs font-medium">
                      Cover Image URL
                    </FieldLabel>
                    <Input
                      id="cover"
                      placeholder="https://images.unsplash.com/..."
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

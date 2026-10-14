"use client";

import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode,
  Globe,
  HardDrive,
  Hash,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
  WrapText,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deletePaste,
  fetchPasteBySlug,
  type PasteDetail,
} from "@/lib/api/pastes";
import { cn } from "@/lib/utils";

const SYNTAX_EXTENSIONS: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  go: "go",
  python: "py",
  rust: "rs",
  c: "c",
  cpp: "cpp",
  csharp: "cs",
  java: "java",
  kotlin: "kt",
  swift: "swift",
  php: "php",
  ruby: "rb",
  sql: "sql",
  html: "html",
  css: "css",
  scss: "scss",
  json: "json",
  yaml: "yaml",
  toml: "toml",
  xml: "xml",
  shell: "sh",
  markdown: "md",
  dockerfile: "dockerfile",
  graphql: "graphql",
  lua: "lua",
  zig: "zig",
  plaintext: "txt",
};

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

function PasteDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-6 pb-12">
        <div className="flex-1 w-full flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <Skeleton className="h-5 w-36" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[480px] w-full rounded-md" />
            </CardContent>
          </Card>
        </div>

        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PasteDetailPage() {
  return (
    <React.Suspense fallback={<PasteDetailSkeleton />}>
      <PasteDetailContent />
    </React.Suspense>
  );
}

function PasteDetailContent() {
  const params = useParams();
  const router = useRouter();
  const slugParam = params.slug as string;

  const [paste, setPaste] = React.useState<PasteDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  // Decryption state
  const [unlockPassword, setUnlockPassword] = React.useState("");
  const [showUnlockPassword, setShowUnlockPassword] = React.useState(false);
  const [isUnlocking, setIsUnlocking] = React.useState(false);
  const [unlockError, setUnlockError] = React.useState<string | null>(null);

  // Viewer options
  const [wrapLines, setWrapLines] = React.useState(true);
  const [showLineNumbers, setShowLineNumbers] = React.useState(true);

  // Copy states
  const [copiedSlug, setCopiedSlug] = React.useState(false);
  const [copiedContent, setCopiedContent] = React.useState(false);
  const [copiedRawUrl, setCopiedRawUrl] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;
    async function loadPaste() {
      if (!slugParam) return;
      try {
        setIsLoading(true);
        const data = await fetchPasteBySlug(slugParam);
        if (ignore) return;
        setPaste(data);
      } catch (err) {
        if (ignore) return;
        console.error("Failed to load paste:", err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    loadPaste();
    return () => {
      ignore = true;
    };
  }, [slugParam]);

  const lines = React.useMemo(() => {
    if (!paste?.content) return [];
    return paste.content.split("\n");
  }, [paste?.content]);

  const rawUrl = React.useMemo(() => {
    if (!paste) return "";
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const pwParam = unlockPassword
      ? `?password=${encodeURIComponent(unlockPassword)}`
      : "";
    return `${origin}/api/pastes/${paste.slug}/raw${pwParam}`;
  }, [paste, unlockPassword]);

  const handleCopy = React.useCallback(
    async (text: string, type: "slug" | "content" | "raw") => {
      try {
        await navigator.clipboard.writeText(text);
        if (type === "slug") {
          setCopiedSlug(true);
          toast.success("Slug copied to clipboard");
          setTimeout(() => setCopiedSlug(false), 2000);
        } else if (type === "content") {
          setCopiedContent(true);
          toast.success("Paste content copied to clipboard");
          setTimeout(() => setCopiedContent(false), 2000);
        } else if (type === "raw") {
          setCopiedRawUrl(true);
          toast.success("Raw link copied to clipboard");
          setTimeout(() => setCopiedRawUrl(false), 2000);
        }
      } catch (err) {
        console.error("Copy failed:", err);
        toast.error("Failed to copy to clipboard");
      }
    },
    [],
  );

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paste || !unlockPassword.trim()) {
      toast.error("Please enter the decryption passphrase");
      return;
    }
    setIsUnlocking(true);
    setUnlockError(null);
    try {
      const unlocked = await fetchPasteBySlug(
        paste.slug,
        unlockPassword.trim(),
      );
      setPaste(unlocked);
      toast.success("Snippet unlocked and decrypted successfully!");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Invalid password or failed to decrypt";
      setUnlockError(msg);
      toast.error(msg);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDownload = () => {
    if (!paste || !paste.content) return;
    const ext = SYNTAX_EXTENSIONS[paste.syntax.toLowerCase()] || "txt";
    const baseName = paste.title
      ? paste.title.trim().replace(/[^a-zA-Z0-9_-]/g, "_")
      : paste.slug;
    const filename = `${baseName}.${ext}`;
    const blob = new Blob([paste.content], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const handleDelete = async () => {
    if (!paste) return;
    try {
      setIsDeleting(true);
      await deletePaste(paste.slug);
      toast.success(`Paste "${paste.slug}" deleted`);
      router.push("/pastes", { transitionTypes: ["nav-back"] });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete paste snippet",
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return <PasteDetailSkeleton />;
  }

  if (!paste) {
    return (
      <Empty className="py-20">
        <EmptyHeader>
          <EmptyTitle>Paste Snippet Not Found</EmptyTitle>
          <EmptyDescription>
            The requested paste slug &quot;{slugParam}&quot; could not be found
            or has expired.
          </EmptyDescription>
        </EmptyHeader>
        <Button
          render={<Link href="/pastes" transitionTypes={["nav-back"]} />}
          className="mt-4 gap-1.5"
        >
          <ArrowLeft data-icon="inline-start" />
          Back to Pastebin
        </Button>
      </Empty>
    );
  }

  const expirationInfo = formatExpiration(paste.expires_at);
  const isEncryptedAndLocked = paste.is_encrypted && !paste.content;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileCode className="size-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground truncate max-w-md sm:max-w-xl">
              {paste.title || "Paste Snippet"}
            </h2>

            {paste.is_encrypted ? (
              isEncryptedAndLocked ? (
                <Badge
                  variant="outline"
                  className="gap-1 font-mono text-[11px] text-amber-500 border-amber-500/30 bg-amber-500/10"
                >
                  <Lock className="size-3" />
                  <span>Encrypted</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 text-[11px] border-emerald-500/30 text-emerald-500 bg-emerald-500/10 font-mono"
                >
                  <ShieldCheck className="size-3" />
                  <span>Decrypted</span>
                </Badge>
              )
            ) : null}

            <div className="flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              <span>{paste.slug}</span>
              <button
                type="button"
                onClick={() => handleCopy(paste.slug, "slug")}
                className="hover:text-foreground p-0.5 ml-0.5 rounded transition-colors"
                title="Copy slug"
              >
                {copiedSlug ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-mono">
              Syntax:{" "}
              <strong className="text-foreground font-semibold uppercase">
                {paste.syntax}
              </strong>
            </span>
            <span>•</span>
            <span>
              Size:{" "}
              <strong className="text-foreground font-medium">
                {formatBytes(paste.size || paste.content.length)}
              </strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Eye className="size-3 text-muted-foreground/80" />
              <span>{paste.views} views</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3 text-muted-foreground/80" />
              <span>Expires: {expirationInfo.text}</span>
            </span>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href="/pastes"
                transitionTypes={["nav-back"]}
                className="gap-1.5"
              />
            }
            className="flex-1 sm:flex-initial"
          >
            <ArrowLeft data-icon="inline-start" />
            Pastebin
          </Button>

          {!isEncryptedAndLocked && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(paste.content, "content")}
                className="gap-1.5 flex-1 sm:flex-initial"
              >
                {copiedContent ? (
                  <>
                    <Check
                      data-icon="inline-start"
                      className="text-emerald-500"
                    />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy data-icon="inline-start" />
                    <span>Copy Content</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-1.5 flex-1 sm:flex-initial"
                title="Download snippet file"
              >
                <Download data-icon="inline-start" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(rawUrl, "raw")}
            className="gap-1.5 flex-1 sm:flex-initial"
            title="Copy raw endpoint link"
          >
            {copiedRawUrl ? (
              <>
                <Check data-icon="inline-start" className="text-emerald-500" />
                <span>Copied Raw!</span>
              </>
            ) : (
              <>
                <Code2 data-icon="inline-start" />
                <span className="hidden md:inline">Copy Raw Link</span>
                <span className="md:hidden">Raw Link</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            render={
              <a
                href={rawUrl}
                target="_blank"
                rel="noreferrer"
                className="gap-1.5"
              >
                Raw View
              </a>
            }
            className="flex-1 sm:flex-initial text-muted-foreground hover:text-foreground"
            title="Open raw text in new tab"
          >
            <ExternalLink data-icon="inline-start" />
            <span>Raw View</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="gap-1.5 flex-1 sm:flex-initial"
          >
            <Trash2 data-icon="inline-start" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex flex-col lg:flex-row items-start gap-6 pb-12">
        {/* Left Column: Code Content or Password Unlock */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-6">
          {isEncryptedAndLocked ? (
            <Card className="border-amber-500/20 bg-card/60 backdrop-blur-xs overflow-hidden">
              <CardHeader className="text-center pb-2 items-center">
                <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-500 shadow-xl shadow-amber-500/5">
                  <Lock className="size-8" />
                </div>
                <CardTitle className="text-xl">
                  Password-Protected Snippet
                </CardTitle>
                <CardDescription className="max-w-md text-xs sm:text-sm mt-1">
                  This snippet is encrypted. Enter the passphrase below to
                  decrypt and view its content.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center pt-4 pb-8">
                <form
                  onSubmit={handleUnlock}
                  className="w-full max-w-sm space-y-4"
                >
                  <div className="space-y-1.5 text-left">
                    <Label
                      htmlFor="unlock-password"
                      className="text-xs font-medium"
                    >
                      Decryption Passphrase
                    </Label>
                    <div className="relative">
                      <Input
                        id="unlock-password"
                        type={showUnlockPassword ? "text" : "password"}
                        placeholder="Enter the snippet password..."
                        value={unlockPassword}
                        onChange={(e) => {
                          setUnlockPassword(e.target.value);
                          if (unlockError) setUnlockError(null);
                        }}
                        className={cn(
                          "pr-10 text-xs font-mono h-10",
                          unlockError &&
                            "border-destructive focus-visible:ring-destructive",
                        )}
                        autoFocus
                      />
                      <button
                        type="button"
                        aria-label={
                          showUnlockPassword
                            ? "Hide passphrase"
                            : "Show passphrase"
                        }
                        onClick={() =>
                          setShowUnlockPassword(!showUnlockPassword)
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      >
                        {showUnlockPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    {unlockError && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {unlockError}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2 h-10"
                    disabled={isUnlocking || !unlockPassword.trim()}
                  >
                    {isUnlocking ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Decrypting...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="size-4" />
                        <span>Unlock & View Snippet</span>
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-border/80 shadow-md">
              {/* Code Viewer Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-border/60 bg-muted/40 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="size-2.5 rounded-full bg-rose-500/70" />
                    <span className="size-2.5 rounded-full bg-amber-500/70" />
                    <span className="size-2.5 rounded-full bg-emerald-500/70" />
                  </div>
                  <span className="text-muted-foreground/60">|</span>
                  <span className="font-mono font-medium text-foreground truncate max-w-xs sm:max-w-md">
                    {paste.title
                      ? `${paste.title}.${SYNTAX_EXTENSIONS[paste.syntax.toLowerCase()] || "txt"}`
                      : `${paste.slug}.${SYNTAX_EXTENSIONS[paste.syntax.toLowerCase()] || "txt"}`}
                  </span>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] font-normal uppercase tracking-wider bg-background/50 h-5 px-1.5"
                  >
                    {paste.syntax}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground font-mono mr-2">
                    {lines.length} {lines.length === 1 ? "line" : "lines"} •{" "}
                    {paste.content.length} chars
                  </span>

                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setWrapLines(!wrapLines)}
                    className={cn(
                      "gap-1 h-7 text-[11px] px-2",
                      wrapLines && "bg-accent text-accent-foreground",
                    )}
                    title={wrapLines ? "Disable word wrap" : "Enable word wrap"}
                  >
                    <WrapText className="size-3.5" />
                    <span className="hidden sm:inline">Wrap</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowLineNumbers(!showLineNumbers)}
                    className={cn(
                      "gap-1 h-7 text-[11px] px-2",
                      showLineNumbers && "bg-accent text-accent-foreground",
                    )}
                    title={
                      showLineNumbers
                        ? "Hide line numbers"
                        : "Show line numbers"
                    }
                  >
                    <Hash className="size-3.5" />
                    <span className="hidden sm:inline">Lines</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleCopy(paste.content, "content")}
                    className="gap-1 h-7 text-[11px] px-2"
                  >
                    {copiedContent ? (
                      <>
                        <Check className="size-3 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Code Box with Line Numbers */}
              <div className="relative overflow-auto max-h-[720px] bg-background/95 dark:bg-[#0d1117] font-mono text-xs leading-relaxed">
                <div className="flex min-w-full">
                  {showLineNumbers && (
                    <div
                      aria-hidden="true"
                      className="shrink-0 select-none py-4 px-3 sm:px-4 text-right border-r border-border/40 text-muted-foreground/40 bg-muted/10 font-mono text-xs leading-relaxed min-w-[3rem] sm:min-w-[3.5rem]"
                    >
                      {lines.map((_, i) => (
                        <div key={`line-num-${i + 1}`}>{i + 1}</div>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 p-4 overflow-x-auto">
                    <pre
                      className={cn(
                        "text-foreground/90 font-mono text-xs leading-relaxed select-text font-normal",
                        wrapLines
                          ? "whitespace-pre-wrap break-all"
                          : "whitespace-pre",
                      )}
                    >
                      {paste.content}
                    </pre>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Metadata & Quick Info Sidebar */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileCode className="size-4 text-primary" />
                <span>Snippet Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Unique Slug</span>
                <span className="font-mono font-semibold text-primary">
                  {paste.slug}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Syntax</span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase font-normal"
                >
                  {paste.syntax}
                </Badge>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Size</span>
                <span className="font-mono">
                  {formatBytes(paste.size || paste.content.length)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Visibility</span>
                <span className="flex items-center gap-1.5">
                  {paste.is_public ? (
                    <>
                      <Globe className="size-3 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">
                        Public
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="size-3 text-amber-500" />
                      <span className="text-amber-500 font-medium">
                        Unlisted
                      </span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Total Views</span>
                <span className="font-mono font-medium">{paste.views}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Expiration</span>
                <span
                  className={cn(
                    "font-medium",
                    expirationInfo.isExpired
                      ? "text-destructive"
                      : "text-foreground",
                  )}
                >
                  {expirationInfo.text}
                </span>
              </div>

              <div className="flex flex-col gap-1 pb-2 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" />
                  <span>Created At</span>
                </span>
                <span className="font-mono text-[11px] text-foreground">
                  {new Date(paste.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Encryption</span>
                <span className="font-mono text-[11px]">
                  {paste.is_encrypted ? (
                    <span className="text-amber-500 font-medium">
                      AES-256 Passphrase
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None (Plain)</span>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HardDrive className="size-4 text-primary" />
                <span>Quick Access</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block">
                  Raw Endpoint
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    readOnly
                    value={rawUrl}
                    className="font-mono text-[11px] h-8 bg-muted/40"
                  />
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => handleCopy(rawUrl, "raw")}
                    className="h-8 w-8 shrink-0"
                    title="Copy raw endpoint"
                  >
                    {copiedRawUrl ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Paste Snippet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete paste snippet{" "}
              <strong className="font-mono text-foreground">
                {paste.slug}
              </strong>
              ? This action is irreversible and the content will be immediately
              purged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  <span>Delete Paste</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

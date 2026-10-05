"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Eye,
  FileCode,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  Unlink,
} from "lucide-react";
import * as React from "react";
import { Markdown } from "tiptap-markdown";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your post content in markdown...",
  className,
  minHeight = "400px",
}: MarkdownEditorProps) {
  const [mode, setMode] = React.useState<"visual" | "markdown">("visual");
  const [rawText, setRawText] = React.useState(value);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [imageAlt, setImageAlt] = React.useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = React.useState(false);
  const [imagePopoverOpen, setImagePopoverOpen] = React.useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-md max-w-full my-4",
        },
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        linkify: false,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor: ed }) => {
      // @ts-expect-error tiptap-markdown storage type
      const md = ed.storage.markdown.getMarkdown() as string;
      setRawText(md);
      onChange(md);
    },
  });

  // Keep editor content synced if external value changes drastically (e.g. initial load)
  React.useEffect(() => {
    if (editor && value !== rawText) {
      setRawText(value);
      // @ts-expect-error tiptap-markdown storage type
      const currentMd = editor.storage.markdown.getMarkdown() as string;
      if (currentMd !== value) {
        editor.commands.setContent(value);
      }
    }
  }, [value, editor, rawText]);

  const handleRawChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setRawText(nextVal);
    onChange(nextVal);
    if (editor) {
      editor.commands.setContent(nextVal);
    }
  };

  const handleAddLink = () => {
    if (!editor) return;
    if (linkUrl.trim() === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setLinkUrl("");
    setLinkPopoverOpen(false);
  };

  const handleAddImage = () => {
    if (!editor || !imageUrl.trim()) return;
    editor
      .chain()
      .focus()
      .setImage({ src: imageUrl.trim(), alt: imageAlt.trim() })
      .run();
    setImageUrl("");
    setImageAlt("");
    setImagePopoverOpen(false);
  };

  // Word count & reading time calculation
  const words = React.useMemo(() => {
    return rawText.trim().split(/\s+/).filter(Boolean).length;
  }, [rawText]);

  const readingTimeEstimate = React.useMemo(() => {
    const mins = Math.max(1, Math.ceil(words / 150));
    return `${mins} min read`;
  }, [words]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-background shadow-xs overflow-hidden",
        className,
      )}
    >
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border bg-muted/40 p-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {/* Heading Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs font-medium"
                >
                  {editor?.isActive("heading", { level: 1 }) ? (
                    <>
                      <Heading1 data-icon="inline-start" />
                      <span>H1</span>
                    </>
                  ) : editor?.isActive("heading", { level: 2 }) ? (
                    <>
                      <Heading2 data-icon="inline-start" />
                      <span>H2</span>
                    </>
                  ) : editor?.isActive("heading", { level: 3 }) ? (
                    <>
                      <Heading3 data-icon="inline-start" />
                      <span>H3</span>
                    </>
                  ) : (
                    <>
                      <Pilcrow data-icon="inline-start" />
                      <span>Text</span>
                    </>
                  )}
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuItem
                onClick={() => editor?.chain().focus().setParagraph().run()}
                className="gap-2"
              >
                <Pilcrow data-icon="inline-start" />
                <span>Paragraph</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level: 1 }).run()
                }
                className="gap-2 font-bold"
              >
                <Heading1 data-icon="inline-start" />
                <span>Heading 1</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level: 2 }).run()
                }
                className="gap-2 font-semibold"
              >
                <Heading2 data-icon="inline-start" />
                <span>Heading 2</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level: 3 }).run()
                }
                className="gap-2 font-medium"
              >
                <Heading3 data-icon="inline-start" />
                <span>Heading 3</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* Inline Styles */}
          <Button
            type="button"
            variant={editor?.isActive("bold") ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold data-icon="inline-start" />
          </Button>

          <Button
            type="button"
            variant={editor?.isActive("italic") ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic data-icon="inline-start" />
          </Button>

          <Button
            type="button"
            variant={editor?.isActive("strike") ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough data-icon="inline-start" />
          </Button>

          <Button
            type="button"
            variant={editor?.isActive("code") ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleCode().run()}
            title="Inline Code"
          >
            <Code data-icon="inline-start" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* Block Styles */}
          <Button
            type="button"
            variant={editor?.isActive("bulletList") ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List data-icon="inline-start" />
          </Button>

          <Button
            type="button"
            variant={editor?.isActive("orderedList") ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered data-icon="inline-start" />
          </Button>

          <Button
            type="button"
            variant={editor?.isActive("blockquote") ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            <Quote data-icon="inline-start" />
          </Button>

          <Button
            type="button"
            variant={editor?.isActive("codeBlock") ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          >
            <FileCode data-icon="inline-start" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            title="Horizontal Divider"
          >
            <Minus data-icon="inline-start" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* Links */}
          <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant={editor?.isActive("link") ? "secondary" : "ghost"}
                  size="icon-sm"
                  title="Add Link"
                >
                  <LinkIcon data-icon="inline-start" />
                </Button>
              }
            />
            <PopoverContent className="w-80 p-3">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Insert Link
                </span>
                <Input
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddLink();
                    }
                  }}
                  className="h-8 text-xs"
                />
                <div className="flex items-center justify-between gap-2 mt-1">
                  {editor?.isActive("link") && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="xs"
                      onClick={() => {
                        editor?.chain().focus().unsetLink().run();
                        setLinkPopoverOpen(false);
                      }}
                      className="gap-1"
                    >
                      <Unlink data-icon="inline-start" />
                      Remove
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="xs"
                    onClick={handleAddLink}
                    className="ml-auto"
                  >
                    Apply Link
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Images */}
          <Popover open={imagePopoverOpen} onOpenChange={setImagePopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Insert Image"
                >
                  <ImageIcon data-icon="inline-start" />
                </Button>
              }
            />
            <PopoverContent className="w-80 p-3">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Insert Image
                </span>
                <Input
                  placeholder="Image URL (https://...)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Alt text (optional)"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="xs"
                  onClick={handleAddImage}
                  className="mt-1 self-end"
                >
                  Insert Image
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* History */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!editor?.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
            title="Undo"
          >
            <Undo2 data-icon="inline-start" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!editor?.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
            title="Redo"
          >
            <Redo2 data-icon="inline-start" />
          </Button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border">
          <Button
            type="button"
            variant={mode === "visual" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setMode("visual")}
            className="h-6 gap-1 px-2 text-xs"
          >
            <Eye data-icon="inline-start" />
            Visual
          </Button>
          <Button
            type="button"
            variant={mode === "markdown" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setMode("markdown")}
            className="h-6 gap-1 px-2 text-xs"
          >
            <FileText data-icon="inline-start" />
            Markdown
          </Button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 bg-background" style={{ minHeight }}>
        {mode === "visual" ? (
          <div className="p-4 cursor-text">
            <EditorContent editor={editor} />
          </div>
        ) : (
          <Textarea
            value={rawText}
            onChange={handleRawChange}
            placeholder={placeholder}
            className="w-full h-full min-h-[400px] border-none rounded-none font-mono text-sm leading-relaxed p-4 focus-visible:ring-0 resize-y"
          />
        )}
      </div>

      {/* Editor Footer / Stats Bar */}
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            {words} {words === 1 ? "word" : "words"}
          </span>
          <span>•</span>
          <span>{rawText.length} characters</span>
          <span>•</span>
          <span>{readingTimeEstimate}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="size-2 rounded-full bg-emerald-500 inline-block" />
          <span>Markdown WYSIWYG</span>
        </div>
      </div>
    </div>
  );
}

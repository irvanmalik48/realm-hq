"use client";

import {
  Activity,
  Command,
  ExternalLink,
  HardDrive,
  KeyRound,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function AppFooter() {
  const currentYear = new Date().getFullYear();
  const blogUrl = process.env.NEXT_PUBLIC_BLOG_URL || "http://localhost:3001";

  return (
    <footer className="mt-auto border-t border-border/60 bg-card/25 backdrop-blur-xs transition-colors">
      <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Brand, Status & Copyright */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-2.5 text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
                <Command className="size-3" />
              </span>
              <span className="text-xs font-semibold tracking-tight">
                Realm HQ
              </span>
            </div>

            <Separator
              orientation="vertical"
              className="h-3.5 hidden sm:block"
            />

            <Badge
              variant="outline"
              className="h-4.5 px-1.5 text-[10px] font-mono font-normal gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>v0.1.0-prod</span>
            </Badge>

            <span className="text-[11px] hidden md:inline">
              &copy; {currentYear} Realm. All rights reserved.
            </span>
          </div>

          {/* Quick Shortcuts & Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground">
            <Link
              href="/telemetry"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Activity className="size-3 text-primary/70" />
              <span>Telemetry</span>
            </Link>

            <Link
              href="/logs"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ScrollText className="size-3 text-primary/70" />
              <span>Logs</span>
            </Link>

            <Link
              href="/storage"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <HardDrive className="size-3 text-primary/70" />
              <span>Storage</span>
            </Link>

            <Link
              href="/tokens"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <KeyRound className="size-3 text-primary/70" />
              <span>API Keys</span>
            </Link>

            <Separator
              orientation="vertical"
              className="h-3.5 hidden sm:block"
            />

            <a
              href={blogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <span>Live Site</span>
              <ExternalLink className="size-3 text-muted-foreground/80" />
            </a>
          </div>

          {/* Security & System Info */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Badge
              variant="outline"
              className="h-5 px-2 text-[10px] font-normal gap-1 text-muted-foreground border-border/80 bg-background/50"
            >
              <ShieldCheck className="size-3 text-emerald-500" />
              <span>Sandboxed</span>
            </Badge>

            <div className="hidden lg:flex items-center gap-1 text-[10px] text-muted-foreground/80 font-mono">
              <kbd className="px-1 py-0.2 rounded bg-muted border border-border text-[9px] shadow-2xs">
                Ctrl
              </kbd>
              <span>+</span>
              <kbd className="px-1 py-0.2 rounded bg-muted border border-border text-[9px] shadow-2xs">
                B
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Command Centre",
    subtitle: "System health and quick overview",
  },
  "/messages": {
    title: "Contact Submissions",
    subtitle: "Messages received from site visitors",
  },
  "/comments": {
    title: "Comments Moderation",
    subtitle: "Manage and moderate community comments",
  },
  "/reactions": {
    title: "Post Reactions",
    subtitle: "Aggregate reactions across articles",
  },
  "/storage": {
    title: "Storage & S3 Explorer",
    subtitle: "Zstd compressed assets and S3 bucket browser",
  },
  "/tokens": {
    title: "API Tokens",
    subtitle: "Service keys and rate-limited tokens",
  },
  "/admins": {
    title: "Admin Management & RBAC",
    subtitle: "Superadmins and role-based permissions",
  },
  "/telemetry": {
    title: "Telemetrics & Go Runtime",
    subtitle: "Live DB pool connection and memory statistics",
  },
  "/logs": {
    title: "System Logs",
    subtitle: "Real-time structured events with trace correlation",
  },
};

export function AppHeader() {
  const pathname = usePathname();
  const current = pageTitles[pathname] || {
    title: "Dashboard",
    subtitle: "Management Console",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 md:px-6 backdrop-blur-md transition-colors">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold tracking-tight leading-none text-foreground">
            {current.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className="gap-1.5 py-1 px-2.5 text-xs font-normal border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Activity className="h-3 w-3" />
          <span>gRPC Connected</span>
        </Badge>
      </div>
    </header>
  );
}

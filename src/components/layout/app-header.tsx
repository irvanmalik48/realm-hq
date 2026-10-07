"use client";

import { Activity } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Command Centre",
    subtitle: "System health and overview",
  },
  "/posts": {
    title: "Posts & Articles",
    subtitle: "Manage and publish articles to Realm",
  },
  "/posts/new": {
    title: "New Article",
    subtitle: "Compose and publish a new post",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Traffic, readership, and visitor metrics",
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
    subtitle: "Overview of likes and reactions across articles",
  },
  "/storage": {
    title: "File Storage",
    subtitle: "Manage uploaded media, documents, and bucket assets",
  },
  "/tokens": {
    title: "API Keys",
    subtitle: "Manage API keys and access tokens",
  },
  "/admins": {
    title: "Administrators",
    subtitle: "Manage admin accounts, roles, and permissions",
  },
  "/users": {
    title: "Platform Users",
    subtitle: "Manage registered user accounts, roles, and status",
  },
  "/telemetry": {
    title: "System Performance",
    subtitle: "Live database connections, server load, and memory usage",
  },
  "/logs": {
    title: "System Logs",
    subtitle: "Recent server events, warnings, and error logs",
  },
};

export function AppHeader() {
  const pathname = usePathname();
  const current =
    pageTitles[pathname] ||
    (pathname.startsWith("/posts/")
      ? { title: "Edit Article", subtitle: "Update article content and status" }
      : { title: "Dashboard", subtitle: "Management Console" });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${current.title} | Realm HQ`;
    }
  }, [current.title]);

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-3 sm:px-4 md:px-6 backdrop-blur-md transition-colors"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm font-semibold tracking-tight leading-none text-foreground truncate">
            {current.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block truncate">
            {current.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Badge
          variant="outline"
          className="gap-1.5 py-1 px-2 sm:px-2.5 text-xs font-normal border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Activity className="h-3 w-3" />
          <span className="hidden sm:inline">System Online</span>
        </Badge>
      </div>
    </header>
  );
}

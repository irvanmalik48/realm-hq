"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Dashboard Overview",
    subtitle: "Everything at a glance",
  },
  "/posts": {
    title: "Articles & Posts",
    subtitle: "Write, edit, and publish articles",
  },
  "/posts/new": {
    title: "New Article",
    subtitle: "Write and publish a new post",
  },
  "/pastes": {
    title: "Pastebin",
    subtitle: "Create and share code snippets with secure links",
  },
  "/analytics": {
    title: "Visitor Analytics",
    subtitle: "Readership, traffic, and visitor trends",
  },
  "/messages": {
    title: "Contact Messages",
    subtitle: "Messages and inquiries from website visitors",
  },
  "/comments": {
    title: "Reader Comments",
    subtitle: "Review discussions and reply to readers",
  },
  "/reactions": {
    title: "Reactions",
    subtitle: "See how readers respond to your articles",
  },
  "/storage": {
    title: "Files & Media",
    subtitle: "Manage uploaded images, media, and documents",
  },
  "/tokens": {
    title: "API Keys",
    subtitle: "Create and manage keys for external apps",
  },
  "/admins": {
    title: "Team Administrators",
    subtitle: "Manage administrator roles and team permissions",
  },
  "/users": {
    title: "Users",
    subtitle: "View and manage user accounts and security settings",
  },
  "/telemetry": {
    title: "System Health",
    subtitle: "Real-time health, processor load, and database activity",
  },
  "/logs": {
    title: "System Logs",
    subtitle: "Recent server events, notices, and error history",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Customize appearance, scrolling, and profile preferences",
  },
};

const segmentLabels: Record<string, string> = {
  posts: "Posts",
  pastes: "Pastebin",
  new: "New Article",
  analytics: "Analytics",
  messages: "Messages",
  comments: "Comments",
  reactions: "Reactions",
  storage: "Files & Media",
  tokens: "API Keys",
  admins: "Administrators",
  users: "Users",
  telemetry: "System Health",
  logs: "System Logs",
  settings: "Settings",
};

function HeaderBreadcrumbs() {
  const pathname = usePathname();
  const current =
    pageTitles[pathname] ||
    (pathname.startsWith("/posts/")
      ? { title: "Edit Article", subtitle: "Update article content and status" }
      : pathname.startsWith("/pastes/")
        ? {
            title: "Paste Details",
            subtitle: "Inspect paste content and metrics",
          }
        : { title: "Dashboard", subtitle: "Management Console" });

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${current.title} | Realm HQ`;
    }
  }, [current.title]);

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <Breadcrumb className="truncate">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-foreground">
              Dashboard
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb className="truncate">
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink
            render={
              <Link href="/" transitionTypes={["nav-back"]}>
                Dashboard
              </Link>
            }
          />
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden sm:inline-flex" />
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const label =
            segmentLabels[segment] ||
            (segment.length > 20 ? `${segment.slice(0, 18)}...` : segment);

          if (isLast) {
            return (
              <BreadcrumbItem key={href}>
                <BreadcrumbPage className="font-semibold text-foreground truncate max-w-48 sm:max-w-none">
                  {label}
                </BreadcrumbPage>
              </BreadcrumbItem>
            );
          }

          return (
            <span
              key={href}
              className="inline-flex items-center gap-1.5 sm:gap-2.5"
            >
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink
                  render={
                    <Link href={href} transitionTypes={["nav-back"]}>
                      {label}
                    </Link>
                  }
                />
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:inline-flex" />
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AppHeader() {
  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-3 sm:px-4 md:px-6 backdrop-blur-md transition-colors"
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <React.Suspense
          fallback={
            <Breadcrumb className="truncate">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground">
                    Dashboard
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          }
        >
          <HeaderBreadcrumbs />
        </React.Suspense>
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

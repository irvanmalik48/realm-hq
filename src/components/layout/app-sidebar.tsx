"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mail,
  MessageSquare,
  Heart,
  HardDrive,
  KeyRound,
  ShieldAlert,
  Activity,
  Terminal,
  LogOut,
  Command,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggleButton } from "@/components/ui/theme-toggle-button";

const navItems = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Submissions",
    href: "/messages",
    icon: Mail,
  },
  {
    title: "Comments",
    href: "/comments",
    icon: MessageSquare,
  },
  {
    title: "Post Reactions",
    href: "/reactions",
    icon: Heart,
  },
  {
    title: "Storage & S3",
    href: "/storage",
    icon: HardDrive,
  },
  {
    title: "API Tokens",
    href: "/tokens",
    icon: KeyRound,
  },
  {
    title: "Admin RBAC",
    href: "/admins",
    icon: ShieldAlert,
    superadminOnly: true,
  },
  {
    title: "Telemetrics",
    href: "/telemetry",
    icon: Activity,
  },
  {
    title: "System Logs",
    href: "/logs",
    icon: Terminal,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, admin, logout } = useAuth();

  const filteredItems = navItems.filter((item) => {
    if (item.superadminOnly && !admin?.is_superadmin) {
      return false;
    }
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Command className="h-5 w-5" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm tracking-tight text-sidebar-foreground">
              Realm HQ
            </span>
            <span className="text-xs text-muted-foreground truncate">
              Command Centre
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user?.avatar_url || ""} alt={user?.username} />
              <AvatarFallback className="rounded-lg text-xs bg-muted">
                {user?.username?.slice(0, 2).toUpperCase() || "HQ"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden text-left group-data-[collapsible=icon]:hidden">
              <span className="text-xs font-medium truncate text-sidebar-foreground">
                {user?.full_name || user?.username || "Admin"}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                {admin?.is_superadmin ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 h-4 gap-0.5 border-amber-500/40 text-amber-500"
                  >
                    <ShieldCheck className="h-2.5 w-2.5" /> Superadmin
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1 py-0 h-4 gap-0.5"
                  >
                    <UserCheck className="h-2.5 w-2.5" /> Staff
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggleButton />
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

"use client";

import {
  Activity,
  BarChart3,
  Command,
  FileText,
  HardDrive,
  Heart,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  ShieldCheck,
  Terminal,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TwoFactorDialog } from "@/components/auth/two-factor-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggleButton } from "@/components/ui/theme-toggle-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth/auth-context";

const navItems = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Posts",
    href: "/posts",
    icon: FileText,
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
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "File Storage",
    href: "/storage",
    icon: HardDrive,
  },
  {
    title: "API Keys",
    href: "/tokens",
    icon: KeyRound,
  },
  {
    title: "Administrators",
    href: "/admins",
    icon: ShieldCheck,
    superadminOnly: true,
  },
  {
    title: "Performance",
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
  const { state, isMobile } = useSidebar();

  const filteredItems = navItems.filter((item) => {
    if (item.superadminOnly && !admin?.is_superadmin) {
      return false;
    }
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 border-b border-sidebar-border px-3 group-data-[collapsible=icon]:px-0 flex flex-col justify-center">
        <div className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                >
                  <Command className="h-4 w-4" />
                </Link>
              }
            />
            <TooltipContent
              side="right"
              align="center"
              hidden={state !== "collapsed" || isMobile}
            >
              Realm HQ
            </TooltipContent>
          </Tooltip>

          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm tracking-tight text-sidebar-foreground truncate">
              Realm HQ
            </span>
            <span className="text-xs text-muted-foreground truncate">
              Command Centre
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="no-scrollbar">
        <SidebarGroup className="p-2 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pt-3">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[11px] font-medium tracking-wider uppercase text-muted-foreground/80 px-2 mb-1">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
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

      <SidebarFooter className="border-t border-sidebar-border p-2 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2 w-full">
          {/* User profile / Avatar */}
          <div className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Avatar className="h-8 w-8 rounded-lg shrink-0 cursor-default ring-1 ring-border/50">
                    <AvatarImage
                      src={user?.avatar_url || ""}
                      alt={user?.username}
                    />
                    <AvatarFallback className="rounded-lg text-xs font-medium bg-muted text-muted-foreground">
                      {user?.username?.slice(0, 2).toUpperCase() || "HQ"}
                    </AvatarFallback>
                  </Avatar>
                }
              />
              <TooltipContent
                side="right"
                align="center"
                hidden={state !== "collapsed" || isMobile}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-xs">
                    {user?.full_name || user?.username || "Admin"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {admin?.is_superadmin ? "Superadmin" : "Staff"}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>

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

          {/* Divider in collapsed mode */}
          <div className="hidden group-data-[collapsible=icon]:block w-6 h-px bg-sidebar-border my-0.5" />

          {/* Action buttons */}
          <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:items-center">
            <TwoFactorDialog
              trigger={
                <div>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          aria-label="Two-Factor Authentication Security"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors cursor-pointer relative"
                        >
                          <ShieldCheck
                            className={`h-4 w-4 ${user?.two_factor_enabled ? "text-emerald-500" : ""}`}
                          />
                          {user?.two_factor_enabled && (
                            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      }
                    />
                    <TooltipContent
                      side="right"
                      align="center"
                      hidden={state !== "collapsed" || isMobile}
                    >
                      {user?.two_factor_enabled
                        ? "2FA Active (Protected)"
                        : "Configure 2FA"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              }
            />

            <Tooltip>
              <TooltipTrigger
                render={
                  <div>
                    <ThemeToggleButton />
                  </div>
                }
              />
              <TooltipContent
                side="right"
                align="center"
                hidden={state !== "collapsed" || isMobile}
              >
                Toggle Theme
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={logout}
                    aria-label="Sign out"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                }
              />
              <TooltipContent
                side="right"
                align="center"
                hidden={state !== "collapsed" || isMobile}
              >
                Sign out
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

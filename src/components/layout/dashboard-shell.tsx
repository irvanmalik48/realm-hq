"use client";

import type * as React from "react";
import { DirectionalTransition } from "@/components/directional-transition";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth/auth-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground tracking-wide font-medium uppercase">
            Loading Command Centre...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
            <DirectionalTransition>{children}</DirectionalTransition>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

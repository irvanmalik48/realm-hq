"use client";

import { Search, Settings, X } from "lucide-react";
import * as React from "react";
import { DirectionalTransition } from "@/components/directional-transition";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AppearanceSettingsCard } from "@/components/settings/appearance-settings-card";
import { ProfileSettingsCard } from "@/components/settings/profile-settings-card";
import { ScrollSettingsCard } from "@/components/settings/scroll-settings-card";

export default function SettingsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");

  return (
    <DirectionalTransition>
      <DashboardShell>
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                Web Settings
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Customize appearance, smooth scrolling physics, and
                administrator preferences.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                aria-label="Search settings"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-muted/40 border border-border rounded-md text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Settings Cards */}
          <div className="space-y-6">
            <ProfileSettingsCard searchQuery={searchQuery} />
            <AppearanceSettingsCard searchQuery={searchQuery} />
            <ScrollSettingsCard searchQuery={searchQuery} />
          </div>
        </div>
      </DashboardShell>
    </DirectionalTransition>
  );
}

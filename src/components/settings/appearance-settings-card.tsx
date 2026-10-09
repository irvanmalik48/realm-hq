"use client";

import { useAtom } from "jotai";
import { Laptop, Moon, Palette, Sun, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { performanceModeAtom } from "@/lib/atoms/performance-mode";

export function AppearanceSettingsCard({
  searchQuery = "",
}: {
  searchQuery?: string;
}) {
  const { theme, setTheme } = useTheme();
  const [performanceMode, setPerformanceMode] = useAtom(performanceModeAtom);

  const matchQuery = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const themeMatches =
    matchQuery("Theme") ||
    matchQuery("Dark Mode") ||
    matchQuery("Light Mode") ||
    matchQuery("System Theme");
  const performanceMatches =
    matchQuery("Performance Mode") ||
    matchQuery(
      "Disable heavy background blur and complex transition animations.",
    ) ||
    matchQuery("optimization lag battery");

  const anyMatches = themeMatches || performanceMatches;
  if (!anyMatches) return null;

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>Appearance & Performance</CardTitle>
        </div>
        <CardDescription>
          Customize theme palette and hardware rendering preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {themeMatches && (
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-foreground">
                Interface Theme
              </span>
              <p className="text-xs text-muted-foreground">
                Choose the visual presentation style for the Command Centre.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={theme === "light" ? "default" : "outline"}
                className="flex items-center justify-center gap-2 h-10"
                onClick={() => {
                  setTheme("light");
                  toast("Theme set to Light");
                }}
              >
                <Sun className="h-4 w-4" />
                <span>Light</span>
              </Button>
              <Button
                type="button"
                variant={theme === "dark" ? "default" : "outline"}
                className="flex items-center justify-center gap-2 h-10"
                onClick={() => {
                  setTheme("dark");
                  toast("Theme set to Dark");
                }}
              >
                <Moon className="h-4 w-4" />
                <span>Dark</span>
              </Button>
              <Button
                type="button"
                variant={theme === "system" ? "default" : "outline"}
                className="flex items-center justify-center gap-2 h-10"
                onClick={() => {
                  setTheme("system");
                  toast("Theme set to System default");
                }}
              >
                <Laptop className="h-4 w-4" />
                <span>System</span>
              </Button>
            </div>
          </div>
        )}

        {performanceMatches && (
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/50">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-foreground">
                  Performance Mode
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Disable heavy background blur and complex transition animations
                on slower devices.
              </p>
            </div>
            <Switch
              checked={performanceMode}
              onCheckedChange={(checked) => {
                setPerformanceMode(checked);
                toast(
                  checked
                    ? "Performance Mode Enabled"
                    : "Performance Mode Disabled",
                  {
                    description: checked
                      ? "Visual effects simplified for maximum responsiveness."
                      : "Standard graphical fidelity restored.",
                  },
                );
              }}
              aria-label="Toggle performance mode"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

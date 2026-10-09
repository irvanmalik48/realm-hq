"use client";

import { useAtom } from "jotai";
import { Sliders } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  customScrollbarEnabledAtom,
  scrollDurationAtom,
  scrollLerpAtom,
  smoothScrollAtom,
} from "@/lib/atoms/scroll";

export function ScrollSettingsCard({
  searchQuery = "",
}: {
  searchQuery?: string;
}) {
  const [smoothScroll, setSmoothScroll] = useAtom(smoothScrollAtom);
  const [scrollLerp, setScrollLerp] = useAtom(scrollLerpAtom);
  const [scrollDuration, setScrollDuration] = useAtom(scrollDurationAtom);
  const [customScrollbar, setCustomScrollbar] = useAtom(
    customScrollbarEnabledAtom,
  );

  const matchQuery = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const smoothScrollMatches =
    matchQuery("Smooth Scrolling") ||
    matchQuery("Enable inertia-based smooth scrolling powered by Lenis.") ||
    matchQuery("lenis inertia");
  const lerpMatches =
    matchQuery("Scroll Velocity") ||
    matchQuery("Controls interpolation responsiveness.");
  const durationMatches =
    matchQuery("Scroll Duration") ||
    matchQuery("Adjusts animation easing duration.");
  const scrollbarMatches =
    matchQuery("Custom Scrollbar") ||
    matchQuery(
      "Stylized floating scrollbar instead of the native browser scrollbar.",
    );

  const anyMatches =
    smoothScrollMatches || lerpMatches || durationMatches || scrollbarMatches;

  if (!anyMatches) return null;

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-primary" />
          <CardTitle>Scrolling & Physics</CardTitle>
        </div>
        <CardDescription>
          Configure smooth scrolling inertia, easing duration, and stylized
          scrollbar behavior.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {smoothScrollMatches && (
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-foreground">
                Smooth Scrolling
              </span>
              <p className="text-xs text-muted-foreground">
                Enable inertia-based smooth scrolling powered by Lenis.
              </p>
            </div>
            <Switch
              checked={smoothScroll}
              onCheckedChange={(checked) => {
                setSmoothScroll(checked);
                toast(
                  checked
                    ? "Smooth Scrolling Enabled"
                    : "Smooth Scrolling Disabled",
                  {
                    description: checked
                      ? "Lenis inertia physics is active."
                      : "Native browser scrolling restored.",
                  },
                );
              }}
              aria-label="Toggle smooth scrolling"
            />
          </div>
        )}

        {smoothScroll && (lerpMatches || durationMatches) && (
          <div className="space-y-4 pl-4 border-l-2 border-border/60">
            {lerpMatches && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-foreground">
                    Scroll Velocity (Lerp)
                  </span>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-primary font-semibold">
                    {scrollLerp.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Controls how fast the scroll catches up to user input. Lower
                  values feel softer and smoother.
                </p>
                <input
                  type="range"
                  min="0.01"
                  max="0.4"
                  step="0.01"
                  value={scrollLerp}
                  onChange={(e) =>
                    setScrollLerp(Number.parseFloat(e.target.value))
                  }
                  aria-label="Scroll Velocity (Lerp)"
                  className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-hidden"
                />
              </div>
            )}

            {durationMatches && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-foreground">
                    Scroll Duration (Acceleration)
                  </span>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-primary font-semibold">
                    {scrollDuration.toFixed(1)}s
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Adjusts the easing duration of the scroll animation. Higher
                  values feel floaty.
                </p>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={scrollDuration}
                  onChange={(e) =>
                    setScrollDuration(Number.parseFloat(e.target.value))
                  }
                  aria-label="Scroll Duration (Acceleration)"
                  className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-hidden"
                />
              </div>
            )}
          </div>
        )}

        {scrollbarMatches && (
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/50">
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-foreground">
                Custom Scrollbar
              </span>
              <p className="text-xs text-muted-foreground">
                Display the stylized floating scrollbar instead of the default
                browser bar.
              </p>
            </div>
            <Switch
              checked={customScrollbar}
              onCheckedChange={(checked) => {
                setCustomScrollbar(checked);
                toast(
                  checked
                    ? "Custom Scrollbar Enabled"
                    : "Custom Scrollbar Disabled",
                  {
                    description: checked
                      ? "Stylized floating scrollbar is active."
                      : "Native scrollbar restored.",
                  },
                );
              }}
              aria-label="Toggle custom scrollbar"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

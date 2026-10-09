"use client";

import { useAtomValue } from "jotai";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect, useRef } from "react";
import {
  scrollDurationAtom,
  scrollLerpAtom,
  smoothScrollAtom,
} from "@/lib/atoms/scroll";

declare global {
  interface Window {
    __lenis?: Lenis | null;
  }
}

function ScrollToTopOnNavigate() {
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the navigation route change trigger
  useEffect(() => {
    if (typeof window !== "undefined" && !window.location.hash) {
      if (window.__lenis) {
        window.__lenis.scrollTo(0, { immediate: true });
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const isEnabled = useAtomValue(smoothScrollAtom);
  const lerp = useAtomValue(scrollLerpAtom);
  const duration = useAtomValue(scrollDurationAtom);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
        if (typeof window !== "undefined") {
          window.__lenis = null;
        }
      }
      return;
    }

    const lenis = new Lenis({
      duration: duration,
      lerp: lerp,
      smoothWheel: true,
    });
    lenisRef.current = lenis;
    if (typeof window !== "undefined") {
      window.__lenis = lenis;
    }

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      if (typeof window !== "undefined") {
        window.__lenis = null;
      }
    };
  }, [isEnabled, lerp, duration]);

  return (
    <>
      <React.Suspense fallback={null}>
        <ScrollToTopOnNavigate />
      </React.Suspense>
      {children}
    </>
  );
}

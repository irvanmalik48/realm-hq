"use client";

import createGlobe from "cobe";
import {
  Compass,
  Globe as GlobeIcon,
  MapPin,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CountryStat {
  country_code: string;
  country: string;
  views: number;
  unique: number;
  percentage: number;
}

interface VisitorGlobeProps {
  countryStats?: CountryStat[];
  totalViews?: number;
  selectedSite?: string;
  className?: string;
}

// Centroid coordinates [latitude, longitude] for countries
const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  US: [37.0902, -95.7129],
  ID: [-0.7893, 113.9213],
  SG: [1.3521, 103.8198],
  JP: [36.2048, 138.2529],
  DE: [51.1657, 10.4515],
  GB: [55.3781, -3.436],
  CA: [56.1304, -106.3468],
  AU: [-25.2744, 133.7751],
  FR: [46.2276, 2.2137],
  IN: [20.5937, 78.9629],
  NL: [52.1326, 5.2913],
  BR: [-14.235, -51.9253],
  KR: [35.9078, 127.7669],
  SE: [60.1282, 18.6435],
  CH: [46.8182, 8.2275],
  IT: [41.8719, 12.5674],
  ES: [40.4637, -3.7492],
  RU: [61.524, 105.3188],
  VN: [14.0583, 108.2772],
  MY: [4.2105, 101.9758],
  PH: [12.8797, 121.774],
  TH: [15.87, 100.9925],
  NZ: [-40.9006, 174.886],
  MX: [23.6345, -102.5528],
  AR: [-38.4161, -63.6167],
  ZA: [-30.5595, 22.9375],
  PL: [51.9194, 19.1451],
  TR: [38.9637, 35.2433],
  UA: [48.3794, 31.1656],
  NO: [60.472, 8.4689],
  DK: [56.2639, 9.5018],
  FI: [61.9241, 25.7482],
  IE: [53.1424, -7.6921],
  AT: [47.5162, 14.5501],
  BE: [50.5039, 4.4699],
  CZ: [49.8175, 15.473],
  PT: [39.3999, -8.2245],
  RO: [45.9432, 24.9668],
  HU: [47.1625, 19.5033],
  GR: [39.0742, 21.8243],
  IL: [31.0461, 34.8516],
  AE: [23.4241, 53.8478],
  SA: [23.8859, 45.0792],
  EG: [26.8206, 30.8025],
  NG: [9.082, 8.6753],
  KE: [-0.0236, 37.9062],
  CL: [-35.6751, -71.543],
  CO: [4.5709, -74.2973],
  PE: [-9.19, -75.0152],
  PK: [30.3753, 69.3451],
  BD: [23.685, 90.3563],
  HK: [22.3193, 114.1694],
  TW: [23.6978, 120.9605],
  CN: [35.8617, 104.1954],
};

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2 || countryCode === "XX") {
    return "🌐";
  }
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Project [latitude, longitude] onto 2D screen percentage for DOM beacons
function projectGeoToScreen(
  latDeg: number,
  lonDeg: number,
  phi: number,
  theta: number,
): { xPercent: number; yPercent: number; isVisible: boolean; depth: number } {
  const phiRad = (latDeg * Math.PI) / 180;
  const lamRad = (lonDeg * Math.PI) / 180 - Math.PI;
  const cosPhi = Math.cos(phiRad);
  const sinPhi = Math.sin(phiRad);
  const cosLam = Math.cos(lamRad);
  const sinLam = Math.sin(lamRad);

  // Cartesian 3D sphere coordinate
  const x3 = -cosPhi * cosLam;
  const y3 = sinPhi;
  const z3 = cosPhi * sinLam;

  // Spherical rotation by phi (longitude) and theta (latitude tilt)
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);

  const c = cosP * x3 + sinP * z3;
  const s = sinP * sinT * x3 + cosT * y3 - cosP * sinT * z3;
  const depth = -sinP * cosT * x3 + sinT * y3 + cosP * cosT * z3;

  // 0.8 matches cobe's default globe radius ratio
  const scale = 0.8;
  const xPercent = ((c * scale + 1) / 2) * 100;
  const yPercent = ((-s * scale + 1) / 2) * 100;

  return {
    xPercent,
    yPercent,
    isVisible: depth > 0.05,
    depth,
  };
}

export function VisitorGlobe({
  countryStats = [],
  totalViews = 0,
  selectedSite = "all",
  className,
}: VisitorGlobeProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const markerElementsRef = React.useRef<
    Record<string, HTMLButtonElement | null>
  >({});

  // Rotation angles (phi: horizontal, theta: vertical tilt)
  const phiRef = React.useRef(0);
  const thetaRef = React.useRef(0.2);
  const [isAutoSpinning, setIsAutoSpinning] = React.useState(true);
  const [selectedCountryCode, setSelectedCountryCode] = React.useState<
    string | null
  >(null);
  const [hoveredCountryCode, setHoveredCountryCode] = React.useState<
    string | null
  >(null);

  // Interaction refs
  const isDraggingRef = React.useRef(false);
  const pointerStartRef = React.useRef<[number, number]>([0, 0]);
  const targetRotationRef = React.useRef<[number, number] | null>(null);

  const maxViews = React.useMemo(() => {
    return Math.max(1, ...countryStats.map((c) => c.views));
  }, [countryStats]);

  // Smoothly center the globe on the selected country
  const rotateToCountry = React.useCallback((code: string) => {
    const coords = COUNTRY_COORDINATES[code.toUpperCase()];
    if (!coords) return;
    const targetPhi = -(coords[1] * Math.PI) / 180 - Math.PI / 2;
    const targetTheta = Math.max(
      -0.5,
      Math.min(0.5, ((coords[0] * Math.PI) / 180) * 0.6),
    );
    targetRotationRef.current = [targetPhi, targetTheta];
    setSelectedCountryCode(code);
    setIsAutoSpinning(false);
  }, []);

  // WebGL 3D Globe initialization and render loop via cobe
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = 0;
    const onResize = () => {
      if (canvas) {
        width = canvas.offsetWidth;
      }
    };
    window.addEventListener("resize", onResize);
    onResize();

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let animFrameId: number | null = null;

    // Initialize cobe high-detail WebGL globe without any extruded needles or arcs
    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: width * dpr || 800,
      height: width * dpr || 800,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: 1,
      diffuse: 1.25,
      mapSamples: 16000,
      mapBrightness: 5.5,
      baseColor: [0.16, 0.22, 0.34],
      markerColor: [0.23, 0.51, 0.96],
      glowColor: [0.12, 0.18, 0.3],
      markers: [],
    });

    const loop = () => {
      // Handle lerping to target country orientation or smooth auto-spin
      const target = targetRotationRef.current;
      if (target) {
        const [targetPhi, targetTheta] = target;
        const curPhi = phiRef.current;
        const curTheta = thetaRef.current;
        const dPhi = targetPhi - curPhi;
        const dTheta = targetTheta - curTheta;
        if (Math.abs(dPhi) < 0.005 && Math.abs(dTheta) < 0.005) {
          phiRef.current = targetPhi;
          thetaRef.current = targetTheta;
          targetRotationRef.current = null;
        } else {
          phiRef.current += dPhi * 0.08;
          thetaRef.current += dTheta * 0.08;
        }
      } else if (isAutoSpinning && !isDraggingRef.current) {
        phiRef.current += 0.004;
      }

      // Synchronize DOM overlay pulsing point beacon coordinates in 60fps loop
      for (let idx = 0; idx < countryStats.length; idx++) {
        const stat = countryStats[idx];
        const coords = COUNTRY_COORDINATES[stat.country_code.toUpperCase()];
        if (!coords) continue;

        const domEl = markerElementsRef.current[stat.country_code];
        if (domEl) {
          const proj = projectGeoToScreen(
            coords[0],
            coords[1],
            phiRef.current,
            thetaRef.current,
          );
          if (proj.isVisible) {
            domEl.style.display = "block";
            domEl.style.left = `${proj.xPercent}%`;
            domEl.style.top = `${proj.yPercent}%`;
            const fade = Math.min(1, Math.max(0, (proj.depth - 0.05) / 0.25));
            domEl.style.opacity = `${fade}`;
            domEl.style.zIndex = `${Math.round(proj.depth * 100)}`;
          } else {
            domEl.style.display = "none";
          }
        }
      }

      globe.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        width: width * dpr || 800,
        height: width * dpr || 800,
      });

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", onResize);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      globe.destroy();
    };
  }, [countryStats, isAutoSpinning]);

  // Pointer drag event handlers for rotating the globe
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    pointerStartRef.current = [e.clientX, e.clientY];
    setIsAutoSpinning(false);
    targetRotationRef.current = null;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const [startX, startY] = pointerStartRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    pointerStartRef.current = [e.clientX, e.clientY];

    phiRef.current += dx * 0.005;
    thetaRef.current = Math.max(
      -0.8,
      Math.min(0.8, thetaRef.current - dy * 0.005),
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already ended
    }
  };

  return (
    <Card className={cn("overflow-hidden border-border/60", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GlobeIcon className="size-4 text-primary" />
            <span>Geographical Distribution</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Anonymous visitor tracking projected on an opaque 3D spinning globe.
            Lightness scales with visitor density.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoSpinning((v) => !v)}
            className="h-7 px-2 text-xs gap-1 cursor-pointer"
          >
            {isAutoSpinning ? (
              <>
                <Pause className="size-3" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="size-3" />
                <span>Spin</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              targetRotationRef.current = [0, 0.2];
              setSelectedCountryCode(null);
              setIsAutoSpinning(true);
            }}
            title="Reset Globe View"
            className="h-7 w-7 p-0 cursor-pointer"
          >
            <RotateCcw className="size-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
        {/* Globe Canvas View (7 cols) - Centered with equal spacing */}
        <div className="relative lg:col-span-7 flex flex-col items-center justify-center min-h-[360px] sm:min-h-[420px] bg-gradient-to-b from-card/30 to-background/60 p-6 overflow-hidden">
          {/* Subtle ambient back-glow behind the opaque sphere */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="size-[320px] rounded-full bg-primary/10 blur-3xl opacity-60" />
          </div>

          {/* Centered Globe Container with Aspect Ratio Square */}
          <div className="relative w-full max-w-[360px] sm:max-w-[390px] aspect-square mx-auto flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full h-full cursor-grab active:cursor-grabbing select-none touch-none relative z-10"
            />

            {/* Informative Floating Country Beacons */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
              {countryStats.map((stat, idx) => {
                const coords =
                  COUNTRY_COORDINATES[stat.country_code.toUpperCase()];
                if (!coords) return null;

                const ratio = Math.min(1, stat.views / maxViews);
                const isSelected = selectedCountryCode === stat.country_code;
                const isHovered = hoveredCountryCode === stat.country_code;
                const pulseLightness = 42 + ratio * 42;

                return (
                  <button
                    type="button"
                    key={stat.country_code}
                    ref={(el) => {
                      markerElementsRef.current[stat.country_code] = el;
                    }}
                    style={{ display: "none" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group cursor-pointer transition-transform duration-200 border-0 bg-transparent p-0 focus:outline-hidden"
                    onClick={() => rotateToCountry(stat.country_code)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        rotateToCountry(stat.country_code);
                      }
                    }}
                    onMouseEnter={() =>
                      setHoveredCountryCode(stat.country_code)
                    }
                    onMouseLeave={() => setHoveredCountryCode(null)}
                    aria-label={`Focus on ${stat.country || stat.country_code}`}
                  >
                    {/* Multi-tier Pulsing Beacon Rings */}
                    <div className="relative flex items-center justify-center">
                      <span
                        className={cn(
                          "absolute rounded-full animate-ping opacity-60 transition-all",
                          isSelected || isHovered
                            ? "size-6 bg-primary/50 duration-700"
                            : "size-4 bg-primary/30 duration-1000",
                        )}
                        style={{
                          animationDelay: `${idx * 150}ms`,
                        }}
                      />
                      <span
                        className={cn(
                          "absolute rounded-full border border-primary/60 transition-all duration-300",
                          isSelected || isHovered
                            ? "size-5 scale-125 bg-primary/15"
                            : "size-3.5 bg-primary/10",
                        )}
                      />
                      {/* Core Glowing Dot with dynamic lightness box-shadow */}
                      <span
                        className={cn(
                          "relative rounded-full transition-all duration-300",
                          isSelected || isHovered
                            ? "size-2.5 ring-2 ring-background scale-110"
                            : "size-1.5",
                        )}
                        style={{
                          backgroundColor: `hsl(217, 91%, ${
                            isSelected || isHovered ? 95 : pulseLightness
                          }%)`,
                          boxShadow: `0 0 10px hsl(217, 91%, ${pulseLightness}%)`,
                        }}
                      />

                      {/* Informative Floating Tooltip Pill */}
                      <div
                        className={cn(
                          "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/90 backdrop-blur-md border shadow-lg transition-all duration-200 whitespace-nowrap text-[11px]",
                          isSelected || isHovered
                            ? "opacity-100 scale-100 border-primary/60 shadow-primary/20 pointer-events-auto"
                            : "opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto border-border/80",
                        )}
                      >
                        <span className="text-xs">
                          {getFlagEmoji(stat.country_code)}
                        </span>
                        <span className="font-semibold text-foreground">
                          {stat.country || stat.country_code}
                        </span>
                        <span className="font-mono text-primary font-medium">
                          {stat.views}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({stat.percentage.toFixed(1)}%)
                        </span>
                        {/* Downward Caret */}
                        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-background/90" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom telemetry overlay pill */}
          <div className="absolute bottom-3 left-4 right-4 sm:right-auto flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-background/80 backdrop-blur-md border border-border/60 text-[11px] text-muted-foreground z-20">
            <div className="flex items-center gap-1.5 truncate">
              <Compass className="size-3.5 text-primary shrink-0 animate-pulse" />
              <span>
                {selectedSite === "all" ? "All Sites Telemetry" : selectedSite}
              </span>
            </div>
            <Badge
              variant="secondary"
              className="text-[10px] h-4.5 font-mono px-1.5"
            >
              {countryStats.length}{" "}
              {countryStats.length === 1 ? "Country" : "Countries"}
            </Badge>
          </div>
        </div>

        {/* Country Leaderboard Panel (5 cols) */}
        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-border/40 flex flex-col justify-between bg-card/20">
          <div className="p-3 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" />
              Country Traffic Ranking
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {totalViews} views total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[360px] divide-y divide-border/30">
            {countryStats.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No country telemetry recorded yet.
              </div>
            ) : (
              countryStats.map((item, idx) => {
                const ratio = Math.min(1, item.views / maxViews);
                // Dynamic lightness from 38% to 80%
                const barLightness = 38 + ratio * 42;
                const isSelected = selectedCountryCode === item.country_code;
                const isHovered = hoveredCountryCode === item.country_code;
                const hasCoords = Boolean(
                  COUNTRY_COORDINATES[item.country_code.toUpperCase()],
                );

                return (
                  <button
                    type="button"
                    key={item.country_code}
                    onClick={() => {
                      if (hasCoords) {
                        rotateToCountry(item.country_code);
                      } else {
                        setSelectedCountryCode(item.country_code);
                      }
                    }}
                    onMouseEnter={() =>
                      setHoveredCountryCode(item.country_code)
                    }
                    onMouseLeave={() => setHoveredCountryCode(null)}
                    className={cn(
                      "w-full flex flex-col gap-1.5 p-3 text-left transition-colors cursor-pointer hover:bg-muted/40",
                      (isSelected || isHovered) &&
                        "bg-primary/10 border-l-2 border-primary",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="text-sm shrink-0">
                          {getFlagEmoji(item.country_code)}
                        </span>
                        <span className="text-xs font-medium text-foreground truncate">
                          {item.country || item.country_code}
                          {!hasCoords && (
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              (Direct/Private)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-foreground">
                          {item.views}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Lightness-scaled progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width,background-color] duration-500"
                        style={{
                          width: `${Math.max(4, item.percentage)}%`,
                          backgroundColor: `hsl(217, 91%, ${barLightness}%)`,
                          boxShadow: `0 0 6px hsla(217, 91%, ${barLightness}%, 0.4)`,
                        }}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2.5 bg-muted/10 border-t border-border/40 text-[11px] text-muted-foreground text-center">
            Click or hover any country to inspect and highlight on the 3D globe.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

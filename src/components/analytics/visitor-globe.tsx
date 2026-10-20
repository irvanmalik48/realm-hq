"use client";

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

export interface CountryStat {
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

// Simplified polygon coordinates [lat, lon] for major continents
const CONTINENTS: [number, number][][] = [
  // North America
  [
    [70, -165],
    [72, -130],
    [65, -90],
    [58, -65],
    [48, -55],
    [42, -70],
    [32, -80],
    [25, -80],
    [20, -87],
    [16, -93],
    [10, -84],
    [8, -77],
    [15, -92],
    [20, -105],
    [28, -112],
    [33, -118],
    [40, -124],
    [48, -125],
    [58, -136],
    [60, -145],
    [65, -168],
    [70, -165],
  ],
  // South America
  [
    [10, -75],
    [7, -60],
    [-2, -50],
    [-10, -36],
    [-20, -40],
    [-30, -50],
    [-40, -62],
    [-54, -68],
    [-50, -74],
    [-38, -74],
    [-20, -70],
    [-5, -80],
    [5, -77],
    [10, -75],
  ],
  // Europe
  [
    [71, 28],
    [68, 45],
    [60, 32],
    [55, 38],
    [45, 30],
    [40, 26],
    [38, 22],
    [36, -5],
    [43, -9],
    [48, -4],
    [54, 8],
    [58, 6],
    [62, 5],
    [71, 28],
  ],
  // Africa
  [
    [36, 10],
    [32, 32],
    [25, 35],
    [12, 44],
    [12, 51],
    [2, 45],
    [-11, 40],
    [-25, 33],
    [-34, 26],
    [-34, 18],
    [-22, 14],
    [-5, 12],
    [4, 9],
    [5, -2],
    [5, -10],
    [14, -17],
    [22, -16],
    [32, -8],
    [36, 0],
    [36, 10],
  ],
  // Asia
  [
    [75, 100],
    [70, 140],
    [65, 170],
    [60, 162],
    [50, 140],
    [42, 131],
    [38, 120],
    [30, 122],
    [22, 114],
    [22, 107],
    [10, 106],
    [1, 104],
    [8, 98],
    [18, 96],
    [21, 89],
    [10, 79],
    [8, 77],
    [22, 69],
    [25, 62],
    [24, 57],
    [14, 53],
    [12, 44],
    [26, 36],
    [35, 36],
    [38, 45],
    [45, 52],
    [50, 58],
    [60, 60],
    [70, 70],
    [75, 100],
  ],
  // Australia
  [
    [-12, 132],
    [-12, 136],
    [-18, 140],
    [-14, 144],
    [-24, 153],
    [-32, 153],
    [-38, 147],
    [-38, 140],
    [-35, 136],
    [-32, 132],
    [-34, 115],
    [-22, 114],
    [-16, 123],
    [-12, 132],
  ],
  // UK
  [
    [58, -5],
    [58, -2],
    [52, 1],
    [50, -5],
    [52, -5],
    [55, -3],
    [58, -5],
  ],
  // Japan
  [
    [45, 142],
    [43, 145],
    [35, 140],
    [31, 131],
    [34, 131],
    [38, 138],
    [45, 142],
  ],
  // Indonesia (Sumatra, Java, Borneo, Sulawesi)
  [
    [5, 96],
    [-5, 105],
    [-7, 108],
    [-8, 115],
    [-8, 120],
    [-4, 122],
    [1, 125],
    [4, 118],
    [7, 117],
    [1, 110],
    [1, 100],
    [5, 96],
  ],
  // Greenland
  [
    [83, -30],
    [75, -20],
    [60, -44],
    [65, -53],
    [76, -68],
    [82, -60],
    [83, -30],
  ],
];

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

export function VisitorGlobe({
  countryStats = [],
  totalViews = 0,
  selectedSite = "all",
  className,
}: VisitorGlobeProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Globe rotation state (in radians) stored in ref for 60fps canvas rendering
  const rotationRef = React.useRef<[number, number]>([0.4, 0.2]); // [lon, lat]
  const [isAutoSpinning, setIsAutoSpinning] = React.useState(true);
  const [hoveredCountry, setHoveredCountry] =
    React.useState<CountryStat | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = React.useState<
    string | null
  >(null);

  // Interaction refs
  const isDraggingRef = React.useRef(false);
  const lastMousePosRef = React.useRef<[number, number]>([0, 0]);
  const animationFrameRef = React.useRef<number | null>(null);
  const targetRotationRef = React.useRef<[number, number] | null>(null);

  const maxViews = React.useMemo(() => {
    return Math.max(1, ...countryStats.map((c) => c.views));
  }, [countryStats]);

  // Rotate smoothly towards a country when clicked
  const rotateToCountry = React.useCallback((code: string) => {
    const coords = COUNTRY_COORDINATES[code.toUpperCase()];
    if (!coords) return;
    const targetLat = (coords[0] * Math.PI) / 180;
    const targetLon = (-coords[1] * Math.PI) / 180;
    targetRotationRef.current = [targetLon, -targetLat * 0.4];
    setSelectedCountryCode(code);
    setIsAutoSpinning(false);
  }, []);

  // Canvas drawing loop
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animTime = 0;

    const render = () => {
      animTime += 0.02;

      // Handle auto-spinning or target lerping
      const target = targetRotationRef.current;
      if (target) {
        const [curLon, curLat] = rotationRef.current;
        const [targetLon, targetLat] = target;
        const dLon = targetLon - curLon;
        const dLat = targetLat - curLat;
        if (Math.abs(dLon) < 0.005 && Math.abs(dLat) < 0.005) {
          targetRotationRef.current = null;
          rotationRef.current = [targetLon, targetLat];
        } else {
          rotationRef.current = [curLon + dLon * 0.08, curLat + dLat * 0.08];
        }
      } else if (isAutoSpinning && !isDraggingRef.current) {
        rotationRef.current = [
          rotationRef.current[0] + 0.0035,
          rotationRef.current[1],
        ];
      }

      // Resize setup
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.42;

      const [lon0, lat0] = rotationRef.current;

      // 1. Draw Atmospheric Glow behind the opaque sphere
      const atmoGrad = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.88,
        cx,
        cy,
        radius * 1.18,
      );
      atmoGrad.addColorStop(0, "rgba(59, 130, 246, 0.22)");
      atmoGrad.addColorStop(0.5, "rgba(99, 102, 241, 0.08)");
      atmoGrad.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = atmoGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.18, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Solid Opaque 3D Sphere Body with Directional Shading
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Realistic 3D Sphere lighting: light source from top-left (-0.35R, -0.35R)
      const lightX = cx - radius * 0.35;
      const lightY = cy - radius * 0.35;
      const sphereGrad = ctx.createRadialGradient(
        lightX,
        lightY,
        radius * 0.1,
        cx,
        cy,
        radius * 1.05,
      );
      // Opaque dark theme shaded globe
      sphereGrad.addColorStop(0, "#1e293b"); // specular ambient highlight
      sphereGrad.addColorStop(0.35, "#0f172a"); // primary illuminated hemisphere
      sphereGrad.addColorStop(0.75, "#090d16"); // terminator transition
      sphereGrad.addColorStop(1, "#020617"); // deep shadow limb

      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // 3. Draw Curvature Parallels & Meridians (Subtle Grid on Opaque Face)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;

      // Parallels (Latitude lines)
      const parallels = [-60, -30, 0, 30, 60];
      parallels.forEach((latDeg) => {
        const phi = (latDeg * Math.PI) / 180;
        ctx.beginPath();
        let first = true;
        for (let lonDeg = -180; lonDeg <= 180; lonDeg += 5) {
          const lam = (lonDeg * Math.PI) / 180;
          const cosC =
            Math.sin(lat0) * Math.sin(phi) +
            Math.cos(lat0) * Math.cos(phi) * Math.cos(lam - lon0);
          if (cosC > 0) {
            const x = Math.cos(phi) * Math.sin(lam - lon0);
            const y = -(
              Math.cos(lat0) * Math.sin(phi) -
              Math.sin(lat0) * Math.cos(phi) * Math.cos(lam - lon0)
            );
            const sx = cx + x * radius;
            const sy = cy + y * radius;
            if (first) {
              ctx.moveTo(sx, sy);
              first = false;
            } else {
              ctx.lineTo(sx, sy);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      });

      // Meridians (Longitude lines)
      for (let lonDeg = -180; lonDeg < 180; lonDeg += 30) {
        const lam = (lonDeg * Math.PI) / 180;
        ctx.beginPath();
        let first = true;
        for (let latDeg = -85; latDeg <= 85; latDeg += 4) {
          const phi = (latDeg * Math.PI) / 180;
          const cosC =
            Math.sin(lat0) * Math.sin(phi) +
            Math.cos(lat0) * Math.cos(phi) * Math.cos(lam - lon0);
          if (cosC > 0) {
            const x = Math.cos(phi) * Math.sin(lam - lon0);
            const y = -(
              Math.cos(lat0) * Math.sin(phi) -
              Math.sin(lat0) * Math.cos(phi) * Math.cos(lam - lon0)
            );
            const sx = cx + x * radius;
            const sy = cy + y * radius;
            if (first) {
              ctx.moveTo(sx, sy);
              first = false;
            } else {
              ctx.lineTo(sx, sy);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // 4. Draw Continents (Opaque Surface Projection)
      CONTINENTS.forEach((poly) => {
        ctx.beginPath();
        let started = false;
        poly.forEach(([latDeg, lonDeg]) => {
          const phi = (latDeg * Math.PI) / 180;
          const lam = (lonDeg * Math.PI) / 180;
          const cosC =
            Math.sin(lat0) * Math.sin(phi) +
            Math.cos(lat0) * Math.cos(phi) * Math.cos(lam - lon0);
          if (cosC > 0) {
            const x = Math.cos(phi) * Math.sin(lam - lon0);
            const y = -(
              Math.cos(lat0) * Math.sin(phi) -
              Math.sin(lat0) * Math.cos(phi) * Math.cos(lam - lon0)
            );
            const sx = cx + x * radius;
            const sy = cy + y * radius;
            if (!started) {
              ctx.moveTo(sx, sy);
              started = true;
            } else {
              ctx.lineTo(sx, sy);
            }
          }
        });

        if (started) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.065)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
          ctx.lineWidth = 0.8;
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      });

      // 5. Draw Primary Color Indicators with Lightness being played with
      countryStats.forEach((stat, index) => {
        const coords = COUNTRY_COORDINATES[stat.country_code.toUpperCase()];
        if (!coords) return;

        const phi = (coords[0] * Math.PI) / 180;
        const lam = (coords[1] * Math.PI) / 180;

        // Orthographic projection components
        const cosC =
          Math.sin(lat0) * Math.sin(phi) +
          Math.cos(lat0) * Math.cos(phi) * Math.cos(lam - lon0);

        // Hide back-face points (opaque globe culls behind)
        if (cosC <= 0.05) return;

        const x = Math.cos(phi) * Math.sin(lam - lon0);
        const y = -(
          Math.cos(lat0) * Math.sin(phi) -
          Math.sin(lat0) * Math.cos(phi) * Math.cos(lam - lon0)
        );
        const z = cosC; // Depth towards viewer

        const sx = cx + x * radius;
        const sy = cy + y * radius;

        // Visitor volume density ratio [0, 1]
        const trafficRatio = Math.min(1, stat.views / maxViews);

        // LIGHTNESS PLAY:
        // Base lightness scales with traffic volume: 38% (subtle) to 80% (radiant)
        // Pulsing oscillation dynamically shifts lightness in real-time
        const pulse = Math.sin(animTime * 3 + index * 1.2) * 8;
        const baseLightness = 38 + trafficRatio * 42;
        const lightness = Math.min(94, Math.max(28, baseLightness + pulse));

        const isHovered = hoveredCountry?.country_code === stat.country_code;
        const isSelected = selectedCountryCode === stat.country_code;

        // Lightness boost on hover / select
        const finalLightness = isHovered || isSelected ? 88 : lightness;
        const primaryColor = `hsl(217, 91%, ${finalLightness}%)`;
        const primaryGlow = `hsla(217, 91%, ${finalLightness}%, ${
          0.3 + trafficRatio * 0.4
        })`;

        // Vertical elevation needle (pin height proportional to traffic density)
        const pinHeight = 12 + trafficRatio * 24;
        const tx = cx + x * (radius + pinHeight);
        const ty = cy + y * (radius + pinHeight);

        // 5a. Pin Elevation Beam
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = primaryGlow;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 5b. Ground Ripple Ring expanding outward
        const ripplePhase = (animTime * 1.5 + index * 0.7) % 1;
        const rippleRadius = 3 + trafficRatio * 4 + ripplePhase * 16;
        ctx.beginPath();
        ctx.arc(sx, sy, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(217, 91%, ${finalLightness}%, ${
          (1 - ripplePhase) * 0.5
        })`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 5c. Surface Marker Dot
        ctx.beginPath();
        ctx.arc(sx, sy, 3 + trafficRatio * 3, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // 5d. Pin Top Beacon Orb (High Lightness Glow)
        ctx.beginPath();
        ctx.arc(
          tx,
          ty,
          isHovered ? 4.5 : 2.5 + trafficRatio * 2,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = `hsl(217, 100%, ${Math.min(98, finalLightness + 14)}%)`;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // 5e. Hover / Selected Tooltip Callout
        if (isHovered || isSelected || z > 0.75) {
          ctx.save();
          const flag = getFlagEmoji(stat.country_code);
          const label = `${flag} ${stat.country_code} (${stat.views})`;

          ctx.font = "bold 10px monospace";
          const textMetrics = ctx.measureText(label);
          const padX = 6;
          const padY = 3;
          const boxW = textMetrics.width + padX * 2;
          const boxH = 16;
          const boxX = tx - boxW / 2;
          const boxY = ty - boxH - 6;

          // Callout pill background
          ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, 4);
          ctx.fill();
          ctx.stroke();

          // Callout text
          ctx.fillStyle = "#f8fafc";
          ctx.fillText(label, boxX + padX, boxY + boxH - padY - 1);
          ctx.restore();
        }
      });

      // 6. Draw Opaque Rim Silhouette & Inner Glass Sheen
      ctx.restore(); // unclip

      // Opaque sphere outer perimeter stroke
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Subtle rim specular arc
      const rimSheen = ctx.createLinearGradient(
        cx - radius,
        cy - radius,
        cx + radius,
        cy + radius,
      );
      rimSheen.addColorStop(0, "rgba(255, 255, 255, 0.25)");
      rimSheen.addColorStop(0.5, "rgba(255, 255, 255, 0.0)");
      rimSheen.addColorStop(1, "rgba(59, 130, 246, 0.2)");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = rimSheen;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isAutoSpinning,
    countryStats,
    maxViews,
    hoveredCountry,
    selectedCountryCode,
  ]);

  // Pointer drag event handlers for rotating the globe
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = [e.clientX, e.clientY];
    setIsAutoSpinning(false);
    targetRotationRef.current = null;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingRef.current) {
      const [lastX, lastY] = lastMousePosRef.current;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastMousePosRef.current = [e.clientX, e.clientY];

      const [lon, lat] = rotationRef.current;
      rotationRef.current = [
        lon + dx * 0.006,
        Math.max(-0.9, Math.min(0.9, lat - dy * 0.006)), // Clamp tilt
      ];
      return;
    }

    // Hit-testing indicators for hover tooltip
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.min(rect.width, rect.height) * 0.42;
    const [lon0, lat0] = rotationRef.current;

    let matched: CountryStat | null = null;
    for (const stat of countryStats) {
      const coords = COUNTRY_COORDINATES[stat.country_code.toUpperCase()];
      if (!coords) continue;
      const phi = (coords[0] * Math.PI) / 180;
      const lam = (coords[1] * Math.PI) / 180;
      const cosC =
        Math.sin(lat0) * Math.sin(phi) +
        Math.cos(lat0) * Math.cos(phi) * Math.cos(lam - lon0);

      if (cosC > 0.05) {
        const x = Math.cos(phi) * Math.sin(lam - lon0);
        const y = -(
          Math.cos(lat0) * Math.sin(phi) -
          Math.sin(lat0) * Math.cos(phi) * Math.cos(lam - lon0)
        );
        const sx = cx + x * radius;
        const sy = cy + y * radius;
        const dist = Math.hypot(mx - sx, my - sy);
        if (dist < 18) {
          matched = stat;
          break;
        }
      }
    }
    setHoveredCountry(matched);
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
            Anonymous visitor tracking projected on a 3D spinning globe.
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
              targetRotationRef.current = [0.4, 0.2];
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

      <CardContent className="p-0 grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
        {/* Globe Canvas View (7 cols) */}
        <div className="relative lg:col-span-7 flex items-center justify-center min-h-[320px] sm:min-h-[380px] bg-gradient-to-b from-card/30 to-background/60 p-4">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-full h-[320px] sm:h-[380px] cursor-grab active:cursor-grabbing select-none touch-none"
          />

          {/* Bottom telemetry overlay pill */}
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-background/80 backdrop-blur-md border border-border/60 text-[11px] text-muted-foreground">
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

          <div className="flex-1 overflow-y-auto max-h-[340px] divide-y divide-border/30">
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

                return (
                  <button
                    type="button"
                    key={item.country_code}
                    onClick={() => rotateToCountry(item.country_code)}
                    className={cn(
                      "w-full flex flex-col gap-1.5 p-3 text-left transition-colors cursor-pointer hover:bg-muted/40",
                      isSelected && "bg-primary/10 border-l-2 border-primary",
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
            Click any country to center and highlight on the 3D globe.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

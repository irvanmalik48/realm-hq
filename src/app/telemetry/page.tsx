"use client";

import {
  Activity,
  Cpu,
  Database,
  Flame,
  Gauge,
  Radio,
  RefreshCw,
  Zap,
} from "lucide-react";
import * as React from "react";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { DirectionalTransition } from "@/components/directional-transition";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

interface CPUStats {
  usage_percent?: number;
  core_usage_percent?: number[];
  avg_frequency_mhz?: number;
  core_frequency_mhz?: number[];
  min_frequency_mhz?: number;
  max_frequency_mhz?: number;
  load_1m?: number;
  load_5m?: number;
  load_15m?: number;
  model_name?: string;
  core_count?: number;
}

interface TelemetryResponse {
  status: string;
  service: string;
  version: string;
  uptime_seconds: number;
  timestamp: string;
  database: string;
  db_pool?: {
    acquired_conns: number;
    idle_conns: number;
    total_conns: number;
    max_conns: number;
  };
  runtime?: {
    goroutines: number;
    alloc_bytes: number;
    total_alloc_bytes: number;
    sys_bytes: number;
    gc_cycles: number;
  };
  cpu?: CPUStats;
}

interface MetricPoint {
  time: string;
  cpuLoad: number;
  cpuFreqGHz: number;
  allocMB: number;
  goroutines: number;
  acquiredConns: number;
  idleConns: number;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
}

function formatUptime(seconds?: number): string {
  if (!seconds) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function formatFreqGHz(mhz?: number): string {
  if (!mhz || mhz <= 0) return "N/A";
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(2)} GHz`;
  }
  return `${Math.round(mhz)} MHz`;
}

export default function TelemetryPage() {
  const [data, setData] = React.useState<TelemetryResponse | null>(null);
  const [history, setHistory] = React.useState<MetricPoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [liveStream, setLiveStream] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [streamConnected, setStreamConnected] = React.useState(false);

  const processSnapshot = React.useCallback((json: TelemetryResponse) => {
    setData(json);

    const nowStr = new Date().toLocaleTimeString();
    const cpuLoad = Math.max(
      0,
      Math.min(100, Number(json.cpu?.usage_percent ?? 0)),
    );
    const cpuFreqGHz = Number(
      ((json.cpu?.avg_frequency_mhz ?? 0) / 1000).toFixed(2),
    );

    const point: MetricPoint = {
      time: nowStr,
      cpuLoad: Number(cpuLoad.toFixed(1)),
      cpuFreqGHz,
      allocMB: Number(
        ((json.runtime?.alloc_bytes || 0) / 1024 / 1024).toFixed(2),
      ),
      goroutines: json.runtime?.goroutines || 0,
      acquiredConns: json.db_pool?.acquired_conns || 0,
      idleConns: json.db_pool?.idle_conns || 0,
    };

    setHistory((prev) => {
      const next = [...prev, point];
      return next.slice(-30); // Keep last 30 samples for smooth high-res chart
    });
  }, []);

  const fetchTelemetry = React.useCallback(async () => {
    try {
      const res = await fetch("/api/telemetry");
      const json: TelemetryResponse = await res.json();
      if (!res.ok) throw new Error("Failed to fetch");
      processSnapshot(json);
    } catch {
      toast.error("Telemetry fetch failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [processSnapshot]);

  // Handle SSE streaming or fallback polling
  React.useEffect(() => {
    if (!liveStream) {
      setStreamConnected(false);
      fetchTelemetry();
      const interval = setInterval(fetchTelemetry, 3000);
      return () => clearInterval(interval);
    }

    let isSubscribed = true;
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource("/api/telemetry/stream");

      eventSource.onopen = () => {
        if (isSubscribed) setStreamConnected(true);
      };

      eventSource.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const parsed: TelemetryResponse = JSON.parse(event.data);
          processSnapshot(parsed);
          setLoading(false);
          setStreamConnected(true);
        } catch (e) {
          console.error("Failed to parse telemetry stream frame", e);
        }
      };

      eventSource.onerror = () => {
        if (!isSubscribed) return;
        setStreamConnected(false);
        eventSource?.close();

        // Graceful fallback to 2s polling if SSE disconnects
        fetchTelemetry();
        if (!fallbackInterval) {
          fallbackInterval = setInterval(fetchTelemetry, 2000);
        }
      };
    } catch {
      fetchTelemetry();
      fallbackInterval = setInterval(fetchTelemetry, 2000);
    }

    return () => {
      isSubscribed = false;
      eventSource?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [liveStream, fetchTelemetry, processSnapshot]);

  const currentCpuLoad = data?.cpu?.usage_percent ?? 0;
  const currentCpuFreqMHz = data?.cpu?.avg_frequency_mhz ?? 0;
  const coreUsages = data?.cpu?.core_usage_percent || [];
  const coreFreqs = data?.cpu?.core_frequency_mhz || [];

  const hasCpuMetrics = Boolean(
    data?.cpu &&
      ((data.cpu.avg_frequency_mhz ?? 0) > 0 ||
        (data.cpu.usage_percent ?? 0) > 0 ||
        (data.cpu.load_1m ?? 0) > 0 ||
        (data.cpu.core_count ?? 0) > 0 ||
        (data.cpu.model_name && data.cpu.model_name.length > 0)),
  );

  const getLoadColor = (pct: number) => {
    if (pct >= 80) return "text-rose-500";
    if (pct >= 50) return "text-amber-500";
    return "text-emerald-500";
  };

  const getLoadBadgeVariant = (pct: number) => {
    if (pct >= 80)
      return "text-rose-500 border-rose-500/30 bg-rose-500/10 font-mono text-[10px]";
    if (pct >= 50)
      return "text-amber-500 border-amber-500/30 bg-amber-500/10 font-mono text-[10px]";
    return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px]";
  };

  return (
    <DirectionalTransition>
      <DashboardShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                System Telemetry &amp; Performance
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time CPU load, frequency scaling, runtime memory, and
                connection metrics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/60 border border-border/50 text-[11px] font-medium">
                  {liveStream && streamConnected ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider text-[10px]">
                        Live (1s)
                      </span>
                    </>
                  ) : (
                    <>
                      <Radio className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground text-[10px]">
                        {liveStream ? "Connecting..." : "Polling"}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="live-stream"
                    checked={liveStream}
                    onCheckedChange={setLiveStream}
                  />
                  <Label
                    htmlFor="live-stream"
                    className="text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    Stream
                  </Label>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefreshing(true);
                  fetchTelemetry();
                }}
                disabled={refreshing}
                className="gap-1.5 text-xs cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {/* Top Overview Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Card 1: CPU Load */}
            <Card className="p-4 flex flex-col justify-between border-l-4 border-l-emerald-500 bg-card/60 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  CPU Load
                </span>
                <Gauge
                  className={`h-4 w-4 ${hasCpuMetrics ? getLoadColor(currentCpuLoad) : "text-muted-foreground"}`}
                />
              </div>
              <div className="mt-2.5">
                {loading && !data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-1.5 w-full" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ) : hasCpuMetrics ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                        {currentCpuLoad.toFixed(1)}%
                      </span>
                      <Badge
                        variant="outline"
                        className={getLoadBadgeVariant(currentCpuLoad)}
                      >
                        {currentCpuLoad < 50
                          ? "Normal"
                          : currentCpuLoad < 80
                            ? "Elevated"
                            : "Heavy"}
                      </Badge>
                    </div>
                    <div className="w-full bg-secondary/80 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-[width] duration-500 rounded-full"
                        style={{ width: `${Math.min(100, currentCpuLoad)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1.5 block truncate">
                      Load: {data?.cpu?.load_1m?.toFixed(2) ?? "0.00"} /{" "}
                      {data?.cpu?.load_5m?.toFixed(2) ?? "0.00"}
                    </span>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono tracking-tight text-muted-foreground">
                        N/A
                      </span>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground border-border text-[10px]"
                      >
                        Awaiting API
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Restart API service to track
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Card 2: CPU Frequency */}
            <Card className="p-4 flex flex-col justify-between border-l-4 border-l-cyan-500 bg-card/60 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  CPU Clock Speed
                </span>
                <Flame
                  className={`h-4 w-4 ${hasCpuMetrics && currentCpuFreqMHz > 0 ? "text-cyan-500" : "text-muted-foreground"}`}
                />
              </div>
              <div className="mt-2.5">
                {loading && !data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-24" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-3.5 w-14" />
                      <Skeleton className="h-3.5 w-14" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : hasCpuMetrics && currentCpuFreqMHz > 0 ? (
                  <>
                    <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                      {formatFreqGHz(currentCpuFreqMHz)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {data?.cpu?.min_frequency_mhz &&
                      data.cpu.min_frequency_mhz > 0 ? (
                        <Badge
                          variant="outline"
                          className="font-mono text-[9px] px-1 py-0"
                        >
                          Min {formatFreqGHz(data.cpu.min_frequency_mhz)}
                        </Badge>
                      ) : null}
                      {data?.cpu?.max_frequency_mhz &&
                      data.cpu.max_frequency_mhz > 0 ? (
                        <Badge
                          variant="outline"
                          className="font-mono text-[9px] px-1 py-0"
                        >
                          Max {formatFreqGHz(data.cpu.max_frequency_mhz)}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1.5 block truncate">
                      {data?.cpu?.model_name || "Hardware Governor Active"}
                    </span>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-2xl font-bold font-mono tracking-tight text-muted-foreground">
                      N/A
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Restart API service to track
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Card 3: Active Workers */}
            <Card className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Active Workers
                </span>
                <Cpu className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2.5">
                {loading && !data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      {data?.runtime?.goroutines ?? 0}
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Concurrent Go routines
                    </span>
                  </>
                )}
              </div>
            </Card>

            {/* Card 4: Active Memory */}
            <Card className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Active Memory
                </span>
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2.5">
                {loading && !data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      {formatBytes(data?.runtime?.alloc_bytes)}
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Reserved: {formatBytes(data?.runtime?.sys_bytes)}
                    </span>
                  </>
                )}
              </div>
            </Card>

            {/* Card 5: GC Cleanups */}
            <Card className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  GC Cycles
                </span>
                <RefreshCw className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2.5">
                {loading && !data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      {data?.runtime?.gc_cycles ?? 0}
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Garbage collections
                    </span>
                  </>
                )}
              </div>
            </Card>

            {/* Card 6: Database Pool */}
            <Card className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Database Conns
                </span>
                <Database className="h-4 w-4 text-violet-500" />
              </div>
              <div className="mt-2.5">
                {loading && !data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      {data?.db_pool?.acquired_conns ?? 0} /{" "}
                      {data?.db_pool?.max_conns ?? 10}
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      {data?.db_pool?.idle_conns ?? 0} idle connections
                    </span>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* CPU Realtime Tracking Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chart 1: Real-time CPU Load */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-emerald-500" />
                      Realtime CPU Utilization (%)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Continuous server CPU load samples
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={getLoadBadgeVariant(currentCpuLoad)}
                  >
                    {currentCpuLoad.toFixed(1)}% Current
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loading && history.length === 0 ? (
                  <div className="h-[240px] w-full pt-4">
                    <Skeleton className="h-full w-full rounded-md" />
                  </div>
                ) : !hasCpuMetrics && history.length === 0 ? (
                  <div className="h-[240px] w-full flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed border-border/70 bg-muted/20">
                    <Gauge className="h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-xs font-medium text-foreground">
                      CPU Telemetry Pending
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                      Restart or redeploy the realm-api backend to stream
                      real-time CPU utilization metrics.
                    </p>
                  </div>
                ) : (
                  <div className="h-[240px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={history}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="cpuLoadGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10b981"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10b981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="time"
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-card)",
                            borderColor: "var(--color-border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(val: unknown) => [
                            `${Number(val).toFixed(1)}%`,
                            "CPU Load",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="cpuLoad"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#cpuLoadGrad)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Real-time CPU Frequency */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Flame className="h-4 w-4 text-cyan-500" />
                      Realtime Frequency Scaling (GHz)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Dynamic processor clock speed fluctuations
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] text-cyan-500 border-cyan-500/30 bg-cyan-500/10"
                  >
                    {formatFreqGHz(currentCpuFreqMHz)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loading && history.length === 0 ? (
                  <div className="h-[240px] w-full pt-4">
                    <Skeleton className="h-full w-full rounded-md" />
                  </div>
                ) : !hasCpuMetrics && history.length === 0 ? (
                  <div className="h-[240px] w-full flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed border-border/70 bg-muted/20">
                    <Flame className="h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-xs font-medium text-foreground">
                      Clock Speed Telemetry Pending
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                      Restart or redeploy the realm-api backend to stream
                      processor clock frequency metrics.
                    </p>
                  </div>
                ) : (
                  <div className="h-[240px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={history}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="cpuFreqGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#06b6d4"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="#06b6d4"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="time"
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(val) => `${Number(val).toFixed(1)}G`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-card)",
                            borderColor: "var(--color-border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(val: unknown) => [
                            `${Number(val).toFixed(2)} GHz`,
                            "Clock Frequency",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="cpuFreqGHz"
                          stroke="#06b6d4"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#cpuFreqGrad)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Per-Core Breakdown Grid */}
          {loading && !data ? (
            <Card className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    Per-Core Utilization &amp; Frequency Matrix
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Granular load distribution across logical execution threads
                  </p>
                </div>
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {[0, 1, 2, 3].map((id) => (
                  <div
                    key={`skeleton-core-${id}`}
                    className="p-3 rounded-lg border border-border/60 bg-secondary/30 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-14" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            </Card>
          ) : coreUsages.length > 0 ? (
            <Card className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    Per-Core Utilization &amp; Frequency Matrix
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Granular load distribution across {coreUsages.length}{" "}
                    logical execution threads
                  </p>
                </div>
                {data?.cpu?.model_name ? (
                  <Badge
                    variant="secondary"
                    className="font-mono text-[11px] self-start sm:self-auto"
                  >
                    {data?.cpu?.model_name}
                  </Badge>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {coreUsages
                  .map((usage, id) => ({
                    id,
                    usage,
                    freq: coreFreqs[id] ?? currentCpuFreqMHz,
                    roundedUsage: Math.round(usage),
                  }))
                  .map((core) => (
                    <div
                      key={`cpu-core-slot-${core.id}`}
                      className="p-3 rounded-lg border border-border/60 bg-secondary/30 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          Core #{core.id}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatFreqGHz(core.freq)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Load</span>
                          <span
                            className={`font-mono font-semibold ${getLoadColor(core.usage)}`}
                          >
                            {core.roundedUsage}%
                          </span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-[width] duration-300 rounded-full ${
                              core.usage >= 80
                                ? "bg-rose-500"
                                : core.usage >= 50
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(2, core.usage))}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          ) : null}

          {/* Memory & DB Connection Pool Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Memory Usage Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      Memory Usage (MB)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Heap memory allocated over time
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {formatBytes(data?.runtime?.alloc_bytes)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loading && history.length === 0 ? (
                  <div className="h-[220px] w-full pt-4">
                    <Skeleton className="h-full w-full rounded-md" />
                  </div>
                ) : (
                  <div className="h-[220px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={history}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="telemetryAlloc"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="time"
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(val) => `${Number(val).toFixed(0)}M`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-card)",
                            borderColor: "var(--color-border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(val: unknown) => [
                            `${Number(val).toFixed(2)} MB`,
                            "Memory",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="allocMB"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#telemetryAlloc)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workers & Connection Pool Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      Workers &amp; DB Connections
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Concurrent Go routines and active DB connections
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-violet-500" />
                      Workers
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      DB Connections
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading && history.length === 0 ? (
                  <div className="h-[220px] w-full pt-4">
                    <Skeleton className="h-full w-full rounded-md" />
                  </div>
                ) : (
                  <div className="h-[220px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={history}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="time"
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-card)",
                            borderColor: "var(--color-border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="goroutines"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="acquiredConns"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Server Metadata Footer Card */}
          <Card className="p-4 bg-card/60 backdrop-blur-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Backend Service
                </span>
                <span className="font-semibold text-foreground font-mono">
                  {data?.service || "realm-api"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  API Version
                </span>
                <span className="font-semibold text-foreground font-mono">
                  v{data?.version || "1.0.0"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Uptime
                </span>
                <span className="font-semibold text-foreground">
                  {formatUptime(data?.uptime_seconds)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Database State
                </span>
                <Badge
                  variant="outline"
                  className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px]"
                >
                  {data?.database || "Connected"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  CPU Hardware
                </span>
                <span className="font-semibold text-foreground truncate block">
                  {data?.cpu?.model_name || "Detected"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Total Threads
                </span>
                <span className="font-semibold text-foreground font-mono">
                  {data?.cpu?.core_count || 4} Logical Cores
                </span>
              </div>
            </div>
          </Card>
        </div>
      </DashboardShell>
    </DirectionalTransition>
  );
}

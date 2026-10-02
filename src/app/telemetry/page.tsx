"use client";

import { Cpu, Database, RefreshCw, Zap } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

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
}

interface MetricPoint {
  time: string;
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

export default function TelemetryPage() {
  const [data, setData] = React.useState<TelemetryResponse | null>(null);
  const [history, setHistory] = React.useState<MetricPoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchTelemetry = React.useCallback(async () => {
    try {
      const res = await fetch("/api/telemetry");
      const json: TelemetryResponse = await res.json();
      if (!res.ok) throw new Error("Failed to fetch");

      setData(json);

      // Append metric point
      const nowStr = new Date().toLocaleTimeString();
      const point: MetricPoint = {
        time: nowStr,
        allocMB: (json.runtime?.alloc_bytes || 0) / 1024 / 1024,
        goroutines: json.runtime?.goroutines || 0,
        acquiredConns: json.db_pool?.acquired_conns || 0,
        idleConns: json.db_pool?.idle_conns || 0,
      };

      setHistory((prev) => {
        const next = [...prev, point];
        return next.slice(-20); // Keep last 20 samples
      });
    } catch {
      toast.error("Telemetry fetch failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTelemetry]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Telemetrics &amp; Engine Runtime
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Low-overhead real-time metrics for Go 1.26 runtime, GC cycles, and
              PostgreSQL connection pool.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label
                htmlFor="auto-refresh"
                className="text-xs text-muted-foreground cursor-pointer select-none"
              >
                Live stream (5s)
              </Label>
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

        {/* Runtime Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Go Goroutines
              </span>
              <Cpu className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-foreground">
                {data?.runtime?.goroutines ?? 0}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Concurrent execution threads
              </span>
            </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Heap Allocation
              </span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-foreground">
                {formatBytes(data?.runtime?.alloc_bytes)}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Sys Total: {formatBytes(data?.runtime?.sys_bytes)}
              </span>
            </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                GC Invocations
              </span>
              <RefreshCw className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-foreground">
                {data?.runtime?.gc_cycles ?? 0}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Cumulative collections
              </span>
            </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                DB Connection Pool
              </span>
              <Database className="h-4 w-4 text-violet-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-foreground">
                {data?.db_pool?.acquired_conns ?? 0} /{" "}
                {data?.db_pool?.max_conns ?? 10}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                {data?.db_pool?.idle_conns ?? 0} idle connections
              </span>
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Memory Heap Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Heap Memory (MB)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Allocated memory profile across samples
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {formatBytes(data?.runtime?.alloc_bytes)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full pt-4">
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
                      tickFormatter={(val) => `${val.toFixed(1)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        borderColor: "var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [
                        `${Number(val).toFixed(2)} MB`,
                        "Heap Alloc",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="allocMB"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#telemetryAlloc)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Goroutines & Connection Pool Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Goroutines &amp; DB Conns
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Concurrent runtime workers and database connections
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                    Goroutines
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    DB Conns
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full pt-4">
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
                    />
                    <Line
                      type="monotone"
                      dataKey="acquiredConns"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Server Metadata Card */}
        <Card className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
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
                Database Ping
              </span>
              <Badge
                variant="outline"
                className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px]"
              >
                {data?.database || "Connected"}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}

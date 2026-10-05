"use client";

import {
  ArrowUpRight,
  Cpu,
  Database,
  HardDrive,
  Mail,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

interface TelemetryData {
  status: string;
  uptime_seconds: number;
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

interface StorageStats {
  active_backend: string;
  total_files: number;
  total_original_bytes: number;
  total_compressed_bytes: number;
  average_savings_percent: number;
  s3_bucket_name?: string;
}

interface RecentLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  component?: string;
}

interface AnalyticsTrendPoint {
  date: string;
  views: number;
  unique: number;
}

interface AnalyticsStats {
  total_views: number;
  unique_visitors: number;
  views_trend?: AnalyticsTrendPoint[];
  trend?: Array<{ bucket: string; views: number; visitors: number }>;
}

function formatBytes(bytes?: number | string | null): string {
  if (bytes === undefined || bytes === null) return "0 B";
  const num = typeof bytes === "string" ? Number(bytes) : bytes;
  if (Number.isNaN(num) || num <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(num) / Math.log(k));
  if (i < 0) return "0 B";
  const sizeIdx = Math.min(i, sizes.length - 1);
  return `${(num / k ** sizeIdx).toFixed(sizeIdx === 0 ? 0 : 1)} ${sizes[sizeIdx]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function DashboardPage() {
  const [telemetry, setTelemetry] = React.useState<TelemetryData | null>(null);
  const [storageStats, setStorageStats] = React.useState<StorageStats | null>(
    null,
  );
  const [recentLogs, setRecentLogs] = React.useState<RecentLog[]>([]);
  const [messagesCount, setMessagesCount] = React.useState<number>(0);
  const [commentsCount, setCommentsCount] = React.useState<number>(0);
  const [analyticsStats, setAnalyticsStats] =
    React.useState<AnalyticsStats | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      const fetchJson = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      };

      const [telRes, storRes, logsRes, msgRes, commRes, analyticsRes] =
        await Promise.allSettled([
          fetchJson("/api/telemetry"),
          fetchJson("/api/storage?type=stats"),
          fetchJson("/api/logs?limit=5"),
          fetchJson("/api/contact?limit=1"),
          fetchJson("/api/comments?limit=1"),
          fetchJson("/api/analytics?period=24h"),
        ]);

      if (telRes.status === "fulfilled" && !telRes.value.error) {
        setTelemetry(telRes.value);
      }
      if (storRes.status === "fulfilled" && !storRes.value.error) {
        setStorageStats(storRes.value);
      }
      if (logsRes.status === "fulfilled" && logsRes.value.logs) {
        setRecentLogs(logsRes.value.logs);
      }
      if (
        msgRes.status === "fulfilled" &&
        typeof msgRes.value.total === "number"
      ) {
        setMessagesCount(msgRes.value.total);
      }
      if (
        commRes.status === "fulfilled" &&
        typeof commRes.value.total === "number"
      ) {
        setCommentsCount(commRes.value.total);
      }
      if (analyticsRes.status === "fulfilled" && !analyticsRes.value.error) {
        setAnalyticsStats(analyticsRes.value);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const trafficTrend = React.useMemo(() => {
    if (analyticsStats?.views_trend && analyticsStats.views_trend.length > 0) {
      return analyticsStats.views_trend.map((pt) => ({
        bucket: pt.date.length > 10 ? pt.date.slice(11) : pt.date,
        views: pt.views,
        visitors: pt.unique,
      }));
    }
    if (analyticsStats?.trend && analyticsStats.trend.length > 0) {
      return analyticsStats.trend;
    }
    return [];
  }, [analyticsStats]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Top Control Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Command Centre
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Live system status, storage overview, and recent activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
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

        {/* 4 Core KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Storage KPI */}
          <Card className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Storage
              </span>
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">
                  {storageStats?.total_files ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">files</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono px-1.5 py-0"
                >
                  {storageStats?.active_backend === "s3"
                    ? "Cloud S3"
                    : "Local Disk"}
                </Badge>
                {storageStats?.average_savings_percent ? (
                  <span className="text-[11px] text-emerald-500 font-medium flex items-center">
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                    {storageStats.average_savings_percent.toFixed(1)}% saved
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-[11px] text-muted-foreground">
              <span>
                {formatBytes(storageStats?.total_compressed_bytes || 0)} stored
              </span>
              <Link
                href="/storage"
                className="hover:text-foreground inline-flex items-center gap-0.5"
              >
                Explorer <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>

          {/* Database Pool KPI */}
          <Card className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Database Connections
              </span>
              <Database className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">
                  {telemetry?.db_pool?.acquired_conns ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {telemetry?.db_pool?.max_conns ?? 10} active
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0"
                >
                  {telemetry?.database === "connected"
                    ? "Healthy"
                    : telemetry?.database || "Unknown"}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {telemetry?.db_pool?.idle_conns ?? 0} idle
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-[11px] text-muted-foreground">
              <span>
                Uptime: {formatUptime(telemetry?.uptime_seconds || 0)}
              </span>
              <Link
                href="/telemetry"
                className="hover:text-foreground inline-flex items-center gap-0.5"
              >
                Performance <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>

          {/* Server Memory KPI */}
          <Card className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Server Memory
              </span>
              <Cpu className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">
                  {formatBytes(telemetry?.runtime?.alloc_bytes || 0)}
                </span>
                <span className="text-xs text-muted-foreground">in use</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 font-mono"
                >
                  {telemetry?.runtime?.goroutines ?? 0} Workers
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {telemetry?.runtime?.gc_cycles ?? 0} Cleanups
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-[11px] text-muted-foreground">
              <span>
                Reserved: {formatBytes(telemetry?.runtime?.sys_bytes || 0)}
              </span>
              <Link
                href="/telemetry"
                className="hover:text-foreground inline-flex items-center gap-0.5"
              >
                Details <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>

          {/* Activity / Submissions & Comments */}
          <Card className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Inbox &amp; Community
              </span>
              <Mail className="h-4 w-4 text-violet-500" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">
                  {messagesCount}
                </span>
                <span className="text-xs text-muted-foreground">messages</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 font-mono"
                >
                  {commentsCount} Comments
                </Badge>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-[11px] text-muted-foreground">
              <Link
                href="/messages"
                className="hover:text-foreground inline-flex items-center gap-0.5"
              >
                Inquiries <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link
                href="/comments"
                className="hover:text-foreground inline-flex items-center gap-0.5"
              >
                Moderation <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Charts & Live Feed Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Web Traffic Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">
                      Visitor Traffic (24h)
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {analyticsStats?.total_views ?? 0} views •{" "}
                      {analyticsStats?.unique_visitors ?? 0} visitors
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Live page views and unique visitors across all managed sites
                  </CardDescription>
                </div>
                <Link
                  href="/analytics"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                >
                  Analytics <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full pt-4">
                {trafficTrend.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                    <span>No traffic recorded in the last 24 hours.</span>
                    <span className="text-[11px] opacity-70">
                      Page views from realm-reference will appear here in real
                      time.
                    </span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trafficTrend}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="trafficViewsGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-primary)"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-primary)"
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="trafficVisGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="bucket"
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          borderColor: "var(--color-border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        name="Page Views"
                        dataKey="views"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#trafficViewsGrad)"
                      />
                      <Area
                        type="monotone"
                        name="Unique Visitors"
                        dataKey="visitors"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#trafficVisGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Recent Logs */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Recent Logs
                </CardTitle>
                <Link
                  href="/logs"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                >
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <CardDescription className="text-xs">
                Latest system events and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 flex-1">
              {recentLogs.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
                  No logs recorded yet.
                </div>
              ) : (
                recentLogs.map((log) => {
                  const isErr = log.level.toUpperCase() === "ERROR";
                  const isWarn = log.level.toUpperCase() === "WARN";

                  return (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-muted/40 border border-border/40 text-xs font-mono flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            isErr
                              ? "text-destructive"
                              : isWarn
                                ? "text-amber-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="truncate text-foreground font-sans text-xs">
                        {log.message}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}

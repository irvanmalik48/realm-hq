"use client";

import {
  Activity,
  ArrowUpRight,
  Clock,
  Compass,
  FileText,
  Globe,
  Laptop,
  Monitor,
  RefreshCw,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TrendPoint {
  date: string;
  views: number;
  unique: number;
}

interface PageStat {
  path: string;
  views: number;
  unique: number;
}

interface PostStat {
  slug: string;
  title: string;
  views: number;
  unique: number;
}

interface ReferrerStat {
  referrer: string;
  count: number;
}

interface DeviceStat {
  device: string;
  count: number;
}

interface BrowserStat {
  browser: string;
  count: number;
}

interface RecentPageView {
  id: string;
  path: string;
  post_slug?: string;
  referrer: string;
  browser: string;
  os: string;
  created_at: string;
}

interface AnalyticsStats {
  total_views: number;
  unique_visitors: number;
  views_today: number;
  views_trend: TrendPoint[];
  top_pages: PageStat[];
  top_posts: PostStat[];
  top_referrers: ReferrerStat[];
  device_stats: DeviceStat[];
  browser_stats: BrowserStat[];
  recent_views: RecentPageView[];
}

export default function AnalyticsPage() {
  const [period, setPeriod] = React.useState("30d");
  const [data, setData] = React.useState<AnalyticsStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const fetchStats = React.useCallback(
    async (showToast = false) => {
      try {
        if (showToast) setIsRefreshing(true);
        const res = await fetch(`/api/analytics?period=${period}`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const json = await res.json();
        setData(json);
        if (showToast) toast.success("Analytics metrics updated");
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to load analytics",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [period],
  );

  React.useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(false), 20000); // 20s polling
    return () => clearInterval(interval);
  }, [fetchStats]);

  const topPost = data?.top_posts?.[0];

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Web Analytics
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Live traffic, visitor telemetry, and engagement metrics for realm.
              across all pages and articles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-44">
              <Select
                value={period}
                onValueChange={(val) => {
                  if (val) setPeriod(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background/50 hover:bg-accent/40 border-dashed sm:border-solid transition-colors">
                  <div className="flex items-center gap-1.5 truncate">
                    <Clock className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground font-normal">
                      Range:
                    </span>
                    <SelectValue>
                      {(val) => {
                        const labels: Record<string, string> = {
                          "24h": "Last 24 Hours",
                          "7d": "Last 7 Days",
                          "30d": "Last 30 Days",
                          all: "All Time",
                        };
                        return (
                          <span className="font-medium text-foreground">
                            {labels[val] || val}
                          </span>
                        );
                      }}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStats(true)}
              disabled={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw
                data-icon="inline-start"
                className={isRefreshing ? "animate-spin" : ""}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Total Pageviews
              </span>
              <Activity className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {data?.total_views ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Unique Visitors
              </span>
              <Users className="size-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data?.unique_visitors ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Views Today
              </span>
              <TrendingUp className="size-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {data?.views_today ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Top Article
              </span>
              <FileText className="size-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : topPost ? (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold truncate text-foreground">
                    {topPost.title || topPost.slug}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {topPost.views} {topPost.views === 1 ? "view" : "views"}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  No visits recorded
                </span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Traffic Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Traffic Trends</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {period === "24h"
                  ? "Hourly"
                  : period === "7d"
                    ? "Daily (7d)"
                    : "Daily"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !data?.views_trend || data.views_trend.length === 0 ? (
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyTitle>No traffic recorded</EmptyTitle>
                  <EmptyDescription>
                    Pageviews from realm-reference will appear here in
                    real-time.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.views_trend}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="viewsGrad"
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
                        id="uniqueGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="date"
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-popover)",
                        borderColor: "var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Total Pageviews"
                      stroke="var(--color-primary)"
                      fillOpacity={1}
                      fill="url(#viewsGrad)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="unique"
                      name="Unique Visitors"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#uniqueGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grid: Top Pages & Top Articles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Pages */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Compass className="size-4 text-primary" />
                <span>Top Pages</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 flex flex-col gap-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : !data?.top_pages || data.top_pages.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No pages tracked yet.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">Page Path</TableHead>
                      <TableHead className="text-xs text-right">
                        Views
                      </TableHead>
                      <TableHead className="text-xs text-right">
                        Unique
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.top_pages.map((p) => (
                      <TableRow key={p.path} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-medium text-foreground py-2.5">
                          {p.path}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium py-2.5">
                          {p.views}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground py-2.5">
                          {p.unique}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Top Articles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="size-4 text-emerald-500" />
                <span>Top Articles & Documentation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 flex flex-col gap-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : !data?.top_posts || data.top_posts.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No article visits recorded yet.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">Article</TableHead>
                      <TableHead className="text-xs text-right">
                        Views
                      </TableHead>
                      <TableHead className="text-xs text-right">
                        Unique
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.top_posts.map((post) => (
                      <TableRow key={post.slug} className="hover:bg-muted/30">
                        <TableCell className="text-xs py-2.5">
                          <Link
                            href={`/posts/${post.slug}`}
                            className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                          >
                            <span className="truncate max-w-[240px]">
                              {post.title || post.slug}
                            </span>
                            <ArrowUpRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium py-2.5">
                          {post.views}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground py-2.5">
                          {post.unique}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grid: Traffic Sources & Device Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referrers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="size-4 text-sky-500" />
                <span>Referrers & Sources</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {!data?.top_referrers || data.top_referrers.length === 0 ? (
                <span className="text-xs text-muted-foreground py-4 text-center">
                  No referrers recorded
                </span>
              ) : (
                data.top_referrers.map((ref) => (
                  <div
                    key={ref.referrer}
                    className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-none"
                  >
                    <span className="truncate max-w-[200px] text-foreground font-mono">
                      {ref.referrer}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[11px] h-5 font-normal"
                    >
                      {ref.count}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Devices */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Monitor className="size-4 text-amber-500" />
                <span>Device Category</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {!data?.device_stats || data.device_stats.length === 0 ? (
                <span className="text-xs text-muted-foreground py-4 text-center">
                  No device telemetry
                </span>
              ) : (
                data.device_stats.map((dev) => (
                  <div
                    key={dev.device}
                    className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-none"
                  >
                    <div className="flex items-center gap-2">
                      {dev.device === "Mobile" ? (
                        <Smartphone className="size-3.5 text-muted-foreground" />
                      ) : dev.device === "Tablet" ? (
                        <Laptop className="size-3.5 text-muted-foreground" />
                      ) : (
                        <Monitor className="size-3.5 text-muted-foreground" />
                      )}
                      <span className="font-medium text-foreground">
                        {dev.device}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[11px] h-5">
                      {dev.count}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Browsers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Laptop className="size-4 text-indigo-500" />
                <span>Browsers</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {!data?.browser_stats || data.browser_stats.length === 0 ? (
                <span className="text-xs text-muted-foreground py-4 text-center">
                  No browser data
                </span>
              ) : (
                data.browser_stats.map((b) => (
                  <div
                    key={b.browser}
                    className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-none"
                  >
                    <span className="font-medium text-foreground">
                      {b.browser}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[11px] h-5 font-normal"
                    >
                      {b.count}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Recent Pageviews Feed */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <span>Real-Time Visitor Activity</span>
            </CardTitle>
            <span className="text-xs text-muted-foreground font-mono">
              Live Stream
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.recent_views || data.recent_views.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No recent visits recorded.
              </div>
            ) : (
              <Table className="min-w-[650px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs">Path</TableHead>
                    <TableHead className="text-xs">Referrer</TableHead>
                    <TableHead className="text-xs">
                      Client Environment
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Timestamp
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_views.map((visit) => {
                    const date = new Date(visit.created_at);
                    return (
                      <TableRow key={visit.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-medium text-foreground py-2.5">
                          {visit.path}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5 font-mono">
                          {visit.referrer}
                        </TableCell>
                        <TableCell className="text-xs py-2.5">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4.5 px-1.5 font-normal"
                            >
                              {visit.browser}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4.5 px-1.5 font-normal"
                            >
                              {visit.os}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground py-2.5">
                          {date.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

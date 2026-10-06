export interface RawTrendPoint {
  date?: string;
  bucket?: string;
  views: number;
  unique?: number;
  visitors?: number;
}

export interface NormalizedTrendPoint {
  date: string;
  bucket: string;
  views: number;
  unique: number;
  visitors: number;
}

/**
 * Fills missing time intervals with 0 views and 0 visitors so the
 * analytics traffic graph renders a continuous, fully extended curve across the period.
 */
export function buildContinuousTrend(
  rawPoints: RawTrendPoint[] | undefined | null,
  period: "24h" | "7d" | "30d" | "all" | string = "24h",
): NormalizedTrendPoint[] {
  // If period is 'all', normalize existing points
  if (period === "all") {
    if (!rawPoints || rawPoints.length === 0) return [];
    return rawPoints.map((pt) => {
      const v = pt.unique ?? pt.visitors ?? 0;
      const d = pt.date || pt.bucket || "";
      const b = d.length > 10 ? d.slice(11) : d;
      return {
        date: d,
        bucket: b,
        views: pt.views || 0,
        unique: v,
        visitors: v,
      };
    });
  }

  // Create lookup map of existing raw points
  const lookup = new Map<string, { views: number; unique: number }>();
  if (rawPoints && rawPoints.length > 0) {
    for (const pt of rawPoints) {
      const unique = pt.unique ?? pt.visitors ?? 0;
      const val = { views: pt.views || 0, unique };
      const d = pt.date || pt.bucket || "";
      if (!d) continue;

      // Store by exact date string (e.g. "2026-10-06 07:00", "2026-10-06", "07:00")
      lookup.set(d, val);

      // If date contains hour or date part, store normalized keys
      if (d.length > 10) {
        // e.g. "2026-10-06 07:00" -> key "07:00" and key "2026-10-06 07"
        const hourPart = d.slice(11, 16);
        lookup.set(hourPart, val);
        lookup.set(d.slice(0, 13), val);
      } else {
        lookup.set(d.slice(0, 10), val);
      }
    }
  }

  const now = new Date();
  const results: NormalizedTrendPoint[] = [];

  if (period === "24h") {
    // Generate 24 hourly buckets from 23 hours ago up to current UTC hour
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      const hour = String(d.getUTCHours()).padStart(2, "0");

      const fullKey = `${year}-${month}-${day} ${hour}:00`;
      const dateHourPrefix = `${year}-${month}-${day} ${hour}`;
      const shortHour = `${hour}:00`;

      const match = lookup.get(fullKey) ||
        lookup.get(dateHourPrefix) ||
        lookup.get(shortHour) || { views: 0, unique: 0 };

      results.push({
        date: shortHour,
        bucket: shortHour,
        views: match.views,
        unique: match.unique,
        visitors: match.unique,
      });
    }
    return results;
  }

  if (period === "7d") {
    // Generate 7 daily buckets from 6 days ago up to today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");

      const isoDate = `${year}-${month}-${day}`;
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });

      const match = lookup.get(isoDate) ||
        lookup.get(label) || { views: 0, unique: 0 };

      results.push({
        date: label,
        bucket: label,
        views: match.views,
        unique: match.unique,
        visitors: match.unique,
      });
    }
    return results;
  }

  if (period === "30d") {
    // Generate 30 daily buckets from 29 days ago up to today
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");

      const isoDate = `${year}-${month}-${day}`;
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });

      const match = lookup.get(isoDate) ||
        lookup.get(label) || { views: 0, unique: 0 };

      results.push({
        date: label,
        bucket: label,
        views: match.views,
        unique: match.unique,
        visitors: match.unique,
      });
    }
    return results;
  }

  return results;
}

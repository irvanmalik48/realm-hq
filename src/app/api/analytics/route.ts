import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiUrl =
      env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8080";

    const forwardRes = await fetch(`${apiUrl}/v1/analytics/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": req.headers.get("user-agent") || "",
        "X-Forwarded-For":
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "",
      },
      body: JSON.stringify(body),
    });

    if (!forwardRes.ok) {
      const errorData = await forwardRes.json().catch(() => ({
        error: "Failed to record analytics event",
      }));
      return NextResponse.json(errorData, {
        status: forwardRes.status,
        headers: corsHeaders,
      });
    }

    const data = await forwardRes.json();
    return NextResponse.json(data, {
      status: forwardRes.status,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Error logging analytics event in HQ:", err);
    return NextResponse.json(
      { error: "Failed to record analytics event" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";
    const apiUrl =
      env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8080";

    const res = await fetch(
      `${apiUrl}/v1/analytics/stats?period=${encodeURIComponent(period)}`,
      {
        cache: "no-store",
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch analytics stats from api" },
        { status: res.status, headers: corsHeaders },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Error fetching analytics in HQ:", err);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500, headers: corsHeaders },
    );
  }
}

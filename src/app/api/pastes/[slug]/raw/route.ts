import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

function getApiBaseUrl(): string {
  return (
    process.env.API_URL ||
    env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080"
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const headers: Record<string, string> = {};
    const password =
      req.headers.get("x-paste-password") ||
      req.nextUrl.searchParams.get("password");
    if (password) {
      headers["X-Paste-Password"] = password;
    }

    const res = await fetch(
      `${getApiBaseUrl()}/v1/pastes/${encodeURIComponent(slug)}/raw`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!res.ok) {
      return new NextResponse("Paste not found or expired", {
        status: res.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const content = await res.text();
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return new NextResponse(
      err instanceof Error ? err.message : "Failed to fetch raw paste",
      {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  }
}

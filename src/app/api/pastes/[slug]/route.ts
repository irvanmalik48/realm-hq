import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { requireAuth } from "@/lib/auth/server-auth";

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
    const headers: Record<string, string> = { Accept: "application/json" };
    const password =
      req.headers.get("x-paste-password") ||
      req.nextUrl.searchParams.get("password");
    if (password) {
      headers["X-Paste-Password"] = password;
    }

    const res = await fetch(
      `${getApiBaseUrl()}/v1/pastes/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.error || errorData?.message || res.statusText },
        { status: res.status },
      );
    }

    const data = await res.json().catch(() => null);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch paste" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const auth = requireAuth(req);
    if (auth.error) return auth.error;

    const { slug } = await params;
    const res = await fetch(
      `${getApiBaseUrl()}/v1/pastes/${encodeURIComponent(slug)}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
      },
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.error || errorData?.message || res.statusText },
        { status: res.status },
      );
    }

    const data = await res.json().catch(() => null);
    return NextResponse.json(data || { success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete paste" },
      { status: 500 },
    );
  }
}

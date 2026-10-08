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
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const res = await fetch(
      `${getApiBaseUrl()}/v1/posts/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
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
      { error: err instanceof Error ? err.message : "Failed to fetch post" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const auth = requireAuth(req);
    if (auth.error) return auth.error;

    const { slug } = await params;
    const body = await req.json();
    const res = await fetch(
      `${getApiBaseUrl()}/v1/posts/${encodeURIComponent(slug)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(body),
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
      { error: err instanceof Error ? err.message : "Failed to update post" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const auth = requireAuth(req);
    if (auth.error) return auth.error;

    const { slug } = await params;
    const body = await req.json();
    const res = await fetch(
      `${getApiBaseUrl()}/v1/posts/${encodeURIComponent(slug)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(body),
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
      { error: err instanceof Error ? err.message : "Failed to update post" },
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
      `${getApiBaseUrl()}/v1/posts/${encodeURIComponent(slug)}`,
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
      { error: err instanceof Error ? err.message : "Failed to delete post" },
      { status: 500 },
    );
  }
}

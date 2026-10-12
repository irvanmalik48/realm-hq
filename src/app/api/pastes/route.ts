import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { getSessionToken } from "@/lib/auth/server-auth";

function getApiBaseUrl(): string {
  return (
    process.env.API_URL ||
    env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080"
  );
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(`${getApiBaseUrl()}/v1/pastes`);
    const { searchParams } = req.nextUrl;

    const limit = searchParams.get("limit");
    if (limit) url.searchParams.set("limit", limit);

    const offset = searchParams.get("offset");
    if (offset) url.searchParams.set("offset", offset);

    const search = searchParams.get("search");
    if (search) url.searchParams.set("search", search);

    const syntax = searchParams.get("syntax");
    if (syntax) url.searchParams.set("syntax", syntax);

    const isPublic = searchParams.get("public");
    if (isPublic !== null) url.searchParams.set("public", isPublic);

    const headers: Record<string, string> = { Accept: "application/json" };
    const token = getSessionToken(req);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return NextResponse.json(
        {
          error: errorData?.error || errorData?.message || res.statusText,
          pastes: [],
          total: 0,
        },
        { status: res.status },
      );
    }

    const data = await res.json().catch(() => null);
    return NextResponse.json({
      pastes: Array.isArray(data?.pastes) ? data.pastes : [],
      total: typeof data?.total === "number" ? data.total : 0,
    });
  } catch (error) {
    console.error("Failed to fetch pastes from API:", error);
    return NextResponse.json({ pastes: [], total: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const token = getSessionToken(req);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${getApiBaseUrl()}/v1/pastes`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.error || errorData?.message || res.statusText },
        { status: res.status },
      );
    }

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create paste" },
      { status: 500 },
    );
  }
}

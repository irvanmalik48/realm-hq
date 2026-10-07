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

function getAuthToken(req: NextRequest): string | undefined {
  return (
    req.cookies.get("realm_auth_token")?.value ||
    env.API_TOKEN ||
    process.env.API_TOKEN
  );
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(`${getApiBaseUrl()}/v1/users`);
    const { searchParams } = req.nextUrl;

    const limit = searchParams.get("limit");
    if (limit) url.searchParams.set("limit", limit);

    const offset = searchParams.get("offset");
    if (offset) url.searchParams.set("offset", offset);

    const search = searchParams.get("search");
    if (search) url.searchParams.set("search", search);

    const provider = searchParams.get("provider");
    if (provider) url.searchParams.set("provider", provider);

    const token = getAuthToken(req);
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
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
          users: [],
          total: 0,
        },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      { error: message, users: [], total: 0 },
      { status: 500 },
    );
  }
}

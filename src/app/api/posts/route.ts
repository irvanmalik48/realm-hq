import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  tags: string[];
}

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
    const url = new URL(`${getApiBaseUrl()}/v1/posts`);
    const { searchParams } = req.nextUrl;

    const limit = searchParams.get("limit");
    if (limit) url.searchParams.set("limit", limit);

    const offset = searchParams.get("offset");
    if (offset) url.searchParams.set("offset", offset);

    const search = searchParams.get("search");
    if (search) url.searchParams.set("search", search);

    const tag = searchParams.get("tag");
    if (tag) url.searchParams.set("tag", tag);

    const isPublished = searchParams.get("is_published");
    if (isPublished !== null) url.searchParams.set("is_published", isPublished);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return NextResponse.json(
        {
          error: errorData?.error || errorData?.message || res.statusText,
          posts: [],
        },
        { status: res.status },
      );
    }

    const data = await res.json().catch(() => null);

    interface RawPost {
      id?: string;
      slug?: string;
      title?: string;
      description?: string;
      tags?: string[];
      reading_time?: string;
      is_published?: boolean;
      published_at?: string;
      created_at?: string;
      updated_at?: string;
      cover_image?: string;
    }

    const rawPosts: RawPost[] = Array.isArray(data?.posts) ? data.posts : [];
    const posts = rawPosts.map((p) => ({
      ...p,
      slug: p.slug || "",
      title: p.title || "",
      description: p.description || "",
      createdAt: p.created_at || "",
      updatedAt: p.updated_at || "",
      tags: p.tags || [],
    }));

    return NextResponse.json({
      posts,
      total: typeof data?.total === "number" ? data.total : posts.length,
    });
  } catch (error) {
    console.error("Failed to fetch posts from API:", error);
    return NextResponse.json({ posts: [], total: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: missing authentication token" },
        { status: 401 },
      );
    }

    const payload = await req.json();
    const res = await fetch(`${getApiBaseUrl()}/v1/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
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

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create post" },
      { status: 500 },
    );
  }
}

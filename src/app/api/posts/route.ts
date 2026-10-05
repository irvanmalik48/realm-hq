import { type NextRequest, NextResponse } from "next/server";
import { fetchPosts } from "@/lib/api/posts";

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  tags: string[];
}

export async function GET(_req: NextRequest) {
  try {
    const data = await fetchPosts({ limit: 200 });
    const posts: PostMeta[] = data.posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      tags: p.tags,
    }));
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Failed to fetch posts from API:", error);
    return NextResponse.json({ posts: [] }, { status: 500 });
  }
}

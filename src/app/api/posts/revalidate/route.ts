import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json().catch(() => ({}));
    const blogUrl =
      env.NEXT_PUBLIC_BLOG_URL ||
      process.env.NEXT_PUBLIC_BLOG_URL ||
      "http://localhost:3001";
    const secret =
      env.REVALIDATION_SECRET || process.env.REVALIDATION_SECRET || "";

    const url = new URL(`${blogUrl}/api/revalidate`);
    if (secret) {
      url.searchParams.set("secret", secret);
    }
    if (slug) {
      url.searchParams.set("slug", slug);
    }
    url.searchParams.set("tag", "posts");

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-revalidate-secret": secret } : {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({
      success: res.ok,
      status: res.status,
      data,
    });
  } catch (error) {
    console.error("Failed to forward revalidation to blog:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

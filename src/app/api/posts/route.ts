import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  tags: string[];
}

function getPostsDirectory(): string {
  if (process.env.POSTS_DIR && fs.existsSync(process.env.POSTS_DIR)) {
    return process.env.POSTS_DIR;
  }
  const relativePath = path.resolve(process.cwd(), "../realm-reference/posts");
  if (fs.existsSync(relativePath)) {
    return relativePath;
  }
  const absoluteFallback = "/home/lappland/Projects/realm-reference/posts";
  if (fs.existsSync(absoluteFallback)) {
    return absoluteFallback;
  }
  return "";
}

export async function GET() {
  try {
    const postsDir = getPostsDirectory();
    if (!postsDir) {
      return NextResponse.json({ posts: [] });
    }

    const files = fs
      .readdirSync(postsDir)
      .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"));

    const posts: PostMeta[] = files.map((file) => {
      const slug = file.replace(/\.mdx?$/, "");
      const fullPath = path.join(postsDir, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

      const meta: PostMeta = {
        slug,
        title: slug,
        description: "",
        createdAt: "",
        updatedAt: "",
        tags: [],
      };

      if (fmMatch) {
        const rawFm = fmMatch[1];
        const titleMatch = rawFm.match(/title:\s*["']?(.*?)["']?$/m);
        if (titleMatch) meta.title = titleMatch[1].trim();

        const descMatch = rawFm.match(/description:\s*["']?(.*?)["']?$/m);
        if (descMatch) meta.description = descMatch[1].trim();

        const createdMatch = rawFm.match(/createdAt:\s*["']?(.*?)["']?$/m);
        if (createdMatch) meta.createdAt = createdMatch[1].trim();

        const updatedMatch = rawFm.match(/updatedAt:\s*["']?(.*?)["']?$/m);
        if (updatedMatch) meta.updatedAt = updatedMatch[1].trim();

        const tags: string[] = [];
        const lines = rawFm.split("\n");
        let inTags = false;
        for (const line of lines) {
          if (line.trim().startsWith("tags:")) {
            inTags = true;
            continue;
          }
          if (inTags) {
            if (line.trim().startsWith("-")) {
              tags.push(
                line
                  .replace(/^\s*-\s*["']?/, "")
                  .replace(/["']?\s*$/, "")
                  .trim(),
              );
            } else if (line.includes(":") && !line.trim().startsWith("-")) {
              inTags = false;
            }
          }
        }
        meta.tags = tags;
      }

      return meta;
    });

    // Sort posts by createdAt desc
    posts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Failed to read posts from realm-reference:", error);
    return NextResponse.json({ posts: [] }, { status: 500 });
  }
}

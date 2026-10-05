export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  reading_time: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PostDetail extends PostSummary {
  content: string;
  cover_image?: string;
}

export interface CreatePostPayload {
  slug?: string;
  title: string;
  description?: string;
  content: string;
  tags?: string[];
  cover_image?: string;
  is_published?: boolean;
  published_at?: string;
}

export interface UpdatePostPayload {
  slug?: string;
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  cover_image?: string;
  is_published?: boolean;
  published_at?: string;
}

export interface PostsListResponse {
  posts: PostSummary[];
  total: number;
}

export interface FetchPostsParams {
  limit?: number;
  offset?: number;
  search?: string;
  tag?: string;
  is_published?: boolean;
}

const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
};

export async function fetchPosts(
  params: FetchPostsParams = {},
): Promise<PostsListResponse> {
  const url = new URL(`${getApiBaseUrl()}/v1/posts`);
  if (params.limit !== undefined)
    url.searchParams.set("limit", params.limit.toString());
  if (params.offset !== undefined)
    url.searchParams.set("offset", params.offset.toString());
  if (params.search) url.searchParams.set("search", params.search);
  if (params.tag) url.searchParams.set("tag", params.tag);
  if (params.is_published !== undefined) {
    url.searchParams.set(
      "is_published",
      params.is_published ? "true" : "false",
    );
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch posts: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    posts: data.posts || [],
    total: data.total || 0,
  };
}

export async function fetchPostBySlug(slug: string): Promise<PostDetail> {
  const res = await fetch(
    `${getApiBaseUrl()}/v1/posts/${encodeURIComponent(slug)}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch post "${slug}": ${res.statusText}`);
  }

  return res.json();
}

export async function createPost(
  payload: CreatePostPayload,
): Promise<PostDetail> {
  const res = await fetch(`${getApiBaseUrl()}/v1/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create post: ${errText || res.statusText}`);
  }

  const post: PostDetail = await res.json();
  triggerRevalidation(post.slug);
  return post;
}

export async function updatePost(
  slug: string,
  payload: UpdatePostPayload,
): Promise<PostDetail> {
  const res = await fetch(
    `${getApiBaseUrl()}/v1/posts/${encodeURIComponent(slug)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update post: ${errText || res.statusText}`);
  }

  const post: PostDetail = await res.json();
  triggerRevalidation(post.slug);
  return post;
}

export async function deletePost(slug: string): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/v1/posts/${encodeURIComponent(slug)}`,
    {
      method: "DELETE",
      headers: { Accept: "application/json" },
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to delete post: ${errText || res.statusText}`);
  }

  triggerRevalidation(slug);
}

export async function triggerRevalidation(slug?: string): Promise<void> {
  try {
    await fetch("/api/posts/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
  } catch (err) {
    console.warn("Revalidation webhook call failed:", err);
  }
}

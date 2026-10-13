export interface PasteSummary {
  id: string;
  slug: string;
  title: string;
  syntax: string;
  user_id?: string;
  is_public: boolean;
  is_encrypted: boolean;
  views: number;
  size: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PasteDetail extends PasteSummary {
  content: string;
}

export interface CreatePastePayload {
  title?: string;
  content: string;
  syntax?: string;
  password?: string;
  is_public?: boolean;
  ttl?: string;
  expires_at?: string;
}

export interface PastesListResponse {
  pastes: PasteSummary[];
  total: number;
}

export interface FetchPastesParams {
  limit?: number;
  offset?: number;
  search?: string;
  syntax?: string;
  public?: boolean;
}

const getPastesEndpoint = (slug?: string): string => {
  const isClient = typeof window !== "undefined";
  const base = isClient
    ? "/api/pastes"
    : `${process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/v1/pastes`;
  return slug ? `${base}/${encodeURIComponent(slug)}` : base;
};

export async function fetchPastes(
  params: FetchPastesParams = {},
): Promise<PastesListResponse> {
  const isClient = typeof window !== "undefined";
  const endpoint = getPastesEndpoint();
  const url = new URL(
    endpoint,
    isClient ? window.location.origin : "http://localhost:3000",
  );
  if (params.limit !== undefined)
    url.searchParams.set("limit", params.limit.toString());
  if (params.offset !== undefined)
    url.searchParams.set("offset", params.offset.toString());
  if (params.search) url.searchParams.set("search", params.search);
  if (params.syntax) url.searchParams.set("syntax", params.syntax);
  if (params.public !== undefined) {
    url.searchParams.set("public", params.public ? "true" : "false");
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch pastes: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    pastes: data.pastes || [],
    total: data.total || 0,
  };
}

export async function fetchPasteBySlug(
  slug: string,
  password?: string,
): Promise<PasteDetail> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (password) {
    headers["X-Paste-Password"] = password;
  }

  const res = await fetch(getPastesEndpoint(slug), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.error || `Failed to fetch paste "${slug}": ${res.statusText}`,
    );
  }

  return res.json();
}

export async function createPaste(
  payload: CreatePastePayload,
): Promise<PasteDetail> {
  const res = await fetch(getPastesEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create paste: ${errText || res.statusText}`);
  }

  return res.json();
}

export async function deletePaste(slug: string): Promise<void> {
  const res = await fetch(getPastesEndpoint(slug), {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to delete paste: ${errText || res.statusText}`);
  }
}

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = requireAuth(req);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const url = `${getApiBaseUrl()}/v1/users/${encodeURIComponent(id)}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${auth.token}`,
    };

    const res = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return NextResponse.json(
        {
          error:
            errorData?.error || errorData?.message || "Failed to delete user",
        },
        { status: res.status },
      );
    }

    const data = await res.json().catch(() => ({ status: "success" }));
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = requireAuth(req);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const url = `${getApiBaseUrl()}/v1/users/${encodeURIComponent(id)}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    };

    const res = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return NextResponse.json(
        {
          error:
            errorData?.error || errorData?.message || "Failed to update user",
        },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

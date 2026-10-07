import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("realm_auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: session token missing" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const apiBase =
      process.env.API_URL ||
      env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8080";

    const res = await fetch(`${apiBase}/v1/auth/2fa/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ error: "Failed to disable 2FA" }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const data = await res.json().catch(() => null);
    return NextResponse.json(data || {}, { status: res.status });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to disable 2FA";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

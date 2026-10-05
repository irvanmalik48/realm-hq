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

    const apiBase =
      env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8080";

    const res = await fetch(`${apiBase}/v1/auth/2fa/setup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to initiate 2FA setup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

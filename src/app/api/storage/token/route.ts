import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { requireAuth } from "@/lib/auth/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  const backendUrl =
    env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:8080"
      : "https://api.irvanma.eu.org");

  return NextResponse.json({
    token: auth.token,
    uploadUrl: `${backendUrl.replace(/\/+$/, "")}/v1/storage/upload`,
  });
}

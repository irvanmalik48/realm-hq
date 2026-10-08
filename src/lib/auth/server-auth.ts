import { type NextRequest, NextResponse } from "next/server";

export function getSessionToken(req: NextRequest): string | undefined {
  return req.cookies.get("realm_auth_token")?.value;
}

export type AuthResult =
  | { token: string; error?: never }
  | { token?: never; error: NextResponse };

export function requireAuth(req: NextRequest): AuthResult {
  const token = getSessionToken(req);
  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: authentication required" },
        { status: 401 },
      ),
    };
  }
  return { token };
}

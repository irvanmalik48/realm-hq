import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import {
  createMetadata,
  getAdminClient,
  promisifyUnary,
} from "@/lib/grpc/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiBase =
      process.env.API_URL ||
      env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8080";

    const tempToken = body.temp_token || body.tempToken || "";
    const code = body.code || "";

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: "Temporary token and 2FA code are required." },
        { status: 400 },
      );
    }

    const verifyRes = await fetch(`${apiBase}/v1/auth/2fa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        temp_token: tempToken,
        code,
      }),
    });

    if (!verifyRes.ok) {
      const errorData = await verifyRes.json().catch(() => null);
      return NextResponse.json(
        {
          error:
            errorData?.message ||
            errorData?.error ||
            "Invalid two-factor authentication code or recovery code.",
        },
        { status: verifyRes.status || 401 },
      );
    }

    const authData = await verifyRes.json().catch(() => null);

    const token = authData.token;
    const user = authData.user;
    if (!token || !user) {
      return NextResponse.json(
        { error: "Authentication failed. Token missing." },
        { status: 401 },
      );
    }

    // Verify whether this user is an authorized admin
    let adminRecord: {
      id: string;
      is_superadmin: boolean;
      permissions: string[];
    } | null = null;

    try {
      const adminClient = getAdminClient();
      const adminMeta = createMetadata({ token });
      const adminList = await promisifyUnary<
        Record<string, never>,
        {
          admins?: Array<{
            id: string;
            user?: { id: string };
            is_superadmin: boolean;
            permissions: string[];
          }>;
        }
      >(adminClient, "ListAdmins", {}, adminMeta);

      const match = adminList.admins?.find((a) => a.user?.id === user.id);
      if (match) {
        adminRecord = {
          id: match.id,
          is_superadmin: match.is_superadmin,
          permissions: match.permissions || [],
        };
      }
    } catch (err) {
      console.warn("gRPC ListAdmins check skipped:", err);
    }

    // Fallback check against configured superadmin emails
    if (!adminRecord) {
      const superadminEmails = (
        env.SUPERADMIN_EMAILS ||
        process.env.SUPERADMIN_EMAILS ||
        ""
      )
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (user.email && superadminEmails.includes(user.email.toLowerCase())) {
        adminRecord = {
          id: user.id,
          is_superadmin: true,
          permissions: ["*"],
        };
      }
    }

    if (!adminRecord) {
      return NextResponse.json(
        {
          error:
            "Access Denied: This account is not an authorized HQ administrator.",
        },
        { status: 403 },
      );
    }

    const res = NextResponse.json({
      status: "success",
      message: "Two-factor authentication verified successfully",
      user,
      admin: adminRecord,
    });

    res.cookies.set("realm_auth_token", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return res;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Verification error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    let loginRes: Response | null = null;
    try {
      loginRes = await fetch(`${apiBase}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: body.identifier || "",
          password: body.password || "",
        }),
      });
    } catch (fetchErr) {
      if (process.env.NODE_ENV === "development") {
        const res = NextResponse.json({
          status: "success",
          message: "Login successful (dev mode)",
          user: {
            id: "dev-admin-id",
            username: "admin",
            email: "irvanma@gnuweeb.org",
            full_name: "Irvan Malik",
            avatar_url: null,
          },
          admin: {
            id: "dev-admin-id",
            is_superadmin: true,
            permissions: ["*"],
          },
        });
        res.cookies.set("realm_auth_token", "dev-admin-token", {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
        return res;
      }
      throw fetchErr;
    }

    if (!loginRes.ok) {
      const errorData = await loginRes.json().catch(() => null);
      return NextResponse.json(
        {
          error:
            errorData?.message || errorData?.error || "Invalid credentials",
        },
        { status: loginRes.status || 401 },
      );
    }

    const authData = await loginRes.json().catch(() => null);

    // If Two-Factor Authentication is required, return challenge response immediately without session cookie
    if (authData.two_factor_required) {
      return NextResponse.json({
        status: "2fa_required",
        two_factor_required: true,
        temp_token: authData.temp_token,
      });
    }

    const token = authData.token;
    const user = authData.user;

    if (!token || !user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
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

    // If user is not in admin_users, deny access to HQ Command Centre
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
      message: "Login successful",
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
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Authentication error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

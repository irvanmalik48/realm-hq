import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import {
  createMetadata,
  getAdminClient,
  promisifyUnary,
} from "@/lib/grpc/client";

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get("realm_auth_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ user: null, admin: null });
    }

    const apiBase =
      env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8080";

    const meRes = await fetch(`${apiBase}/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!meRes.ok) {
      const res = NextResponse.json({ user: null, admin: null });
      res.cookies.set("realm_auth_token", "", {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    const data = await meRes.json();
    const user = data.user;

    if (!user) {
      return NextResponse.json({ user: null, admin: null });
    }

    // Check admin status
    let adminRecord: {
      id: string;
      is_superadmin: boolean;
      permissions: string[];
    } | null = null;

    try {
      const adminClient = getAdminClient();
      const metadata = createMetadata({ token });
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
      >(adminClient, "ListAdmins", {}, metadata);

      const match = adminList.admins?.find((a) => a.user?.id === user.id);
      if (match) {
        adminRecord = {
          id: match.id,
          is_superadmin: match.is_superadmin,
          permissions: match.permissions || [],
        };
      }
    } catch {
      const superadminEmails = (process.env.SUPERADMIN_EMAILS || "")
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

    return NextResponse.json({
      status: "success",
      user,
      admin: adminRecord,
    });
  } catch {
    return NextResponse.json({ user: null, admin: null });
  }
}

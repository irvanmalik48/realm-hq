import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import {
  getAuthClient,
  getAdminClient,
  promisifyUnary,
  createMetadata,
} from "@/lib/grpc/client";
import { formatGrpcError } from "@/lib/grpc/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authClient = getAuthClient();
    const metadata = createMetadata();

    const authData = await promisifyUnary<
      { identifier: string; password: string },
      { token?: string; user?: { id: string; email: string; username: string } }
    >(
      authClient,
      "Login",
      {
        identifier: body.identifier || "",
        password: body.password || "",
      },
      metadata,
    );

    const token = authData.token;
    const user = authData.user;

    if (!token || !user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Verify whether this user is an authorized admin
    const adminClient = getAdminClient();
    const adminMeta = createMetadata({ token });
    let adminRecord: {
      id: string;
      is_superadmin: boolean;
      permissions: string[];
    } | null = null;

    try {
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
    } catch {
      // If listing admins fails, adminRecord remains null
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
    const { message, status } = formatGrpcError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import {
  createMetadata,
  getAdminClient,
  getAuthClient,
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

    const authClient = getAuthClient();
    const metadata = createMetadata({ token });

    try {
      const data = await promisifyUnary<
        Record<string, never>,
        {
          user?: {
            id: string;
            email: string;
            username: string;
            full_name: string;
            avatar_url?: string;
          };
        }
      >(authClient, "GetProfile", {}, metadata);

      if (!data.user) {
        return NextResponse.json({ user: null, admin: null });
      }

      // Check admin status
      const adminClient = getAdminClient();
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
        >(adminClient, "ListAdmins", {}, metadata);

        const match = adminList.admins?.find(
          (a) => a.user?.id === data.user?.id,
        );
        if (match) {
          adminRecord = {
            id: match.id,
            is_superadmin: match.is_superadmin,
            permissions: match.permissions || [],
          };
        }
      } catch {
        // Ignored if unprivileged
      }

      return NextResponse.json({
        status: "success",
        user: data.user,
        admin: adminRecord,
      });
    } catch {
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
  } catch {
    return NextResponse.json({ user: null, admin: null });
  }
}

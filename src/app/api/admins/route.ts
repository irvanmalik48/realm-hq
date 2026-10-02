import { NextRequest, NextResponse } from "next/server";
import {
  getAdminClient,
  promisifyUnary,
  createMetadata,
} from "@/lib/grpc/client";
import { formatGrpcError } from "@/lib/grpc/errors";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("realm_auth_token")?.value;
    const client = getAdminClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(client, "ListAdmins", {}, metadata);
    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("realm_auth_token")?.value;
    const body = await req.json();

    const client = getAdminClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "AddAdmin",
      {
        email: body.email,
        permissions: body.permissions || [],
      },
      metadata,
    );

    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get("realm_auth_token")?.value;
    const body = await req.json();

    const client = getAdminClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "UpdateAdminPermissions",
      {
        admin_id: body.admin_id,
        permissions: body.permissions || [],
      },
      metadata,
    );

    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("realm_auth_token")?.value;
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("admin_id");

    if (!adminId) {
      return NextResponse.json(
        { error: "admin_id parameter is required" },
        { status: 400 },
      );
    }

    const client = getAdminClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "RemoveAdmin",
      { admin_id: adminId },
      metadata,
    );

    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

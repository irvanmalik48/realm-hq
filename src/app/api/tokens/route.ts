import { NextRequest, NextResponse } from "next/server";
import {
  getTokenClient,
  promisifyUnary,
  createMetadata,
} from "@/lib/grpc/client";
import { formatGrpcError } from "@/lib/grpc/errors";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("realm_auth_token")?.value;
    const client = getTokenClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(client, "ListTokens", {}, metadata);
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

    const client = getTokenClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "CreateToken",
      {
        name: body.name,
        scopes: body.scopes || ["*"],
        rate_limit_rpm: body.rate_limit_rpm || 60,
        expires_in_seconds: body.expires_in_seconds || undefined,
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id parameter is required" },
        { status: 400 },
      );
    }

    const client = getTokenClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(client, "RevokeToken", { id }, metadata);
    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

import { type NextRequest, NextResponse } from "next/server";
import {
  createMetadata,
  getCommentClient,
  promisifyUnary,
} from "@/lib/grpc/client";
import { formatGrpcError } from "@/lib/grpc/errors";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("realm_auth_token")?.value;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const postSlug = searchParams.get("post_slug") || "";

    const client = getCommentClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "ListAllComments",
      {
        limit,
        offset,
        search: search || undefined,
        post_slug: postSlug || undefined,
      },
      metadata,
    );

    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("realm_auth_token")?.value;
    const body = await req.json();

    const client = getCommentClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "AdminUpdateComment",
      {
        id: body.id,
        content: body.content,
        is_pinned: body.is_pinned,
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

    const client = getCommentClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "AdminDeleteComment",
      { id },
      metadata,
    );
    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

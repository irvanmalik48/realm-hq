import { type NextRequest, NextResponse } from "next/server";
import {
  createMetadata,
  getReactionClient,
  promisifyUnary,
} from "@/lib/grpc/client";
import { formatGrpcError } from "@/lib/grpc/errors";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("realm_auth_token")?.value;
    const client = getReactionClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "GetReactionsSummary",
      {},
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
    const postSlug = searchParams.get("post_slug");
    const reactionType = searchParams.get("reaction_type");

    if (!postSlug || !reactionType) {
      return NextResponse.json(
        { error: "post_slug and reaction_type are required" },
        { status: 400 },
      );
    }

    const client = getReactionClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "DeleteReaction",
      { post_slug: postSlug, reaction_type: reactionType },
      metadata,
    );

    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

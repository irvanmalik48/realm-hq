import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server-auth";
import {
  createMetadata,
  getReactionClient,
  promisifyUnary,
} from "@/lib/grpc/client";
import { formatGrpcError } from "@/lib/grpc/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) return auth.error;

    const client = getReactionClient();
    const metadata = createMetadata({ token: auth.token });

    const data = await promisifyUnary<
      { limit?: number; offset?: number },
      {
        summaries?: Array<{
          slug?: string;
          post_slug?: string;
          total_count?: number;
          totalCount?: number;
          reactions?:
            | Record<string, number>
            | Array<{ reaction_type: string; count: number }>;
        }>;
      }
    >(client, "GetReactionsSummary", {}, metadata);

    const rawSummaries = data?.summaries || [];
    let totalReactions = 0;

    const summaries = rawSummaries.map((item) => {
      const slug = item.slug || item.post_slug || "";
      const totalCount = Number(item.total_count ?? item.totalCount ?? 0);
      totalReactions += totalCount;

      let reactionDetails: Array<{ reaction_type: string; count: number }> = [];
      if (Array.isArray(item.reactions)) {
        reactionDetails = item.reactions;
      } else if (item.reactions && typeof item.reactions === "object") {
        reactionDetails = Object.entries(item.reactions)
          .map(([type, count]) => ({
            reaction_type: type,
            count: Number(count),
          }))
          .filter((r) => r.count > 0);
      }

      return {
        slug,
        post_slug: slug,
        total_count: totalCount,
        total_reactions: totalCount,
        reactions: reactionDetails,
      };
    });

    return NextResponse.json({
      summaries,
      total_reactions: totalReactions,
      total_count: totalReactions,
    });
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json(
      { error: message, summaries: [], total_reactions: 0 },
      { status },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const postSlug = searchParams.get("slug") || searchParams.get("post_slug");

    if (!postSlug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const client = getReactionClient();
    const metadata = createMetadata({ token: auth.token });

    const data = await promisifyUnary(
      client,
      "DeleteReaction",
      { slug: postSlug },
      metadata,
    );

    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

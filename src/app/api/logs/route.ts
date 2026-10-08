import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server-auth";
import {
  createMetadata,
  getLogClient,
  promisifyUnary,
} from "@/lib/grpc/client";
import { formatGrpcError } from "@/lib/grpc/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const level = searchParams.get("level") || "";
    const search = searchParams.get("search") || "";
    const traceId = searchParams.get("trace_id") || "";

    const client = getLogClient();
    const metadata = createMetadata({ token: auth.token });

    const data = await promisifyUnary(
      client,
      "GetLogs",
      {
        limit,
        offset,
        level: level || undefined,
        search: search || undefined,
        trace_id: traceId || undefined,
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
    const auth = requireAuth(req);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const clearAll = searchParams.get("clear_all") === "true";
    const logId = searchParams.get("log_id") || undefined;
    const beforeTimestamp = searchParams.get("before_timestamp") || undefined;

    const client = getLogClient();
    const metadata = createMetadata({ token: auth.token });

    const data = await promisifyUnary(
      client,
      "DeleteLogs",
      {
        clear_all: clearAll,
        log_id: logId,
        before_timestamp: beforeTimestamp,
      },
      metadata,
    );

    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

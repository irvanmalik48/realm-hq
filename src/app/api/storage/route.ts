import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server-auth";
import {
  createMetadata,
  getStorageClient,
  promisifyUnary,
} from "@/lib/grpc/client";
import { formatGrpcError } from "@/lib/grpc/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const client = getStorageClient();
    const metadata = createMetadata({ token: auth.token });

    if (searchParams.get("type") === "stats") {
      const stats = await promisifyUnary(
        client,
        "GetStorageStats",
        {},
        metadata,
      );
      return NextResponse.json(stats);
    }

    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const backend = searchParams.get("backend") || "";

    const data = await promisifyUnary(
      client,
      "ListFiles",
      {
        limit,
        offset,
        search: search || undefined,
        backend: backend || undefined,
      },
      metadata,
    );

    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) return auth.error;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const client = getStorageClient();
    const metadata = createMetadata({ token: auth.token });

    const data = await promisifyUnary(
      client,
      "UploadFile",
      {
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        data: buffer,
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id parameter is required" },
        { status: 400 },
      );
    }

    const client = getStorageClient();
    const metadata = createMetadata({ token: auth.token });

    const data = await promisifyUnary(client, "DeleteFile", { id }, metadata);
    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

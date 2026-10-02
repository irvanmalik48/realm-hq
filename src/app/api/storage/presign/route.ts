import { NextRequest, NextResponse } from "next/server";
import {
  getStorageClient,
  promisifyUnary,
  createMetadata,
} from "@/lib/grpc/client";
import { formatGrpcError } from "@/lib/grpc/errors";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("realm_auth_token")?.value;
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 },
      );
    }

    const client = getStorageClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "GeneratePresignedUrl",
      {
        id: body.id,
        expiry_seconds: body.expiry_seconds || 3600,
      },
      metadata,
    );

    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

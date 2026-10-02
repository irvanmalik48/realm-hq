import { type NextRequest, NextResponse } from "next/server";
import {
  createMetadata,
  getContactClient,
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

    const client = getContactClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "ListSubmissions",
      { limit, offset, search: search || undefined },
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

    const client = getContactClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "DeleteSubmission",
      { id },
      metadata,
    );
    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

import { type NextRequest, NextResponse } from "next/server";
import {
  createMetadata,
  getHealthClient,
  promisifyUnary,
} from "@/lib/grpc/client";
import { formatGrpcError } from "@/lib/grpc/errors";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("realm_auth_token")?.value;
    const client = getHealthClient();
    const metadata = createMetadata({ token });

    const data = await promisifyUnary(
      client,
      "GetDetailedTelemetry",
      {},
      metadata,
    );
    return NextResponse.json(data);
  } catch (err) {
    const { message, status } = formatGrpcError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

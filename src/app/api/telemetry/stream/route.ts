import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/server-auth";
import {
  createMetadata,
  getHealthClient,
  promisifyUnary,
} from "@/lib/grpc/client";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  const client = getHealthClient();
  const metadata = createMetadata({ token: auth.token });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const sendSnapshot = async () => {
        if (isClosed) return;
        try {
          const data = await promisifyUnary(
            client,
            "GetDetailedTelemetry",
            {},
            metadata,
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : "Error fetching telemetry";
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`,
            ),
          );
        }
      };

      await sendSnapshot();

      const intervalId = setInterval(sendSnapshot, 1000);

      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(intervalId);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

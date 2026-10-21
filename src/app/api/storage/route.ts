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

    const contentType = req.headers.get("content-type") || "";
    const lowerContentType = contentType.toLowerCase();

    if (
      lowerContentType.startsWith("application/json") ||
      lowerContentType.includes("json")
    ) {
      return NextResponse.json(
        {
          error:
            "Upload requests must be binary. JSON payloads are not allowed.",
        },
        { status: 400 },
      );
    }

    let filename = "upload.bin";
    let mimeType = contentType || "application/octet-stream";
    let buffer: Buffer;

    if (lowerContentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }

      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          {
            error: `File exceeds the 50 MB maximum upload limit (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
          },
          { status: 413 },
        );
      }

      filename = file.name || "upload.bin";
      mimeType = file.type || "application/octet-stream";
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else {
      const bytes = await req.arrayBuffer();
      if (!bytes || bytes.byteLength === 0) {
        return NextResponse.json(
          { error: "No file provided or request body is empty" },
          { status: 400 },
        );
      }

      if (bytes.byteLength > 50 * 1024 * 1024) {
        return NextResponse.json(
          {
            error: `File exceeds the 50 MB maximum upload limit (${(bytes.byteLength / (1024 * 1024)).toFixed(1)} MB)`,
          },
          { status: 413 },
        );
      }

      const { searchParams } = new URL(req.url);
      const disposition = req.headers.get("content-disposition");
      if (disposition) {
        const match = disposition.match(
          /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i,
        );
        if (match?.[1]) {
          filename = decodeURIComponent(match[1]);
        }
      }
      if (filename === "upload.bin") {
        const xFilename = req.headers.get("x-filename");
        if (xFilename) filename = xFilename;
      }
      if (filename === "upload.bin") {
        const queryFilename = searchParams.get("filename");
        if (queryFilename) filename = queryFilename;
      }

      buffer = Buffer.from(bytes);
    }

    const client = getStorageClient();
    const metadata = createMetadata({ token: auth.token });

    const data = await promisifyUnary(
      client,
      "UploadFile",
      {
        filename,
        content_type: mimeType,
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

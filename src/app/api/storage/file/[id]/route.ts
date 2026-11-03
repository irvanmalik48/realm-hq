import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    const download = searchParams.get("download");

    const backendUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:8080"
        : "https://api.irvanma.eu.org");

    const targetUrl = new URL(
      `${backendUrl.replace(/\/+$/, "")}/v1/storage/${id}`,
    );
    if (format) targetUrl.searchParams.set("format", format);
    if (download) targetUrl.searchParams.set("download", download);

    const upstreamHeaders: HeadersInit = {};
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch) upstreamHeaders["if-none-match"] = ifNoneMatch;
    const accept = req.headers.get("accept");
    if (accept) upstreamHeaders.accept = accept;

    const res = await fetch(targetUrl.toString(), {
      headers: upstreamHeaders,
      cache: "no-store",
    });

    if (res.status === 304) {
      return new NextResponse(null, { status: 304 });
    }

    if (!res.ok) {
      return new NextResponse(res.body, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("content-type") || "application/json",
        },
      });
    }

    const responseHeaders = new Headers();
    const headersToForward = [
      "content-type",
      "content-disposition",
      "cache-control",
      "etag",
      "x-content-type-options",
      "content-security-policy",
      "x-blurhash",
      "x-image-width",
      "x-image-height",
    ];

    for (const h of headersToForward) {
      const val = res.headers.get(h);
      if (val) responseHeaders.set(h, val);
    }

    return new NextResponse(res.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to fetch storage file",
      },
      { status: 500 },
    );
  }
}

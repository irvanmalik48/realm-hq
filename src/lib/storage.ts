/**
 * Storage File and URL Resolution Wrapper
 *
 * Provides environment-aware, CDN-aware, and S3-aware URL resolution for storage files,
 * eliminating hardcoded localhost URLs and enabling seamless fallback between direct S3/CDN,
 * public API endpoints, and same-origin proxy routes.
 */

export interface StorageFileTarget {
  id: string;
  url?: string;
  webp_url?: string;
  storage_backend?: string;
  s3_bucket?: string;
  s3_key?: string;
  s3_url?: string;
  filename?: string;
}

export interface StorageUrlOptions {
  /**
   * Request format: 'webp' or 'original'. Default is 'original'.
   */
  format?: "original" | "webp";
  /**
   * Whether this URL is intended for direct attachment download.
   */
  download?: boolean;
  /**
   * If true, prefers same-origin proxy route (`/api/storage/file/[id]`).
   */
  preferProxy?: boolean;
  /**
   * If true and file is stored on S3, prioritize direct S3 / CDN URL.
   * Default: true.
   */
  preferS3?: boolean;
}

/**
 * Resolves an API path (e.g. /v1/storage/...) with the proper public API URL
 */
function resolvePathWithApi(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // Check public API URL from env
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

  if (apiUrl) {
    return `${apiUrl}${cleanPath}`;
  }

  // If in browser runtime, detect origin or fallback safely
  if (typeof window !== "undefined") {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return `http://localhost:8080${cleanPath}`;
    }
    // In production without NEXT_PUBLIC_API_URL, route through same-origin proxy
    const idMatch = cleanPath.match(/\/v1\/storage\/([a-f0-9-]+)/i);
    if (idMatch?.[1]) {
      const search = cleanPath.includes("?")
        ? cleanPath.substring(cleanPath.indexOf("?"))
        : "";
      return `/api/storage/file/${idMatch[1]}${search}`;
    }
    return `${window.location.origin}${cleanPath}`;
  }

  // Server-side fallback: check server API_URL
  const serverApiUrl = process.env.API_URL?.trim().replace(/\/+$/, "");
  if (serverApiUrl) {
    return `${serverApiUrl}${cleanPath}`;
  }

  return cleanPath;
}

/**
 * Resolves a storage file target or string path to an environment-safe, production-ready URL.
 */
export function resolveStorageUrl(
  target: StorageFileTarget | string | null | undefined,
  options: StorageUrlOptions = {},
): string {
  if (!target) return "";

  // 1. If string is passed
  if (typeof target === "string") {
    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("blob:") ||
      target.startsWith("data:")
    ) {
      return target;
    }
    const cleanTarget = target.startsWith("/")
      ? target
      : `/v1/storage/${target}`;
    return resolvePathWithApi(cleanTarget);
  }

  const { id, url, webp_url, storage_backend, s3_url, s3_key } = target;
  const isS3 = storage_backend === "s3";
  const {
    format = "original",
    download = false,
    preferProxy = false,
    preferS3 = true,
  } = options;

  // 2. Direct S3 / CDN Resolution
  if (isS3 && preferS3 && !preferProxy) {
    if (s3_url) {
      return s3_url;
    }

    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL?.trim().replace(/\/+$/, "");
    if (cdnUrl) {
      const key = s3_key || `${id}.zst`;
      return `${cdnUrl}/${key}`;
    }
  }

  // 3. Same-origin proxy route resolution
  if (preferProxy) {
    const params = new URLSearchParams();
    if (format === "webp") params.set("format", "webp");
    if (download) params.set("download", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    return `/api/storage/file/${id}${query}`;
  }

  // 4. API Endpoint Resolution (either WebP or original)
  let basePath =
    format === "webp" && webp_url ? webp_url : url || `/v1/storage/${id}`;

  if (download || format === "webp") {
    const hasQuery = basePath.includes("?");
    const separator = hasQuery ? "&" : "?";
    const addedParams: string[] = [];

    if (
      format === "webp" &&
      !basePath.includes("format=webp") &&
      !basePath.includes("webp=true")
    ) {
      addedParams.push("format=webp");
    }
    if (download && !basePath.includes("download=true")) {
      addedParams.push("download=true");
    }

    if (addedParams.length > 0) {
      basePath += separator + addedParams.join("&");
    }
  }

  return resolvePathWithApi(basePath);
}

/**
 * Triggers browser download for a storage file using resolved URL
 */
export function downloadStorageFile(file: StorageFileTarget): void {
  const downloadUrl = resolveStorageUrl(file, { download: true });
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = file.filename || file.id;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Returns the public shareable URL for a file
 */
export function getPublicStorageUrl(file: StorageFileTarget): string {
  const url = resolveStorageUrl(file);
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;
  }
  return url;
}

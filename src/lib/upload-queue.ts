/**
 * Client-Side Upload Queue Manager
 *
 * Provides concurrent upload throttling, chunking/progress events via XMLHttpRequest,
 * retry capabilities, cancellation, and state notifications for dashboard UI.
 */

export type UploadItemStatus =
  | "queued"
  | "uploading"
  | "completed"
  | "error"
  | "cancelled";

export interface UploadQueueItem {
  id: string;
  file: File;
  status: UploadItemStatus;
  progress: number; // 0 - 100
  bytesUploaded: number;
  totalBytes: number;
  error?: string;
  savingsPercent?: number;
  xhr?: XMLHttpRequest;
  startedAt?: number;
}

type QueueListener = (items: UploadQueueItem[]) => void;
type UploadCompleteCallback = (item: UploadQueueItem) => void;

class UploadQueueManager {
  private items: UploadQueueItem[] = [];
  private concurrency = 2;
  private activeUploads = 0;
  private listeners: Set<QueueListener> = new Set();
  private onCompleteCallbacks: Set<UploadCompleteCallback> = new Set();

  /**
   * Subscribe to queue state updates
   */
  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener(this.getItems());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Register a callback triggered when an item finishes uploading
   */
  public onUploadComplete(cb: UploadCompleteCallback): () => void {
    this.onCompleteCallbacks.add(cb);
    return () => {
      this.onCompleteCallbacks.delete(cb);
    };
  }

  public getItems(): UploadQueueItem[] {
    return [...this.items];
  }

  /**
   * Enqueue multiple files for upload
   */
  public enqueue(files: File[]): void {
    const newItems: UploadQueueItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      status: "queued",
      progress: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
    }));

    this.items = [...this.items, ...newItems];
    this.notify();
    this.processNext();
  }

  /**
   * Cancel an in-flight or queued item
   */
  public cancel(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    if (item.status === "uploading" && item.xhr) {
      item.xhr.abort();
      this.activeUploads = Math.max(0, this.activeUploads - 1);
    }

    item.status = "cancelled";
    item.progress = 0;
    this.notify();
    this.processNext();
  }

  /**
   * Retry a failed or cancelled item
   */
  public retry(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    item.status = "queued";
    item.progress = 0;
    item.bytesUploaded = 0;
    item.error = undefined;
    this.notify();
    this.processNext();
  }

  /**
   * Remove completed and cancelled items
   */
  public clearFinished(): void {
    this.items = this.items.filter(
      (i) => i.status === "queued" || i.status === "uploading",
    );
    this.notify();
  }

  private notify(): void {
    const snapshot = this.getItems();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private processNext(): void {
    if (this.activeUploads >= this.concurrency) return;

    const nextItem = this.items.find((i) => i.status === "queued");
    if (!nextItem) return;

    this.activeUploads++;
    nextItem.status = "uploading";
    nextItem.startedAt = Date.now();
    this.notify();

    this.startUpload(nextItem);
  }

  private async startUpload(item: UploadQueueItem): Promise<void> {
    // 1. Resolve direct backend upload URL and session token
    let uploadUrl = "/api/storage";
    let token = "";

    try {
      const tokenRes = await fetch("/api/storage/token", { cache: "no-store" });
      if (tokenRes.ok) {
        const authData = await tokenRes.json();
        if (authData.uploadUrl) uploadUrl = authData.uploadUrl;
        if (authData.token) token = authData.token;
      }
    } catch {
      // Fallback to local /api/storage endpoint
    }

    const xhr = new XMLHttpRequest();
    item.xhr = xhr;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        item.bytesUploaded = e.loaded;
        item.totalBytes = e.total;
        item.progress = Math.min(100, Math.round((e.loaded / e.total) * 100));
        this.notify();
      }
    };

    xhr.onload = () => {
      this.activeUploads = Math.max(0, this.activeUploads - 1);
      if (xhr.status >= 200 && xhr.status < 300) {
        item.status = "completed";
        item.progress = 100;
        try {
          const resp = JSON.parse(xhr.responseText);
          item.savingsPercent = resp.file?.savings_percent || 0;
        } catch {
          // Response is valid 200 but non-json
        }
        for (const cb of this.onCompleteCallbacks) {
          cb(item);
        }
      } else {
        item.status = "error";
        try {
          const json = JSON.parse(xhr.responseText);
          item.error = json.error || json.message || `HTTP ${xhr.status}`;
        } catch {
          item.error = `Upload failed with status ${xhr.status}`;
        }
      }
      this.notify();
      this.processNext();
    };

    xhr.onerror = () => {
      this.activeUploads = Math.max(0, this.activeUploads - 1);
      item.status = "error";
      item.error = "Network connection failed";
      this.notify();
      this.processNext();
    };

    xhr.onabort = () => {
      item.status = "cancelled";
      this.notify();
    };

    const formData = new FormData();
    formData.append("file", item.file);

    xhr.open("POST", uploadUrl);
    xhr.withCredentials = true;
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.send(formData);
  }
}

export const uploadQueue = new UploadQueueManager();

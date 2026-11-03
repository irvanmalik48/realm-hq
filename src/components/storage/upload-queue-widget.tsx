"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileIcon,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { type UploadQueueItem, uploadQueue } from "@/lib/upload-queue";
import { formatBytes } from "@/lib/utils";

export function UploadQueueWidget() {
  const [items, setItems] = React.useState<UploadQueueItem[]>([]);
  const [isMinimized, setIsMinimized] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = uploadQueue.subscribe((updatedItems) => {
      setItems(updatedItems);
    });
    return unsubscribe;
  }, []);

  if (items.length === 0) {
    return null;
  }

  const activeCount = items.filter(
    (i) => i.status === "uploading" || i.status === "queued",
  ).length;
  const completedCount = items.filter((i) => i.status === "completed").length;
  const errorCount = items.filter((i) => i.status === "error").length;

  const totalBytes = items.reduce((acc, curr) => acc + curr.totalBytes, 0);
  const uploadedBytes = items.reduce(
    (acc, curr) =>
      acc +
      (curr.status === "completed" ? curr.totalBytes : curr.bytesUploaded),
    0,
  );
  const overallProgress =
    totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-88 sm:w-96 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl transition-[box-shadow,background-color] duration-300 overflow-hidden text-card-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2 truncate">
          {activeCount > 0 ? (
            <div className="relative flex items-center justify-center h-6 w-6 rounded-md bg-primary/10 text-primary shrink-0">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </div>
          ) : errorCount > 0 ? (
            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-destructive/10 text-destructive shrink-0">
              <AlertCircle className="h-3.5 w-3.5" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-emerald-500/10 text-emerald-500 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          )}
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold truncate">
              {activeCount > 0
                ? `Uploading (${completedCount}/${items.length})`
                : `Uploads complete (${completedCount}/${items.length})`}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {formatBytes(uploadedBytes)} of {formatBytes(totalBytes)} (
              {overallProgress}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {items.some(
            (i) => i.status === "completed" || i.status === "cancelled",
          ) && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => uploadQueue.clearFinished()}
              title="Clear finished"
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <span className="text-[10px] font-medium px-1">Clear</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setIsMinimized((prev) => !prev)}
            title={isMinimized ? "Expand" : "Minimize"}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {isMinimized ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>

          {activeCount === 0 && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => uploadQueue.clearFinished()}
              title="Dismiss"
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Minimized Progress Bar */}
      {isMinimized && activeCount > 0 && (
        <Progress value={overallProgress} className="h-1 rounded-none" />
      )}

      {/* Expanded File List */}
      {!isMinimized && (
        <div className="max-h-72 overflow-y-auto divide-y divide-border/40 p-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-2.5 flex items-center gap-3 text-xs hover:bg-muted/30 rounded-lg transition-colors"
            >
              <div className="p-2 rounded-md bg-muted/60 text-muted-foreground shrink-0">
                <FileIcon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="font-medium text-foreground truncate"
                    title={item.file.name}
                  >
                    {item.file.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {formatBytes(item.file.size)}
                  </span>
                </div>

                {item.status === "uploading" && (
                  <div className="space-y-1">
                    <Progress value={item.progress} className="h-1" />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Compressing & uploading</span>
                      <span>{item.progress}%</span>
                    </div>
                  </div>
                )}

                {item.status === "queued" && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                    <Clock className="h-3 w-3" />
                    <span>In queue</span>
                  </div>
                )}

                {item.status === "completed" && (
                  <div className="flex items-center justify-between text-[10px] text-emerald-500 font-medium">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Completed</span>
                    </span>
                    {typeof item.savingsPercent === "number" &&
                      item.savingsPercent > 0 && (
                        <span className="font-mono text-muted-foreground">
                          {item.savingsPercent.toFixed(1)}% saved
                        </span>
                      )}
                  </div>
                )}

                {item.status === "error" && (
                  <div className="flex items-center justify-between text-[10px] text-destructive">
                    <span className="truncate" title={item.error}>
                      {item.error || "Upload failed"}
                    </span>
                    <button
                      type="button"
                      onClick={() => uploadQueue.retry(item.id)}
                      className="inline-flex items-center gap-0.5 text-primary hover:underline font-medium shrink-0 cursor-pointer ml-1"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Retry
                    </button>
                  </div>
                )}

                {item.status === "cancelled" && (
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Cancelled</span>
                    <button
                      type="button"
                      onClick={() => uploadQueue.retry(item.id)}
                      className="inline-flex items-center gap-0.5 text-primary hover:underline font-medium shrink-0 cursor-pointer ml-1"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {(item.status === "uploading" || item.status === "queued") && (
                <button
                  type="button"
                  onClick={() => uploadQueue.cancel(item.id)}
                  title="Cancel upload"
                  className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted shrink-0 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

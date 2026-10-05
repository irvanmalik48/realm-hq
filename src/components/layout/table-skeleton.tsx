import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
  title?: string;
  description?: string;
  rowCount?: number;
  columnCount?: number;
}

const SKELETON_COLS = [
  "col-preview-1",
  "col-preview-2",
  "col-preview-3",
  "col-preview-4",
  "col-preview-5",
  "col-preview-6",
  "col-preview-7",
  "col-preview-8",
];

const SKELETON_ROWS = [
  "row-preview-1",
  "row-preview-2",
  "row-preview-3",
  "row-preview-4",
  "row-preview-5",
  "row-preview-6",
  "row-preview-7",
  "row-preview-8",
  "row-preview-9",
  "row-preview-10",
  "row-preview-11",
  "row-preview-12",
];

export function TableSkeleton({
  title,
  description,
  rowCount = 6,
  columnCount = 5,
}: TableSkeletonProps) {
  const activeCols = SKELETON_COLS.slice(0, columnCount);
  const activeRows = SKELETON_ROWS.slice(0, rowCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {title ? (
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
          ) : (
            <Skeleton className="h-8 w-48 mb-1" />
          )}
          {description ? (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          ) : (
            <Skeleton className="h-4 w-72" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3 border-b border-border bg-card/40 space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Skeleton className="h-9 w-full sm:w-72 rounded-md" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {activeCols.map((colKey) => (
                  <TableHead key={colKey}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeRows.map((rowKey) => (
                <TableRow key={rowKey}>
                  {activeCols.map((colKey, colIndex) => (
                    <TableCell key={`${rowKey}-${colKey}`}>
                      <Skeleton
                        className={`h-4 ${
                          colIndex === 0
                            ? "w-24"
                            : colIndex === 1
                              ? "w-36"
                              : colIndex === columnCount - 1
                                ? "w-12 ml-auto"
                                : "w-28"
                        }`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/40">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-18 rounded-md" />
            <Skeleton className="h-8 w-18 rounded-md" />
          </div>
        </div>
      </Card>
    </div>
  );
}

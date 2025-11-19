"use client";
import { trpc } from "@/trpc/client";
import { useDeferredValue, useState } from "react";
import { FileText, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { WorkflowFileResponse } from "@/modules/workflow-files/server/schema";

export const WorkFlowFiles = ({ id }: { id: string }) => {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading,
    isError 
  } = trpc.workflowFiles.getMany.useInfiniteQuery(
    { workflowId: id, limit: 6, search: deferredSearch || undefined },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    },
  );

  const files: WorkflowFileResponse[] =
    data?.pages.flatMap((page) => page.files) ?? [];

  if (isError) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load workflow files. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 mt-4">      

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
            <h2 className="text-lg font-bold tracking-md">Workflow files</h2>
            <p className="text-xs text-muted-foreground mt-1">
                Manage and download workflow file versions
            </p>
        </div>
        <Input
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:w-64"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="px-2 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-md shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <FileText className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              {search ? "No files match your search" : "No workflow files found"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((file) => (
              <Card
                key={file.id}
                className="hover:shadow-md transition-all relative cursor-pointer"
              >
                <CardContent className="px-3 py-1">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">
                      <div className="h-9 w-9 rounded-md flex items-center justify-center bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate" title={file.displayName ?? ""}>
                        {file.displayName || file.s3Key.split("/").pop() || "Workflow File"}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        Version {file.version}
                      </p>
                    </div>
                  </div>
                  {file.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {file.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="outline"
                size="sm"
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
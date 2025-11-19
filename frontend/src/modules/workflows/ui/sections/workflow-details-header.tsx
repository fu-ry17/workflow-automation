"use client";
import { trpc } from "@/trpc/client";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { AlertCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadWorkFlow } from "../../hooks/use-upload-workflow";

export const WorkflowDetailsHeader = ({ id }: { id: string }) => {
  return (
    <Suspense fallback={<WorkflowHeaderSkeleton />}>
      <ErrorBoundary fallbackRender={WorkflowHeaderError}>
        <WorkFlowDetailsHeaderSection id={id} />
      </ErrorBoundary>
    </Suspense>
  );
};

const WorkFlowDetailsHeaderSection = ({ id }: { id: string }) => {
  const [data] = trpc.workflow.get.useSuspenseQuery({ id });
  const { open } = useUploadWorkFlow();

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{data.title}</h1>
            </div>

            <p className="text-muted-foreground text-xs">
              {data?.description ? data.description : "No Description provided"}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={open}>
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </Button>
        </div>
      </div>
    </>
  );
};

const WorkflowHeaderSkeleton = () => {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <div className="h-9 bg-muted rounded w-64"></div>
            <div className="h-5 bg-muted rounded w-16"></div>
          </div>
          <div className="h-5 bg-muted rounded w-full"></div>
          <div className="h-5 bg-muted rounded w-3/4"></div>
        </div>
        <div className="h-9 bg-muted rounded w-36"></div>
      </div>
    </div>
  );
};

const WorkflowHeaderError = ({ resetErrorBoundary }: any) => {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10">
      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium">Failed to load workflow</p>
        <Button
          variant="link"
          size="sm"
          onClick={resetErrorBoundary}
          className="h-auto p-0 text-sm"
        >
          Try again
        </Button>
      </div>
    </div>
  );
};

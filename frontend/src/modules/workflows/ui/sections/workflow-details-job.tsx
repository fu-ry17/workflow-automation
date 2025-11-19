"use client";

import { useState, useDeferredValue, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Search, 
  Loader2, 
  MoreHorizontal, 
  Timer, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play, 
  PlayCircle,
  Trash2,
  CheckSquare
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateJob } from "@/modules/jobs/hooks/use-create-job";
import { trpc } from "@/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const WorkflowDetailsJob = ({ id }: { id: string }) => {
  const { open } = useCreateJob();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center w-full">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Workflow Jobs</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor processing tasks and service unit generations
          </p>
        </div>
        <Button onClick={open} size="sm" className="px-4">
          <PlayCircle className="w-4 h-4 mr-2" />
          Create Job
        </Button>
      </div>

      <WorkFlowJobs id={id} />
    </div>
  );
};

const WorkFlowJobs = ({ id }: { id: string }) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  const deferredSearch = useDeferredValue(search);
  const limit = 10;
  
  const utils = trpc.useUtils();

  const { data, isLoading, isError, isPlaceholderData } = trpc.job.getMany.useQuery({
    workflowId: id,
    page,
    limit,
    search: deferredSearch,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Mutation to re-trigger job
  const { mutate: triggerJob } = trpc.job.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Job queued for processing");
      utils.job.getMany.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to trigger job: ${err.message}`);
    }
  });

  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const handleTrigger = (jobId: string) => {
    setTriggeringId(jobId);
    triggerJob(
      { id: jobId, status: "queued" },
      { onSettled: () => setTriggeringId(null) }
    );
  };

  // --- Selection Logic ---
  const isAllSelected = useMemo(() => {
    if (!data?.jobs?.length) return false;
    return data.jobs.every((job) => selectedRows.includes(job.id));
  }, [data?.jobs, selectedRows]);

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.jobs) {
      setSelectedRows(data.jobs.map((j) => j.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (checked: boolean, jobId: string) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, jobId]);
    } else {
      setSelectedRows((prev) => prev.filter((id) => id !== jobId));
    }
  };

  function getDuration(start?: string | null, end?: string | null): string {
    if (!start) return "-";
    const endDate = end ? new Date(end) : new Date();
    const startDate = new Date(start);
    const diff = (endDate.getTime() - startDate.getTime()) / 1000;
    
    if (diff < 60) return `${Math.floor(diff)}s`;
    const mins = Math.floor(diff / 60);
    const secs = Math.floor(diff % 60);
    return `${mins}m ${secs}s`;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "successful":
        return <Badge variant="default" className="bg-green-500/15 text-white hover:bg-green-500/25 border-green-200 shadow-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Successful</Badge>;
      case "failed":
        return <Badge variant="destructive" className="bg-red-500/15 text-white hover:bg-red-500/25 border-red-200 shadow-none"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case "processing":
        return <Badge variant="secondary" className="bg-blue-500/15 text-white  hover:bg-blue-500/25 border-blue-200 shadow-none animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      default: // queued
        return <Badge variant="outline" className="text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Queued</Badge>;
    }
  };

  if (isError) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <XCircle className="h-10 w-10 text-destructive mb-4" />
          <p className="font-semibold text-destructive">Error loading jobs</p>
          <p className="text-sm text-muted-foreground">Please try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Search jobs..."
            disabled={true}
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
            }}
            />
        </div>

        {/* Bulk Actions Header - Shows when items are selected */}
        {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-200">
                <span className="text-sm text-muted-foreground mr-2">
                    {selectedRows.length} selected
                </span>
                <Button size="sm" variant="outline" className="h-9">
                    <Play className="w-3.5 h-3.5 mr-2" /> Run
                </Button>
                <Button size="sm" variant="outline" className="h-9 text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </Button>
            </div>
        )}
      </div>

      <div className="rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {/* Checkbox Header */}
              <TableHead className="w-[40px] px-4">
                <Checkbox 
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-[150px]">Job Type</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Date Created</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-4"><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-32 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No jobs found</p>
                    <p className="text-xs mt-1">Try adjusting your search or create a new job.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.jobs.map((job) => {
                const isSelected = selectedRows.includes(job.id);
                return (
                    <TableRow 
                        key={job.id} 
                        className={`group transition-colors ${isSelected ? "bg-muted/50" : "hover:bg-muted/30"}`}
                    >
                    {/* Checkbox Row */}
                    <TableCell className="px-4">
                        <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectRow(!!checked, job.id)}
                            aria-label={`Select job ${job.id}`}
                        />
                    </TableCell>
                    <TableCell className="font-medium">
                        <div className="flex flex-col">
                        <span className="capitalize">{job.jobType.replace("_", " ")}</span>
                        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">
                            {job.id.split("-")[0]}...
                        </span>
                        </div>
                    </TableCell>
                    <TableCell>
                        {getStatusBadge(job.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                        {job.started_at ? format(new Date(job.started_at), "HH:mm:ss") : "-"}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {getDuration(job.started_at, job.completed_at)}
                        </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center justify-end gap-2" title={job.created_at}>
                        <Calendar className="w-3 h-3" />
                        {format(new Date(job.created_at), "MMM d, yyyy")}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                        
                        {/* Primary Trigger Action Visible on Row */}
                        <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    disabled={triggeringId === job.id || job.status === "processing"}
                                    onClick={() => handleTrigger(job.id)}
                                >
                                    {triggeringId === job.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Play className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Trigger Job</p>
                            </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/jobs/${job.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                    // Implement delete handler
                                }}
                            >
                                Delete Job
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                    </TableCell>
                    </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {data.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => (data.totalPages > p ? p + 1 : p))}
              disabled={page >= data.totalPages || isLoading || isPlaceholderData}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
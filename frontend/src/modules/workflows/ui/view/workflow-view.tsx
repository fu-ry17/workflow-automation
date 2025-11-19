"use client";

import { useState, useDeferredValue, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  Search, 
  Calendar, 
  MoreHorizontal, 
  CheckCircle2, 
  CircleDashed, 
  Loader2,
  CheckSquare,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/trpc/client";
import { WorkflowHeader } from "../sections/workflow-header";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "completed") {
    return (
      <Badge variant="default" className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-200 shadow-none px-2.5">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Completed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground px-2.5">
      <CircleDashed className="w-3.5 h-3.5 mr-1.5" /> Pending
    </Badge>
  );
};

const WorkflowSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-10 w-[100px]" />
    </div>
    <div className="border rounded-md bg-card">
        <div className="p-4 border-b space-y-4">
             {[1, 2, 3, 4, 5].map((i) => (
                 <div key={i} className="flex items-center justify-between gap-4">
                    <Skeleton className="h-4 w-4" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                    </div>
                    <Skeleton className="h-6 w-[100px]" />
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                 </div>
             ))}
        </div>
    </div>
  </div>
);

// --- Main Component ---

export const WorkFlowView = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  // 1. Fetch Data
  const { data, isLoading, isError } = trpc.workflow.getMany.useQuery({
    search: deferredSearch,
    page,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc"
  });

  // 2. Mutation for "Mark as Completed"
  // Note: You need to add this procedure to your backend (see snippet below)
  const updateStatus = trpc.workflow.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Workflows updated successfully");
      utils.workflow.getMany.invalidate();
      setSelectedIds(new Set()); // Clear selection
    },
    onError: (err) => {
      toast.error("Failed to update workflows");
    }
  });

  // --- Selection Logic ---
  const allIds = useMemo(() => data?.workflows.map(w => w.id) || [], [data?.workflows]);
  const isAllSelected = allIds.length > 0 && selectedIds.size === allIds.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(allIds));
    else setSelectedIds(new Set());
  };

  const handleSelectOne = (checked: boolean, id: string) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleBulkComplete = () => {
    if (selectedIds.size === 0) return;
    updateStatus.mutate({
        ids: Array.from(selectedIds),
        status: "completed"
    });
  };

  return (
    <div className="space-y-6">
      <WorkflowHeader />

      {/* Filters & Bulk Actions Area */}
      <div className="flex items-center justify-between gap-4 min-h-[40px]">
        {selectedIds.size > 0 ? (
            // Bulk Actions Toolbar
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-5 duration-200 bg-primary/5 px-4 py-2 rounded-md border border-primary/10 w-full">
                <span className="text-sm font-medium text-primary">
                    {selectedIds.size} selected
                </span>
                <div className="h-4 w-px bg-primary/20 mx-2" />
                <Button 
                    size="sm" 
                    className="h-8 bg-white text-primary border-primary/20 hover:bg-primary/10 hover:text-primary shadow-sm"
                    variant="outline"
                    onClick={handleBulkComplete}
                    disabled={updateStatus.isPending}
                >
                    {updateStatus.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-2" />}
                    Mark as Completed
                </Button>
            </div>
        ) : (
            // Search Bar
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search workflows..."
                    className="pl-9 bg-card"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
            </div>
        )}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <WorkflowSkeleton />
      ) : isError ? (
        <div className="py-20 text-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
            <p>Failed to load workflows</p>
            <Button variant="link" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : (
        <div className="rounded-md border bg-card shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-[40px] px-4">
                            <Checkbox 
                                checked={isAllSelected}
                                onCheckedChange={handleSelectAll}
                            />
                        </TableHead>
                        <TableHead className="w-[40%]">Workflow</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Created</TableHead>
                        <TableHead className="text-right w-[80px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data?.workflows.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={5} className="h-48 text-center">
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                    <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-3">
                                        <CheckSquare className="h-6 w-6 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium">No workflows found</p>
                                    <p className="text-xs mt-1 max-w-xs">
                                        Get started by creating a new workflow to automate your processes.
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        data?.workflows.map((workflow) => {
                            const isSelected = selectedIds.has(workflow.id);
                            return (
                                <TableRow 
                                    key={workflow.id} 
                                    className={`group cursor-pointer transition-colors ${isSelected ? "bg-muted/50" : "hover:bg-muted/30"}`}
                                    onClick={(e) => {
                                        // Navigate only if not clicking checkbox or actions
                                        if ((e.target as HTMLElement).closest('[role="checkbox"], button')) return;
                                        router.push(`/workflows/${workflow.id}`);
                                    }}
                                >
                                    <TableCell className="px-4 relative z-10">
                                        <Checkbox 
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleSelectOne(!!checked, workflow.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm group-hover:text-primary transition-colors">
                                                {workflow.title}
                                            </span>
                                            {workflow.description && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                    {workflow.description}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={workflow.status} />
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {format(new Date(workflow.created_at), "MMM d, yyyy")}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right relative z-10">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <Link href={`/workflows/${workflow.id}`}>
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </Button>
                                            
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/workflows/${workflow.id}`}>View Details</Link>
                                                    </DropdownMenuItem>
                                                    {/* Add single item complete action if needed */}
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateStatus.mutate({ ids: [workflow.id], status: "completed" });
                                                    }}>
                                                        Mark as Completed
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
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
             <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <div className="text-xs text-muted-foreground mx-2">
                Page {page} of {data.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => (data.totalPages > p ? p + 1 : p))}
              disabled={page >= data.totalPages || isLoading}
            >
              Next
            </Button>
        </div>
      )}
    </div>
  );
};
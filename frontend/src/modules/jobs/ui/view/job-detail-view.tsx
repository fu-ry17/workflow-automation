"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Loader2,
  Timer,
  XCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/trpc/client";

// --- Helpers ---

const getStatusBadge = (status: string) => {
  switch (status) {
    case "successful":
      return (
        <Badge variant="default" className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-200 shadow-none px-3 py-1">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Successful
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-200 shadow-none px-3 py-1">
          <XCircle className="w-3.5 h-3.5 mr-1.5" /> Failed
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 border-blue-200 shadow-none animate-pulse px-3 py-1">
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processing
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground px-3 py-1">
          <Clock className="w-3.5 h-3.5 mr-1.5" /> Queued
        </Badge>
      );
  }
};

const getDuration = (start?: string | null, end?: string | null) => {
  if (!start) return "-";
  const endDate = end ? new Date(end) : new Date();
  const startDate = new Date(start);
  const diff = (endDate.getTime() - startDate.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  const mins = Math.floor(diff / 60);
  const secs = Math.floor(diff % 60);
  return `${mins}m ${secs}s`;
};

const getFileIcon = (filename: string) => {
  if (filename.endsWith(".csv")) return <FileText className="w-4 h-4 text-orange-500" />;
  if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  return <FileJson className="w-4 h-4 text-blue-500" />;
};

// --- Skeleton Component ---

const JobDetailsSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                             <div key={i} className="space-y-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-4 w-24" />
                             </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="border-b"><Skeleton className="h-5 w-40" /></CardHeader>
                <div className="p-4 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between">
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>
            </Card>
        </div>
        <div className="space-y-6">
            <Card>
                 <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
                 <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                 </CardContent>
            </Card>
        </div>
    </div>
  </div>
);

// --- Main Component ---

export const JobDetailsView = ({ id }: { id: string }) => {
  const { data, isLoading, isError } = trpc.job.get.useQuery({ id });
  
  // Mutation to get secure links
  const getDownloadUrls = trpc.job.getDownloadUrls.useMutation();
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Payload Collapsible State (Default closed)
  const [isPayloadOpen, setIsPayloadOpen] = useState(false);

  // -- Logic for Selection --
  const allFileIds = useMemo(() => data?.files?.map(f => f.id) || [], [data?.files]);
  const isAllSelected = allFileIds.length > 0 && selectedFiles.size === allFileIds.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(allFileIds));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleSelectOne = (checked: boolean, fileId: string) => {
    const newSet = new Set(selectedFiles);
    if (checked) newSet.add(fileId);
    else newSet.delete(fileId);
    setSelectedFiles(newSet);
  };

  // -- Logic for Downloading --
  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async (keys: string[], filenames: string[]) => {
    if (keys.length === 0) return;
    setIsDownloading(true);
    try {
        const result = await getDownloadUrls.mutateAsync({ keys });
        
        result.forEach((item, index) => {
            setTimeout(() => {
                triggerDownload(item.url, filenames[index] || "download");
            }, index * 500);
        });
        
        if (keys.length > 1) toast.success(`Downloading ${keys.length} files...`);
    } catch (error) {
        toast.error("Failed to generate download links");
    } finally {
        setIsDownloading(false);
    }
  };

  if (isLoading) return <JobDetailsSkeleton />;
  if (isError || !data) return <div className="text-center py-10 text-destructive">Failed to load job details.</div>;

  // Parse payload
  let parsedPayload = null;
  try {
    parsedPayload = data.payload ? JSON.parse(data.payload) : null;
    if (typeof parsedPayload === "string") parsedPayload = JSON.parse(parsedPayload);
  } catch (e) {
    parsedPayload = data.payload;
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
            <Link href={`/workflows/${data.workflowId}`}>
                <ArrowLeft className="h-4 w-4" />
            </Link>
        </Button>
        <div className="flex-1">
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                Job Details
                <span className="text-muted-foreground font-normal text-sm">/ {data.id.split('-')[0]}...</span>
            </h2>
        </div>
        <div className="flex gap-2">
            {getStatusBadge(data.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Key Metrics */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Execution Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" /> Created At
                            </p>
                            <p className="text-sm font-medium">{format(new Date(data.created_at), "MMM d, HH:mm")}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Started At
                            </p>
                            <p className="text-sm font-medium">
                                {data.started_at ? format(new Date(data.started_at), "HH:mm:ss") : "-"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completed At
                            </p>
                            <p className="text-sm font-medium">
                                {data.completed_at ? format(new Date(data.completed_at), "HH:mm:ss") : "-"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Timer className="w-3.5 h-3.5" /> Duration
                            </p>
                            <p className="text-sm font-medium font-mono">
                                {getDuration(data.started_at, data.completed_at)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Output Files */}
            <Card className="border-primary/10 shadow-md">
                <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-base flex items-center gap-2">
                                <HardDrive className="w-4 h-4 text-primary" /> Generated Files
                            </CardTitle>
                            <CardDescription>
                                {data.files?.length || 0} files created during this process
                            </CardDescription>
                        </div>
                        
                        {/* Bulk Actions */}
                        {selectedFiles.size > 0 && (
                             <Button 
                                size="sm" 
                                variant="default" 
                                disabled={isDownloading}
                                onClick={() => {
                                    // Find files that match selected IDs
                                    const filesToDownload = (data.files || []).filter((f: any) => selectedFiles.has(f.id));
                                    const keys = filesToDownload.map((f: any) => f.s3Key);
                                    const names = filesToDownload.map((f: any) => f.name);
                                    handleDownload(keys, names);
                                }}
                             >
                                {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Download className="w-3.5 h-3.5 mr-2" />}
                                Download ({selectedFiles.size})
                             </Button>
                        )}
                    </div>
                </CardHeader>
                <div className="p-0">
                    {!data.files || data.files.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <p className="text-sm">No files generated yet.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/5 hover:bg-muted/5">
                                    {/* Checkbox Header */}
                                    <TableHead className="w-[40px] px-4">
                                        <Checkbox 
                                            checked={isAllSelected}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Filename</TableHead>
                                    <TableHead className="text-right">Created</TableHead>
                                    <TableHead className="w-[100px] text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.files.map((file: any) => {
                                    const isSelected = selectedFiles.has(file.id);
                                    return (
                                        <TableRow 
                                            key={file.id} 
                                            className={`group transition-colors ${isSelected ? "bg-muted/50" : ""}`}
                                        >
                                            <TableCell className="px-4">
                                                <Checkbox 
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => handleSelectOne(!!checked, file.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="py-3 text-center">
                                                {getFileIcon(file.name)}
                                            </TableCell>
                                            <TableCell className="py-3 font-medium text-sm">
                                                <div className="flex flex-col">
                                                    <span className="truncate max-w-[300px]" title={file.name}>
                                                        {file.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {file.id}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 text-right text-xs text-muted-foreground">
                                                {format(new Date(file.createdAt), "HH:mm:ss")}
                                            </TableCell>
                                            <TableCell className="py-3 text-right">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8" 
                                                    onClick={() => handleDownload([file.s3Key], [file.name])}
                                                    disabled={isDownloading}
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
            {/* Technical Details */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Technical Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">S3 Key / Folder</div>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
                            <code className="text-xs flex-1 truncate" title={data.s3_key || ""}>{data.s3_key || "N/A"}</code>
                            {data.s3_key && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(data.s3_key!, "S3 Key")}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div>
                         <div className="text-xs font-medium text-muted-foreground mb-1">Job Type</div>
                         <div className="font-mono text-sm capitalize">{data.jobType.replace('_', ' ')}</div>
                    </div>
                </CardContent>
            </Card>

            {/* Input Payload (Collapsible) */}
            <Collapsible open={isPayloadOpen} onOpenChange={setIsPayloadOpen}>
                <Card className="overflow-hidden flex flex-col">
                    <CollapsibleTrigger asChild>
                        <CardHeader className="pb-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <FileJson className="w-4 h-4" /> Input Payload
                                </CardTitle>
                                {isPayloadOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </div>
                        </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                        <Separator />
                        <div className="overflow-auto bg-slate-950 p-4 max-h-[500px]">
                            <pre className="text-xs text-slate-50 font-mono leading-relaxed">
                                {JSON.stringify(parsedPayload, null, 2)}
                            </pre>
                        </div>
                    </CollapsibleContent>
                </Card>
            </Collapsible>
        </div>

      </div>
    </div>
  );
};
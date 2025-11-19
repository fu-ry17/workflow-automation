import { z } from "zod";

export const workflowSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  note: z.string().optional(),
});

export const getWorkflowSchema = z.object({
  id: z.string().uuid(),
});

export const getWorkflowFilesSchema = z.object({
  id: z.string().uuid(),
});

export const getManyWorkflowsSchema = z.object({
  search: z.string().optional(),
  sortBy: z.enum(["title", "createdAt", "updatedAt", "status"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

export type WorkflowFormValues = z.infer<typeof workflowSchema>;
export type GetManyWorkflowsInput = z.infer<typeof getManyWorkflowsSchema>;

export type WorkflowResponse = {
  id: string;
  title: string;
  description: string;
  status: string;
  notes: { note?: string | null } | null;
  created_at: string;
  updated_at: string;
};

export type getWorkflowResponse = WorkflowResponse;

export type GetManyWorkflowsResponse = {
  workflows: WorkflowResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const workflowUploadSchema = z.object({
  file: z
    .array(z.custom<File>())
    .min(1, "Please upload a file")
    .max(1, "Only one file allowed")
    .refine((files) => files[0]?.size <= 2 * 1024 * 1024, {
      message: "File size must be less than 2MB",
    }),
  version: z.string().min(1, "Version is required"),
});

export type WorkflowUploadFormValues = z.infer<typeof workflowUploadSchema>;

export const workflowUploadApiSchema = z.object({
  fileData: z.string(), // base64
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  version: z.string().min(1, "Version is required"),
  workflowId: z.string().uuid(),
});

export interface WorkflowFile {
  id: string;
  workflow_id: string;
  file_id: string;
  file_name: string;
  file_mime: string;
  size_bytes: number;
  version: number;
  tags: Record<string, string | null>;
  created_at: string;
}

export const updateWorkflowStatusSchema = z.object({
  ids: z.array(z.string().uuid()), 
  status: z.enum(["pending", "completed"]), 
});
import { z } from "zod";

// All operations are scoped to a workflowId for security

export const workflowFilesGetManySchema = z.object({
  workflowId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).optional(),
  search: z.string().optional(),
});

export const workflowFileGetSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
});

export const workflowFileDeleteSchema = workflowFileGetSchema;

export const workflowFileUpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    workflowId: z.string().uuid(),
    s3Key: z.string().optional(),
    fileData: z.string().optional(), // base64 encoded string
    fileName: z.string().optional(),
    contentType: z.string().optional(),
    version: z.number().int().min(1).optional(),
    description: z.string().optional().nullable(),
    displayName: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.id) {
        // Creating: require file data and version
        return !!data.fileData && data.version !== undefined;
      }
      return true;
    },
    {
      message: "fileData and version are required when creating a workflow file",
      path: ["fileData"],
    },
  );

export type WorkflowFileResponse = {
  id: string;
  workflowId: string;
  userId: string;
  s3Key: string;
  description: string | null;
  displayName: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowFileListResponse = {
  files: WorkflowFileResponse[];
  nextCursor: string | null;
  hasMore: boolean;
};



import { Files } from "@/generated/prisma/client";
import { z } from "zod";

export const jobSchema = z.object({
  workflowId: z.string().uuid("Invalid workflow ID"),
  jobType: z.string(),
  s3_key: z.string().optional(),
  payload: z.string().optional(),
});

export const getJobSchema = z.object({
  id: z.string().uuid(),
});

export const updateJobStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["queued", "processing", "successful", "failed"]),
});

export const getManyJobsSchema = z.object({
  search: z.string().optional(),
  workflowId: z.string().uuid().optional(),
  jobType: z.enum(["users", "service_units"]).optional(),
  status: z.enum(["queued", "processing", "successful", "failed"]).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "status", "jobType"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

export type JobFormValues = z.infer<typeof jobSchema>;
export type GetManyJobsInput = z.infer<typeof getManyJobsSchema>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;

export type JobResponse = {
  id: string;
  workflowId: string;
  userId: string;
  s3_key: string | null;
  payload: string | null;
  jobType: "users" | "service_units";
  status: "queued" | "processing" | "successful" | "failed";
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  files: Files[] | []
};

export type GetManyJobsResponse = {
  jobs: JobResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import {
  getManyJobsSchema,
  getJobSchema,
  updateJobStatusSchema,
  GetManyJobsResponse,
  JobResponse,
  jobSchema,
} from "./schema";

import { TRPCError } from "@trpc/server";
import { inngest } from "@/inngest/client";
import { generateDownloadUrl, uploadFile } from "@/lib/aws";
import z from "zod";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import path from "path";

const formatJob = (job: any): JobResponse => ({
  id: job.id,
  workflowId: job.workflowId,
  userId: job.userId,
  s3_key: job.s3_key,
  payload: job.payload
    ? typeof job.payload === "object"
      ? JSON.stringify(job.payload)
      : String(job.payload)
    : null,
  jobType: job.jobType,
  status: job.status,
  created_at: job.createdAt.toISOString(),
  updated_at: job.updatedAt.toISOString(),
  started_at: job.startedAt?.toISOString() || null,
  completed_at: job.completedAt?.toISOString() || null,
  files: job.files,
});

export const jobProcedure = createTRPCRouter({
  getMany: protectedProcedure
    .input(getManyJobsSchema)
    .query(async ({ input, ctx }) => {
      try {
        const {
          search,
          workflowId,
          jobType,
          status,
          sortBy,
          sortOrder,
          page,
          limit,
        } = input;
        const skip = (page - 1) * limit;

        const where: any = {
          userId: ctx.userId,
        };

        if (workflowId) where.workflowId = workflowId;
        if (jobType) where.jobType = jobType;
        if (status) where.status = status;

        if (search && search.trim()) {
          where.OR = [
            { s3_key: { contains: search, mode: "insensitive" } },
            { jobType: { contains: search, mode: "insensitive" } },
            { status: { contains: search, mode: "insensitive" } },
          ];
        }

        const orderBy: any = {};
        orderBy[sortBy] = sortOrder;

        const [total, jobs] = await prisma.$transaction([
          prisma.processingJob.count({ where }),
          prisma.processingJob.findMany({
            where,
            orderBy,
            skip,
            take: limit,
          }),
        ]);

        return {
          jobs: jobs.map(formatJob),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        } as GetManyJobsResponse;
      } catch (error) {
        console.error("Get jobs error:", error);
        throw new TRPCError({
          message: "Failed to get jobs",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  create: protectedProcedure
    .input(jobSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      try {
        // 1. Check Workflow
        const workflow = await prisma.workflow.findFirst({
          where: { id: input.workflowId, userId: ctx.userId },
        });

        if (!workflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        let job = await prisma.processingJob.create({
          data: {
            workflowId: input.workflowId,
            userId: ctx.userId,
            // @ts-ignore
            jobType: input.jobType,
            s3_key: null,
            payload: input.payload || null,
            status: "queued",
          },
        });

        if (input.s3_key) {
          try {
            const fileBuffer = Buffer.from(input.s3_key, "base64");

            let extension = ".bin";
            let contentType = "application/octet-stream";
            let action = null;

            // Try to extract metadata from the JSON payload
            if (input.payload) {
              try {
                const parsed = JSON.parse(input.payload);
                action = parsed.action;

                // This will now work because you updated the Frontend
                if (parsed.fileName) {
                  const ext = path.extname(parsed.fileName).toLowerCase();
                  if (ext) extension = ext;
                }
              } catch (e) {
                console.error("Error parsing payload JSON:", e);
              }
            }

            // Map extension to Content-Type
            const mimeTypes: Record<string, string> = {
              ".xlsx":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              ".xls": "application/vnd.ms-excel",
              ".csv": "text/csv",
              ".pdf": "application/pdf",
            };

            if (mimeTypes[extension]) {
              contentType = mimeTypes[extension];
            }

            const uniqueFolder = randomUUID();
            const uniqueFile = `original`;
            const s3Path = `${uniqueFolder}/${uniqueFile}${extension}`;
            const finalFileName = `${uniqueFile}${extension}`;

            // Upload to S3
            await uploadFile(fileBuffer, s3Path, contentType);

            // Create the final payload for the worker
            const updatedPayload = {
              file_name: finalFileName,
              action: action,
            };

            // 4. Update Job
            job = await prisma.processingJob.update({
              where: { id: job.id },
              data: {
                s3_key: s3Path,
                payload: JSON.stringify(updatedPayload),
              },
            });
          } catch (uploadError) {
            // Clean up if upload fails
            await prisma.processingJob.update({
              where: { id: job.id },
              data: { status: "failed" },
            });
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "File upload failed",
            });
          }
        }

        return formatJob(job);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create job",
        });
      }
    }),

  get: protectedProcedure.input(getJobSchema).query(async ({ input, ctx }) => {
    try {
      const job = await prisma.processingJob.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          files: true,
        },
      });

      if (!job) {
        throw new TRPCError({ message: "Job not found", code: "NOT_FOUND" });
      }

      return formatJob(job);
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Get job error:", error);
      throw new TRPCError({
        message: "Failed to get job",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  }),

  updateStatus: protectedProcedure
    .input(updateJobStatusSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const job = await prisma.processingJob.findFirst({
          where: {
            id: input.id,
            userId: ctx.userId,
          },
        });

        if (!job) {
          throw new TRPCError({ message: "Job not found", code: "NOT_FOUND" });
        }

        await inngest.send({
          name: "process-workflow-events",
          data: { jobId: job.id, userId: job.userId },
        });

        return { msg: "Job scheduled for processing" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Update job status error:", error);
        throw new TRPCError({
          message: "Failed to update status",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  delete: protectedProcedure
    .input(getJobSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const job = await prisma.processingJob.findFirst({
          where: {
            id: input.id,
            userId: ctx.userId,
          },
        });

        if (!job) {
          throw new TRPCError({ message: "Job not found", code: "NOT_FOUND" });
        }

        await prisma.processingJob.delete({
          where: { id: input.id },
        });

        return { success: true, message: "Job deleted successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Delete job error:", error);
        throw new TRPCError({
          message: "Failed to delete job",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  getDownloadUrls: protectedProcedure
    .input(z.object({ keys: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      try {
        const urls = await Promise.all(
          input.keys.map(async (key) => ({
            key,
            url: await generateDownloadUrl(key),
          })),
        );
        return urls;
      } catch (error) {
        console.error("Failed to generate signed URLs", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate download links",
        });
      }
    }),
});

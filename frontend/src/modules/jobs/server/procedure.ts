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
import { generateDownloadUrl } from "@/lib/aws";
import z from "zod";
import { prisma } from "@/lib/prisma";

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
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });
      }

      try {
        const workflow = await prisma.workflow.findFirst({
          where: {
            id: input.workflowId,
            userId: ctx.userId,
          },
        });

        if (!workflow) {
          throw new TRPCError({
            message: "Workflow not found",
            code: "NOT_FOUND",
          });
        }

        const job = await prisma.processingJob.create({
          data: {
            workflowId: input.workflowId,
            userId: ctx.userId,
            // @ts-ignore
            jobType: input.jobType,
            s3_key: input.s3_key || null,
            payload: input.payload || null,
            status: "queued",
          },
        });

        return formatJob(job);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Create job error:", error);
        throw new TRPCError({
          message: "Failed to create job",
          code: "INTERNAL_SERVER_ERROR",
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

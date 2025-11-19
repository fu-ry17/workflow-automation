import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import {
  getManyWorkflowsSchema,
  getWorkflowSchema,
  GetManyWorkflowsResponse,
  WorkflowResponse,
  workflowSchema,
  updateWorkflowStatusSchema,
} from "./schema";

import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export const workFlowProcedure = createTRPCRouter({
  getMany: protectedProcedure
    .input(getManyWorkflowsSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { search, sortBy, sortOrder, page, limit } = input;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
          userId: ctx.userId,
        };

        // Add search functionality
        if (search && search.trim()) {
          where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { status: { contains: search, mode: "insensitive" } },
          ];
        }

        // Build orderBy clause
        const orderBy: any = {};
        if (sortBy === "title") {
          orderBy.title = sortOrder;
        } else if (sortBy === "status") {
          orderBy.status = sortOrder;
        } else if (sortBy === "updatedAt") {
          orderBy.updatedAt = sortOrder;
        } else {
          orderBy.createdAt = sortOrder;
        }

        // Get total count for pagination
        const total = await prisma.workflow.count({ where });

        // Get workflows with pagination
        const workflows = await prisma.workflow.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        });

        const totalPages = Math.ceil(total / limit);

        return {
          workflows: workflows.map((workflow) => ({
            id: workflow.id,
            title: workflow.title,
            description: workflow.description || "",
            status: workflow.status,
            notes: workflow.notes as { note?: string | null } | null,
            created_at: workflow.createdAt.toISOString(),
            updated_at: workflow.updatedAt.toISOString(),
          })) as WorkflowResponse[],
          total,
          page,
          limit,
          totalPages,
        } as GetManyWorkflowsResponse;
      } catch (error) {
        console.error("Get workflows error:", error);
        throw new TRPCError({
          message: "Failed to get workflows",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  createUpdateWorkflow: protectedProcedure
    .input(workflowSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });
      }
      try {
        const workflow = await prisma.workflow.create({
          data: {
            title: input.title,
            description: input.description || null,
            status: "pending",
            notes: input.note
              ? {
                  note: input.note,
                }
              : undefined,
            userId: ctx.userId,
          },
        });

        return {
          id: workflow.id,
          title: workflow.title,
          description: workflow.description || "",
          status: workflow.status,
          notes: workflow.notes as { note?: string | null } | null,
          created_at: workflow.createdAt.toISOString(),
          updated_at: workflow.updatedAt.toISOString(),
        } as WorkflowResponse;
      } catch (error) {
        console.error("Create workflow error:", error);
        throw new TRPCError({
          message: "Failed to create workflow",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  get: protectedProcedure
    .input(getWorkflowSchema)
    .query(async ({ input, ctx }) => {
      try {
        const workflow = await prisma.workflow.findFirst({
          where: {
            id: input.id,
            userId: ctx.userId,
          },
        });

        if (!workflow) {
          throw new TRPCError({
            message: "Workflow not found",
            code: "NOT_FOUND",
          });
        }

        return {
          id: workflow.id,
          title: workflow.title,
          description: workflow.description || "",
          status: workflow.status,
          notes: workflow.notes as { note?: string | null } | null,
          created_at: workflow.createdAt.toISOString(),
          updated_at: workflow.updatedAt.toISOString(),
        } as WorkflowResponse;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Get workflow error:", error);
        throw new TRPCError({
          message: "Failed to get workflow",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  updateStatus: protectedProcedure
    .input(updateWorkflowStatusSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Update multiple workflows at once
        await prisma.workflow.updateMany({
          where: {
            id: { in: input.ids },
            userId: ctx.userId, // Ensure user owns these workflows
          },
          data: {
            status: input.status,
          },
        });

        return { success: true };
      } catch (error) {
        console.error("Update workflow status error:", error);
        throw new TRPCError({
          message: "Failed to update workflow status",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
});

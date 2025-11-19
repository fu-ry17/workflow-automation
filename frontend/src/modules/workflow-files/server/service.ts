import prisma from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { deleteFile, uploadFile } from "@/lib/aws";
import {
  type WorkflowFileListResponse,
  type WorkflowFileResponse,
} from "./schema";
import { randomUUID } from "crypto";

const MAX_LIMIT = 50;

type BaseParams = {
  userId?: string;
  workflowId: string;
};

type GetManyParams = BaseParams & {
  cursor?: string;
  limit?: number;
  search?: string;
};

type GetParams = BaseParams & {
  id: string;
};

type UpsertParams = BaseParams & {
  id?: string;
  fileData?: string;
  fileName?: string;
  contentType?: string;
  s3Key?: string;
  version?: number;
  description?: string | null;
  displayName?: string | null;
};

type DeleteParams = GetParams;

function requireUserId(userId?: string): string {
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not authenticated",
    });
  }
  return userId;
}

async function assertWorkflowAccess(userId: string, workflowId: string) {
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      userId,
    },
    select: { id: true },
  });

  if (!workflow) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this workflow",
    });
  }
}

function mapFile(file: {
  id: string;
  workflowId: string;
  userId: string;
  s3_key: string;
  description: string | null;
  displayName: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowFileResponse {
  return {
    id: file.id,
    workflowId: file.workflowId,
    userId: file.userId,
    s3Key: file.s3_key,
    description: file.description ?? null,
    displayName: file.displayName ?? null,
    version: file.version,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

async function uploadFromBase64(input: {
  workflowId: string;
  fileData: string;
  fileName?: string;
  contentType?: string;
  s3Key?: string;
}): Promise<string> {
  const base64String = input.fileData.includes(",")
    ? (input.fileData.split(",").pop() ?? "")
    : input.fileData;

  if (!base64String) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid file data provided",
    });
  }

  const buffer = Buffer.from(base64String, "base64");
  const key =
    input.s3Key ??
    `${input.workflowId}/${randomUUID()}-${input.fileName ?? "file"}`;

  await uploadFile(
    buffer,
    key,
    input.contentType ?? "application/octet-stream",
  );
  return key;
}

export const workflowFileService = {
  async getMany(params: GetManyParams): Promise<WorkflowFileListResponse> {
    const userId = requireUserId(params.userId);
    await assertWorkflowAccess(userId, params.workflowId);

    const limit = Math.min(params.limit ?? 20, MAX_LIMIT);
    const take = limit + 1;

    const where: Record<string, any> = {
      workflowId: params.workflowId,
      userId,
    };

    if (params.search?.trim()) {
      where.OR = [
        { displayName: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        { s3_key: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const files = await prisma.workflowFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      ...(params.cursor
        ? {
            cursor: { id: params.cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = files.length > limit;
    const trimmed = hasMore ? files.slice(0, limit) : files;
    const nextCursor = hasMore
      ? (trimmed[trimmed.length - 1]?.id ?? null)
      : null;

    return {
      files: trimmed.map(mapFile),
      nextCursor,
      hasMore,
    };
  },

  async get(params: GetParams): Promise<WorkflowFileResponse> {
    const userId = requireUserId(params.userId);
    await assertWorkflowAccess(userId, params.workflowId);

    const file = await prisma.workflowFile.findFirst({
      where: {
        id: params.id,
        workflowId: params.workflowId,
        userId,
      },
    });

    if (!file) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Workflow file not found",
      });
    }

    return mapFile(file);
  },

  async upsert(params: UpsertParams): Promise<WorkflowFileResponse> {
    const userId = requireUserId(params.userId);
    await assertWorkflowAccess(userId, params.workflowId);

    if (!params.id) {
      if (!params.fileData || params.version === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "fileData and version are required when creating a workflow file",
        });
      }

      const s3Key = await uploadFromBase64({
        workflowId: params.workflowId,
        fileData: params.fileData,
        fileName: params.fileName,
        contentType: params.contentType,
        s3Key: params.s3Key,
      });

      const created = await prisma.workflowFile.create({
        data: {
          workflowId: params.workflowId,
          userId,
          s3_key: s3Key,
          description: params.description ?? null,
          displayName: params.displayName ?? params.fileName ?? null,
          version: params.version,
        },
      });

      return mapFile(created);
    }

    const existing = await prisma.workflowFile.findFirst({
      where: {
        id: params.id,
        workflowId: params.workflowId,
        userId,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Workflow file not found",
      });
    }

    let newS3Key = existing.s3_key;

    if (params.fileData) {
      const uploadedKey = await uploadFromBase64({
        workflowId: params.workflowId,
        fileData: params.fileData,
        fileName: params.fileName,
        contentType: params.contentType,
        s3Key: params.s3Key,
      });

      try {
        if (existing.s3_key) {
          await deleteFile(existing.s3_key);
        }
      } catch (err) {
        console.error("Failed to delete old workflow file from S3", err);
        throw new TRPCError({
          message: "Failed to delete old workflow file from S3",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      newS3Key = uploadedKey;
    }

    const updated = await prisma.workflowFile.update({
      where: { id: existing.id },
      data: {
        s3_key: newS3Key,
        description:
          params.description !== undefined
            ? params.description
            : existing.description,
        displayName:
          params.displayName !== undefined
            ? params.displayName
            : existing.displayName,
        version: params.version ?? existing.version,
      },
    });

    return mapFile(updated);
  },

  async delete(params: DeleteParams): Promise<{ success: boolean }> {
    const userId = requireUserId(params.userId);
    await assertWorkflowAccess(userId, params.workflowId);

    const existing = await prisma.workflowFile.findFirst({
      where: {
        id: params.id,
        workflowId: params.workflowId,
        userId,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Workflow file not found",
      });
    }

    try {
      if (existing.s3_key) {
        await deleteFile(existing.s3_key);
      }
    } catch (err) {
      console.error("Failed to delete workflow file from S3", err);
      throw new TRPCError({
        message: "Failed to delete old workflow file from S3",
        code: "INTERNAL_SERVER_ERROR",
      });
    }

    await prisma.workflowFile.delete({
      where: { id: existing.id },
    });

    return { success: true };
  },
};

export default workflowFileService;

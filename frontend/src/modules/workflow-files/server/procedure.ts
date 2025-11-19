import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import {
  workflowFilesGetManySchema,
  workflowFileGetSchema,
  workflowFileDeleteSchema,
  workflowFileUpsertSchema,
} from "./schema";
import { workflowFileService } from "./service";

export const workflowFilesProcedure = createTRPCRouter({
  getMany: protectedProcedure
    .input(workflowFilesGetManySchema)
    .query(async ({ input, ctx }) => {
      return workflowFileService.getMany({
        ...input,
        userId: ctx.userId,
      });
    }),

  get: protectedProcedure.input(workflowFileGetSchema).query(async ({ input, ctx }) => {
    return workflowFileService.get({
      ...input,
      userId: ctx.userId,
    });
  }),

  upsert: protectedProcedure
    .input(workflowFileUpsertSchema)
    .mutation(async ({ input, ctx }) => {
      return workflowFileService.upsert({
        ...input,
        userId: ctx.userId,
      });
    }),

  delete: protectedProcedure
    .input(workflowFileDeleteSchema)
    .mutation(async ({ input, ctx }) => {
      return workflowFileService.delete({
        ...input,
        userId: ctx.userId,
      });
    }),
});



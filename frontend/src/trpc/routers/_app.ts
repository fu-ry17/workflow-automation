import { createTRPCRouter } from "../init";
import { workFlowProcedure } from "@/modules/workflows/server/procedure";
import { workflowFilesProcedure } from "@/modules/workflow-files/server/procedure";
import { jobProcedure } from "@/modules/jobs/server/procedure";

export const appRouter = createTRPCRouter({
  job: jobProcedure,
  workflow: workFlowProcedure,
  workflowFiles: workflowFilesProcedure,
});

export type AppRouter = typeof appRouter;
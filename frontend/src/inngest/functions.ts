import { inngest } from "./client";
import { listFiles } from "@/lib/aws";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const processWorkFlow = inngest.createFunction(
  {
    id: "process-workflow",
    retries: 1,
    concurrency: {
      limit: 1,
      key: "event.data.userId",
    },
  },
  { event: "process-workflow-events" },
  async ({ event, step }) => {
    const { jobId } = event.data;

    try {
      // 1. Get initial job details
      const job = await step.run("get-job-details", async () => {
        return await prisma.processingJob.findUniqueOrThrow({
          where: { id: jobId },
          select: {
            id: true,
            jobType: true,
            payload: true,
            userId: true,
            workflowId: true,
            s3_key: true,
          },
        });
      });

      // 2. Generate or Retrieve the Key (and capture the result!)
      const s3Key = await step.run("generate-s3-key", async () => {
        // Check if key is missing (covers null, undefined, or "")
        if (!job.s3_key) {
          const newKey = `${job.id}/${randomUUID()}`;

          await prisma.processingJob.update({
            where: { id: job.id },
            data: { s3_key: newKey },
          });

          return newKey; // Return the new key
        }

        return job.s3_key; // Return the existing key
      });

      // 3. Set status to processing
      await step.run("update-job-status-processing", async () => {
        await prisma.processingJob.update({
          where: { id: jobId },
          data: {
            status: "processing",
            startedAt: new Date(),
          },
        });
      });

      // 4. Call Endpoint using the current 's3Key' variable, NOT 'job.s3_key'
      await step.fetch(process.env.PROCESS_WORKFLOW_ENDPOINT!, {
        method: "POST",
        body: JSON.stringify({
          payload: job.payload,
          workflow_type: job.jobType,
          folder_id: s3Key, // <--- USE s3Key HERE
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PROCESS_WORKFLOW_AUTH!}`,
        },
      });

      // 5. Save files using the current 's3Key' variable
      const { filesFound } = await step.run(
        "save-resulting-files",
        async () => {
          if (!s3Key) {
            // <--- USE s3Key HERE
            throw new Error("No S3 key provided for folder lookup");
          }

          const allKeys = await listFiles(s3Key); // <--- USE s3Key HERE

          const resultKeys = allKeys.filter((key) => key && key !== "");

          if (resultKeys.length > 0) {
            await prisma.files.createMany({
              data: resultKeys.map((key) => ({
                s3Key: key,
                name: key.split("/").pop() || "unknown-file",
                url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
                workflowId: job.workflowId,
                userId: job.userId,
                processingJobId: jobId,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
            });
          }

          return { filesFound: resultKeys.length };
        },
      );

      // 6. Mark successful
      await step.run("update-job-status-successful", async () => {
        await prisma.processingJob.update({
          where: { id: jobId },
          data: {
            status: "successful",
            completedAt: new Date(),
          },
        });
      });
    } catch (error) {
      await step.run("handle-failure", async () => {
        console.error(`Job ${jobId} failed:`, error);

        await prisma.processingJob.update({
          where: { id: jobId },
          data: {
            status: "failed",
            completedAt: new Date(),
          },
        });
      });

      throw error;
    }
  },
);

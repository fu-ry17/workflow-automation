import { HydrateClient, trpc } from "@/trpc/server";
import { WorkflowDetailsView } from "@/modules/workflows/ui/view/workflow-details-view";
import { CreateJobModal } from "@/modules/jobs/ui/components/create-job-modal";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { id } = await params;
  void trpc.workflow.get.prefetch({ id });
  // void trpc.workflowFiles.getMany.prefetch({ workflowId: id, limit: 9, search: "" });
  // void trpc.job.getWorkFlowJobs.prefetch({ id });

  return (
    <>
      <HydrateClient>
        <CreateJobModal id={id} />
        <WorkflowDetailsView id={id} />
      </HydrateClient>
    </>
  );
};

export default Page;

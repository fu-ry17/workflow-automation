import { WorkFlowView } from "@/modules/workflows/ui/view/workflow-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

const Page = () => {
  void trpc.workflow.getMany.prefetch({});

  return (
    <HydrateClient>
      <WorkFlowView />
    </HydrateClient>
  );
};

export default Page;

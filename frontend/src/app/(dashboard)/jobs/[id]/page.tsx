import { JobDetailsView } from "@/modules/jobs/ui/view/job-detail-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { id } = await params;
  void trpc.job.get.prefetch({ id });

  return (
    <>
      <HydrateClient>
        <JobDetailsView id={id} />
      </HydrateClient>
    </>
  );
};

export default Page;

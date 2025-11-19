// import { CreateJobModal } from "@/modules/jobs/ui/components/create-job-modal";
import { UploadWorkflowModal } from "../components/upload-workflow-modal";
import { WorkflowDetailsHeader } from "../sections/workflow-details-header";
import { WorkFlowFiles } from "../sections/workflow-files";
import { Separator } from "@/components/ui/separator";
import { WorkflowDetailsJob } from "../sections/workflow-details-job";

export const WorkflowDetailsView = ({ id }: { id: string }) => {
  return (
    <>
      <UploadWorkflowModal id={id} />
      {/* <CreateJobModal id={id} /> */}

      <div className="space-y-6">
        <WorkflowDetailsHeader id={id} />

        <Separator />

        <div className="space-y-4">
          <WorkFlowFiles id={id} />
        </div>

        <Separator />

        <div className="space-y-4">
          <WorkflowDetailsJob id={id} />
        </div>
      </div>
    </>
  );
};

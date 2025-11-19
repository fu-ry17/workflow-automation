"use client";
import { ResponsiveModal } from "@/components/responsive-modal";
import { useUploadWorkFlow } from "../../hooks/use-upload-workflow";
import { WorkflowUploadForm } from "./workflow-files-form";

export const UploadWorkflowModal = ({ id }: { id: string }) => {
  const { isOpen, close } = useUploadWorkFlow();

  return (
    <ResponsiveModal
      title="Upload Workflow File"
      open={isOpen}
      onOpenChange={close}
    >
      <div className="py-3">
        <WorkflowUploadForm workflowId={id} setOpen={close} />
      </div>
    </ResponsiveModal>
  );
};

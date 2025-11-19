"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { useCreateWorkFlowModal } from "../../hooks/use-create-workflow";
import { WorkflowForm } from "./workflow-form";

export const CreateWorkflowModal = () => {
  const { isOpen, close, open } = useCreateWorkFlowModal();
  return (
    <ResponsiveModal title="Create Workflow" open={isOpen} onOpenChange={close}>
      <div className="py-3">
        <WorkflowForm initialData={null} setOpen={open} />
      </div>
    </ResponsiveModal>
  );
};

"use client";
import { ResponsiveModal } from "@/components/responsive-modal";
import { useCreateJob } from "../../hooks/use-create-job";
import { UsersForm } from "./create-user-form";
import { ServiceUnitsForm } from "./create-service-units-form";

export const CreateJobModal = ({ id }: { id: string }) => {
  const { isOpen, close, open } = useCreateJob();

  return (
    <ResponsiveModal
      title="Workflow Process"
      open={isOpen}
      onOpenChange={close}
    >
      <div className="py-3">
        {/* <UsersForm workflowId={id} setOpen={open} /> */}
        <ServiceUnitsForm workflowId={id} setOpen={open} />
      </div>
    </ResponsiveModal>
  );
};

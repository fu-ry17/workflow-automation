"use client";

import { Button } from "@/components/ui/button";
import { useCreateWorkFlowModal } from "../../hooks/use-create-workflow";

export const WorkflowHeader = () => {
  const { open } = useCreateWorkFlowModal();
  return (
    <>
      <div className="flex justify-between w-full items-center">
        <h1 className="text-2xl font-semibold"> Workflows </h1>

        <Button className="px-4" size="sm" onClick={open}>
          Create
        </Button>
      </div>
    </>
  );
};

"use client";

import { useState } from "react";
import { Users, Layers } from "lucide-react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { useCreateJob } from "../../hooks/use-create-job";
import { UsersForm } from "./create-user-form";
import { ServiceUnitsForm } from "./create-service-units-form";
import { cn } from "@/lib/utils";

type JobType = "users" | "service_units";

export const CreateJobModal = ({ id }: { id: string }) => {
  const { isOpen, close } = useCreateJob();
  const [activeTab, setActiveTab] = useState<JobType>("users");

  // Wrapper to handle the form's setOpen(false) expectation
  const handleClose = (open: boolean) => {
    if (!open) close();
  };

  return (
    <ResponsiveModal
      title="Workflow Process"
      open={isOpen}
      onOpenChange={close}
    >
      <div className="py-3">
        {/* Segmented Control (Shadcn Tabs Style) */}
        <div className="grid w-full grid-cols-2 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              activeTab === "users"
                ? "bg-background text-foreground shadow-sm"
                : "hover:bg-background/50 hover:text-foreground",
            )}
          >
            <Users className="w-4 h-4 mr-2" />
            Users
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("service_units")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              activeTab === "service_units"
                ? "bg-background text-foreground shadow-sm"
                : "hover:bg-background/50 hover:text-foreground",
            )}
          >
            <Layers className="w-4 h-4 mr-2" />
            Service Units
          </button>
        </div>

        {/* Form Container */}
        <div className="animate-in fade-in-50 zoom-in-95 duration-200">
          {activeTab === "users" ? (
            <UsersForm workflowId={id} setOpen={handleClose} />
          ) : (
            <ServiceUnitsForm workflowId={id} setOpen={handleClose} />
          )}
        </div>
      </div>
    </ResponsiveModal>
  );
};

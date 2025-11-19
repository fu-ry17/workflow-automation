"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { WorkflowFormValues, workflowSchema } from "../../server/schema";
import { useRouter } from "next/navigation";

export const WorkflowForm = ({
  initialData,
  setOpen,
}: {
  initialData: WorkflowFormValues | null;
  setOpen: (open: boolean) => void;
}) => {
  const utils = trpc.useUtils();
  const router = useRouter();

  const { isPending, mutateAsync } =
    trpc.workflow.createUpdateWorkflow.useMutation({
      onSuccess: (data) => {
        utils.workflow.invalidate();
        toast.success("Workflow created");
        router.push(`/workflows/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      note: initialData?.note || "",
    },
  });

  const onSubmit = async (values: WorkflowFormValues) =>
    await mutateAsync(values);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Workflow Title <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter workflow title"
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Describe what this workflow does..."
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Add any additional notes..."
                  disabled={isPending}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {initialData ? "Update" : "Create"} Workflow
          </Button>
        </div>
      </form>
    </Form>
  );
};

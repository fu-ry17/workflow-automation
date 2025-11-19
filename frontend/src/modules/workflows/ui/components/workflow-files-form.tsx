"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { ExcelFileUpload } from "@/components/upload-excel-file";
import {
  WorkflowUploadFormValues,
  workflowUploadSchema,
} from "../../server/schema";

export const WorkflowUploadForm = ({
  workflowId,
  setOpen,
}: {
  workflowId: string;
  setOpen: (open: boolean) => void;
}) => {
  const utils = trpc.useUtils();
  const { mutateAsync, isPending } = trpc.workflowFiles.upsert.useMutation({
    onSuccess: async () => {
      await utils.workflowFiles.getMany.invalidate({ workflowId });
      toast.success("Workflow file uploaded");
      setOpen(false);
      form.reset({
        file: [],
        version: "",
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm<WorkflowUploadFormValues>({
    resolver: zodResolver(workflowUploadSchema),
    defaultValues: {
      file: [],
      version: "",
    },
  });

  const onSubmit = async (values: WorkflowUploadFormValues) => {
    const file = values.file[0];

    if (!file) {
      toast.error("Please select a file");
      return;
    }

    const versionNumber = Number(values.version);
    if (Number.isNaN(versionNumber)) {
      toast.error("Version must be a number");
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    await mutateAsync({
      workflowId,
      fileData: base64,
      fileName: file.name,
      contentType: file.type,
      version: versionNumber,
      displayName: file.name,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Upload File <span className="text-red-500">*</span>
              </FormLabel>
              <ExcelFileUpload
                value={field.value}
                onChange={field.onChange}
                onError={(message) => {
                  form.setError("file", { message });
                }}
                maxFiles={1}
                maxSize={2 * 1024 * 1024}
                // disabled={isPending}
              />
              <FormDescription>
                Upload a CSV or Excel file (max 2MB)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="version"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Version <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., 1.0.0"
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
            Upload Workflow
          </Button>
        </div>
      </form>
    </Form>
  );
};

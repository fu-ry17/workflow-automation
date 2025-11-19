// components/forms/UsersForm.tsx
"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { ExcelFileUpload } from "@/components/upload-excel-file";
import { USER_ACTIONS } from "./form-constants";

const usersFormSchema = z.object({
  jobType: z.literal("users"),
  file: z
    .array(z.instanceof(File))
    .max(1, "You can only upload one file.")
    .nonempty("An Excel file is required."),
  userAction: z.any(),
});

type UsersFormSchema = z.infer<typeof usersFormSchema>;

interface UsersFormProps {
  workflowId: string;
  setOpen: (open: boolean) => void;
}

export const UsersForm = ({ workflowId, setOpen }: UsersFormProps) => {
  const utils = trpc.useUtils();
  const [workflow] = trpc.workflow.get.useSuspenseQuery({ id: workflowId });

  // const { isPending, mutateAsync } = trpc.job.createUpdate.useMutation({
  //   onSuccess: () => {
  //     utils.workflow.invalidate();
  //     toast.success("User job created successfully");
  //     setOpen(false);
  //   },
  //   onError: (error) => {
  //     toast.error(error.message);
  //   },
  // });

  const form = useForm<UsersFormSchema>({
    resolver: zodResolver(usersFormSchema),
    defaultValues: {
      jobType: "users",
      file: [],
      userAction: "create_all",
    },
  });

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onSubmit = async (values: UsersFormSchema) => {
    try {
      const fileBase64 = values.file[0]
        ? await convertFileToBase64(values.file[0])
        : undefined;

      const payload = {
        action: values.userAction,
        file: fileBase64,
        jobType: values.jobType,
        workflowId: workflowId,
        // You can add other fields from the workflow object if needed in the payload
        // For example: level: workflow.notes?.level,
      };

      console.log({ payload });
      // await mutateAsync(payload);
    } catch (error) {
      console.error("Failed to create user job:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="overflow-hidden">
          <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Upload File</FormLabel>
                <ExcelFileUpload
                  value={field.value}
                  onChange={field.onChange}
                  onError={(message) => form.setError("file", { message })}
                  maxFiles={1}
                  maxSize={2 * 1024 * 1024}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="overflow-hidden space-y-4">
          <FormField
            control={form.control}
            name="userAction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User Action</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={false}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {USER_ACTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={false}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={false}>
            {false && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Process
          </Button>
        </div>
      </form>
    </Form>
  );
};

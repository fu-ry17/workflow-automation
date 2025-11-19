"use client";

import { CloudUpload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";

interface ExcelFileUploadProps {
  value?: File[];
  onChange: (files: File[]) => void;
  onError?: (message: string) => void;
  maxFiles?: number;
  maxSize?: number;
}

export function ExcelFileUpload({
  value = [],
  onChange,
  onError,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB default
}: ExcelFileUploadProps) {
  return (
    <FileUpload
      value={value}
      onValueChange={onChange}
      accept=".csv,.xls,.xlsx,.ods"
      maxFiles={maxFiles}
      maxSize={maxSize}
      onFileReject={(_, message) => {
        onError?.(message);
      }}
      multiple={maxFiles > 1}
    >
      <FileUploadDropzone className="flex-row flex-wrap border-dotted text-center">
        <CloudUpload className="size-4" />
        Drag and drop or
        <FileUploadTrigger asChild>
          <Button variant="link" size="sm" className="p-0">
            choose files
          </Button>
        </FileUploadTrigger>
        to upload
      </FileUploadDropzone>
      <FileUploadList>
        {value.map((file, index) => (
          <FileUploadItem key={index} value={file}>
            <FileUploadItemPreview />
            <FileUploadItemMetadata />
            <FileUploadItemDelete asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <X />
                <span className="sr-only">Delete</span>
              </Button>
            </FileUploadItemDelete>
          </FileUploadItem>
        ))}
      </FileUploadList>
    </FileUpload>
  );
}

// Usage example:
// <FormField
//   control={form.control}
//   name="files"
//   render={({ field }) => (
//     <FormItem>
//       <FormLabel>Upload Spreadsheets</FormLabel>
//       <FormControl>
//         <ExcelFileUpload
//           value={field.value}
//           onChange={field.onChange}
//           onError={(message) => {
//             form.setError("files", { message });
//           }}
//           maxFiles={3}
//           maxSize={10 * 1024 * 1024}
//         />
//       </FormControl>
//       <FormDescription>
//         Upload CSV or Excel files (up to 10MB each)
//       </FormDescription>
//       <FormMessage />
//     </FormItem>
//   )}
// />

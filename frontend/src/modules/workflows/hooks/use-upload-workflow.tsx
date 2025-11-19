"use client";
import { parseAsBoolean, useQueryState } from "nuqs";

export const useUploadWorkFlow = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "upload-workflow",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }),
  );

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return {
    isOpen,
    open,
    close,
  };
};

"use client";
import { parseAsBoolean, useQueryState } from "nuqs";

export const useCreateWorkFlowModal = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "create-workflow",
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

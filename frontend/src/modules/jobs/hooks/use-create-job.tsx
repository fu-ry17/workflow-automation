"use client";
import { parseAsBoolean, useQueryState } from "nuqs";

export const useCreateJob = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "create-job",
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

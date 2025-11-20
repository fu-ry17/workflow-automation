"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import * as React from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { trpc } from "@/trpc/client";
import {
  ServiceUnitsFormSchema,
  serviceUnitsFormSchema,
  transformFacilities,
  OUTPATIENT_FACILITIES,
  INPATIENT_WARDS,
} from "./form-constants";
import { useCreateJob } from "../../hooks/use-create-job";

interface ServiceUnitsFormProps {
  workflowId: string;
  setOpen: (open: boolean) => void;
}

export const ServiceUnitsForm = ({
  workflowId,
  setOpen,
}: ServiceUnitsFormProps) => {
  const utils = trpc.useUtils();

  const { mutateAsync, isPending } = trpc.job.create.useMutation({
    onSuccess: async () => {
      await utils.job.getMany.invalidate();
      setOpen(false);
      toast.success("Service units job created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create job");
    },
  });

  const form = useForm<ServiceUnitsFormSchema>({
    resolver: zodResolver(serviceUnitsFormSchema),
    defaultValues: {
      jobType: "service_units",
      facilities: [
        {
          company: "",
          warehouse: "",
          bedstart: 1,
          outpatientParent: "",
          inpatientParent: "",
          outpatient: {},
          inpatient: [],
        },
      ],
    },
  });

  const [collapsedFacilities, setCollapsedFacilities] = React.useState<
    Record<number, boolean>
  >({});
  const [selectedOutpatientToAdd, setSelectedOutpatientToAdd] = React.useState<
    Record<number, string>
  >({});

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "facilities",
  });

  const onSubmit = async (values: ServiceUnitsFormSchema) => {
    try {
      const transformedPayload = transformFacilities(values.facilities);

      await mutateAsync({
        workflowId: workflowId,
        jobType: "service_units",
        payload: JSON.stringify(transformedPayload),
      });
    } catch (error) {
      console.error("Failed to create service units job:", error);
    }
  };

  const addFacility = () => {
    const newCollapsedState: Record<number, boolean> = {};
    fields.forEach((_, idx) => {
      newCollapsedState[idx] = true;
    });

    append({
      company: "",
      warehouse: "",
      bedstart: 1,
      outpatientParent: "",
      inpatientParent: "",
      outpatient: {},
      inpatient: [],
    });

    setCollapsedFacilities({ ...newCollapsedState, [fields.length]: false });
  };

  const toggleFacility = (index: number) => {
    setCollapsedFacilities((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
        <div className="space-y-3">
          {fields.map((field, index) => {
            const isCollapsed = collapsedFacilities[index] ?? false;
            const companyName = form.watch(`facilities.${index}.company`) || "";
            const warehouseName =
              form.watch(`facilities.${index}.warehouse`) || "";

            const displayTitle =
              companyName && warehouseName
                ? `${companyName} - ${warehouseName}`
                : companyName || `Facility ${index + 1}`;

            return (
              <Collapsible
                key={field.id}
                open={!isCollapsed}
                onOpenChange={() => toggleFacility(index)}
              >
                <Card
                  className={`transition-all duration-200 ${
                    isCollapsed
                      ? "border shadow-sm bg-muted/20"
                      : "border-2 border-primary/20 shadow-md bg-card"
                  }`}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader
                      className={`cursor-pointer hover:bg-accent/50 px-4 ${isCollapsed ? "py-1" : "py-4"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`shrink-0 p-1 rounded-md transition-colors ${isCollapsed ? "text-muted-foreground" : "bg-primary/10 text-primary"}`}
                          >
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-semibold truncate leading-tight">
                              {displayTitle}
                            </CardTitle>
                            {!isCollapsed && (
                              <CardDescription className="text-xs mt-0.5">
                                Configure facility details
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(index);
                            }}
                            className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="px-4 pb-5 space-y-5">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`facilities.${index}.company`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium">
                                  Company Name{" "}
                                  <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    disabled={isPending}
                                    className="h-8 text-sm"
                                    placeholder="e.g. Saruchat Dispensary"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`facilities.${index}.warehouse`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium">
                                  Warehouse{" "}
                                  <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    disabled={isPending}
                                    className="h-8 text-sm"
                                    placeholder="e.g. Main Pharmacy"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name={`facilities.${index}.bedstart`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium">
                                  Bed Start
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    disabled={isPending}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseInt(e.target.value) || 1,
                                      )
                                    }
                                    value={field.value ?? ""}
                                    className="h-8 text-sm"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`facilities.${index}.outpatientParent`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium">
                                  OP Parent
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    disabled={isPending}
                                    placeholder="Optional"
                                    className="h-8 text-sm"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`facilities.${index}.inpatientParent`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium">
                                  IP Parent
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    disabled={isPending}
                                    placeholder="Optional"
                                    className="h-8 text-sm"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <FormLabel className="text-sm font-semibold">
                              Outpatient Facilities
                            </FormLabel>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 items-end bg-muted/40 p-2 rounded-lg border">
                          <div className="flex-1 w-full">
                            <div className="flex gap-2">
                              <Select
                                value={selectedOutpatientToAdd[index] || ""}
                                onValueChange={(val) =>
                                  setSelectedOutpatientToAdd((prev) => ({
                                    ...prev,
                                    [index]: val,
                                  }))
                                }
                                disabled={isPending}
                              >
                                <SelectTrigger className="h-8 bg-background text-xs">
                                  <SelectValue placeholder="Select facility type..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  {OUTPATIENT_FACILITIES.filter((opt) => {
                                    const current = form.watch(
                                      `facilities.${index}.outpatient`,
                                    );
                                    return !current?.[
                                      opt.value as keyof typeof current
                                    ];
                                  }).map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                      className="text-xs"
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-3"
                                disabled={
                                  !selectedOutpatientToAdd[index] || isPending
                                }
                                onClick={() => {
                                  const typeToAdd =
                                    selectedOutpatientToAdd[index];
                                  if (!typeToAdd) return;
                                  form.setValue(
                                    `facilities.${index}.outpatient.${typeToAdd}` as any,
                                    true,
                                    { shouldValidate: true },
                                  );
                                  const currentCounts =
                                    form.getValues(
                                      `facilities.${index}.outpatient.room_counts`,
                                    ) || {};
                                  form.setValue(
                                    `facilities.${index}.outpatient.room_counts`,
                                    {
                                      ...currentCounts,
                                      [typeToAdd]: 0,
                                    },
                                  );
                                  setSelectedOutpatientToAdd((prev) => ({
                                    ...prev,
                                    [index]: "",
                                  }));
                                }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="w-full sm:w-auto">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={isPending}
                              className="h-8 w-full sm:w-auto whitespace-nowrap text-xs"
                              onClick={() => {
                                const currentCounts =
                                  form.getValues(
                                    `facilities.${index}.outpatient.room_counts`,
                                  ) || {};
                                const updates = { ...currentCounts };
                                OUTPATIENT_FACILITIES.forEach((facility) => {
                                  form.setValue(
                                    `facilities.${index}.outpatient.${facility.value}` as any,
                                    true,
                                  );
                                  if (updates[facility.value] === undefined) {
                                    updates[facility.value] = 0;
                                  }
                                });
                                form.setValue(
                                  `facilities.${index}.outpatient.room_counts`,
                                  updates,
                                );
                                toast.success(
                                  "Added all outpatient facilities",
                                );
                              }}
                            >
                              <CheckCheck className="w-3 h-3 mr-1.5" /> Add All
                            </Button>
                          </div>
                        </div>

                        {(() => {
                          const outpatientData =
                            form.watch(`facilities.${index}.outpatient`) || {};
                          const activeTypes = Object.keys(
                            outpatientData,
                          ).filter(
                            (key) =>
                              key !== "room_counts" &&
                              outpatientData[
                                key as keyof typeof outpatientData
                              ] === true,
                          );

                          if (activeTypes.length === 0) {
                            return (
                              <div className="text-center py-4 border border-dashed rounded-lg bg-muted/10">
                                <p className="text-xs text-muted-foreground">
                                  No outpatient facilities added yet.
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-[180px] overflow-y-auto pr-1">
                              {activeTypes.map((typeKey) => {
                                const label =
                                  OUTPATIENT_FACILITIES.find(
                                    (f) => f.value === typeKey,
                                  )?.label || typeKey;

                                return (
                                  <div
                                    key={typeKey}
                                    className="flex items-center justify-between p-1.5 pl-2.5 rounded border bg-card hover:bg-accent/5 transition-colors group"
                                  >
                                    <span
                                      className="text-xs font-medium truncate flex-1 mr-2"
                                      title={label}
                                    >
                                      {label}
                                    </span>

                                    <div className="flex items-center gap-1">
                                      <FormField
                                        control={form.control}
                                        name={`facilities.${index}.outpatient.room_counts.${typeKey}`}
                                        render={({ field }) => (
                                          <Input
                                            {...field}
                                            type="number"
                                            min={0}
                                            disabled={isPending}
                                            placeholder="0"
                                            className="h-6 w-12 text-center px-1 text-xs"
                                            onChange={(e) =>
                                              field.onChange(
                                                parseInt(e.target.value) || 0,
                                              )
                                            }
                                          />
                                        )}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={isPending}
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-transparent"
                                        onClick={() => {
                                          form.setValue(
                                            `facilities.${index}.outpatient.${typeKey}` as any,
                                            false,
                                          );
                                          const currentCounts =
                                            form.getValues(
                                              `facilities.${index}.outpatient.room_counts`,
                                            ) || {};
                                          const newCounts = {
                                            ...currentCounts,
                                          };
                                          delete newCounts[typeKey];
                                          form.setValue(
                                            `facilities.${index}.outpatient.room_counts`,
                                            newCounts,
                                          );
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <FormLabel className="text-sm font-semibold">
                              Inpatient Wards
                            </FormLabel>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            className="h-7 text-xs"
                            onClick={() => {
                              const current =
                                form.getValues(
                                  `facilities.${index}.inpatient`,
                                ) || [];
                              form.setValue(`facilities.${index}.inpatient`, [
                                ...current,
                                { ward: "male_ward", quantity: 1 },
                              ]);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1.5" /> Add Ward
                          </Button>
                        </div>

                        <FormField
                          control={form.control}
                          name={`facilities.${index}.inpatient`}
                          render={() => {
                            const wards =
                              form.watch(`facilities.${index}.inpatient`) || [];
                            if (wards.length === 0) {
                              return (
                                <div className="text-center py-4 border border-dashed rounded-lg bg-muted/10">
                                  <p className="text-xs text-muted-foreground">
                                    No wards configured yet.
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                                {wards.map((_, wardIndex) => (
                                  <div
                                    key={wardIndex}
                                    className="flex items-center justify-between gap-2 p-1.5 rounded border bg-card hover:bg-accent/5 transition-colors"
                                  >
                                    <FormField
                                      control={form.control}
                                      name={`facilities.${index}.inpatient.${wardIndex}.ward`}
                                      render={({ field }) => (
                                        <FormItem className="flex-1 min-w-0 space-y-0">
                                          <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isPending}
                                          >
                                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent p-0 pl-1 focus:ring-0 shadow-none">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[200px]">
                                              {INPATIENT_WARDS.map((w) => (
                                                <SelectItem
                                                  key={w.value}
                                                  value={w.value}
                                                  className="text-xs"
                                                >
                                                  {w.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </FormItem>
                                      )}
                                    />

                                    <div className="flex items-center gap-1 border-l pl-2">
                                      <FormField
                                        control={form.control}
                                        name={`facilities.${index}.inpatient.${wardIndex}.quantity`}
                                        render={({ field }) => (
                                          <Input
                                            {...field}
                                            type="number"
                                            min={1}
                                            disabled={isPending}
                                            className="h-6 w-12 text-center px-1 text-xs"
                                            onChange={(e) =>
                                              field.onChange(
                                                parseInt(e.target.value) || 1,
                                              )
                                            }
                                          />
                                        )}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={isPending}
                                        className="h-6 w-6 hover:text-destructive hover:bg-transparent"
                                        onClick={() => {
                                          const current =
                                            form.getValues(
                                              `facilities.${index}.inpatient`,
                                            ) || [];
                                          form.setValue(
                                            `facilities.${index}.inpatient`,
                                            current.filter(
                                              (_, i) => i !== wardIndex,
                                            ),
                                          );
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={addFacility}
            disabled={isPending}
            className="w-full border-dashed border-2 h-10 hover:bg-accent/50 text-sm"
          >
            <Plus className="h-3.5 w-3.5 mr-2" /> Add Another Facility
          </Button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <p className="text-xs text-muted-foreground flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            {fields.length} facility configured
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Service Units
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

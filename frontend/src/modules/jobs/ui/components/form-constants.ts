import { z } from "zod";

export const USER_ACTIONS = [
  { value: "create_all", label: "Create All" },
  { value: "create_user", label: "Create User" },
  { value: "create_employee", label: "Create Employee" },
  {
    value: "create_healthcare_practitioner",
    label: "Create Healthcare Practitioner",
  },
  { value: "create_user_permission", label: "Create User Permission" },
  { value: "create_user_warehouse", label: "Create User Warehouse" },
] as const;

export const outpatientTypes = [
  "opd",
  "mch",
  "ccc",
  "maternity",
  "dental",
  "medical_outpatient",
  "surgical_outpatient",
  "paediatric_outpatient",
  "eye_clinic",
  "ent_clinic",
  "physiotherapy",
  "social_work",
  "psychiatric_clinic",
  "occupational_therapy",
  "orthopaedic_clinic",
  "tb",
  "nutrition",
  "injection",
  "observation_room",
  "procedure_room",
  "youth_adolescent_room",
  "cervical_screening_room",
] as const;

// Outpatient facility types with labels
export const OUTPATIENT_FACILITIES = [
  { value: "opd", label: "OPD" },
  { value: "mch", label: "MCH" },
  { value: "ccc", label: "CCC" },
  { value: "maternity", label: "Maternity" },
  { value: "dental", label: "Dental" },
  { value: "medical_outpatient", label: "Medical Outpatient" },
  { value: "surgical_outpatient", label: "Surgical Outpatient" },
  { value: "paediatric_outpatient", label: "Paediatric Outpatient" },
  { value: "eye_clinic", label: "Eye Clinic" },
  { value: "ent_clinic", label: "ENT Clinic" },
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "social_work", label: "Social Work" },
  { value: "psychiatric_clinic", label: "Psychiatric Clinic" },
  { value: "occupational_therapy", label: "Occupational Therapy" },
  { value: "orthopaedic_clinic", label: "Orthopaedic Clinic" },
  { value: "tb", label: "TB" },
  { value: "nutrition", label: "Nutrition" },
  { value: "injection", label: "Injection" },
  { value: "observation_room", label: "Observation Room" },
  { value: "procedure_room", label: "Procedure Room" },
  { value: "youth_adolescent_room", label: "Youth Adolescent Room" },
  { value: "cervical_screening_room", label: "Cervical Screening Room" },
] as const;

// Inpatient ward types
export const InpatientWardSchema = z.object({
  ward: z.enum([
    "gynae_ward",
    "paediatric_ward",
    "female_ward",
    "male_ward",
    "nbu_ward",
    "labour_ward",
    "post_natal_ward",
    "antenatal_ward",
    "general_ward",
  ]),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const INPATIENT_WARDS = [
  { value: "gynae_ward", label: "Gynae Ward" },
  { value: "paediatric_ward", label: "Paediatric Ward" },
  { value: "female_ward", label: "Female Ward" },
  { value: "male_ward", label: "Male Ward" },
  { value: "nbu_ward", label: "NBU Ward" },
  { value: "labour_ward", label: "Labour Ward" },
  { value: "post_natal_ward", label: "Post Natal Ward" },
  { value: "antenatal_ward", label: "Antenatal Ward" },
  { value: "general_ward", label: "General Ward" },
] as const;

export type InpatientWard = z.infer<typeof InpatientWardSchema>;

export const OutpatientFacilitySchema = z.object({
  facility: z.enum(outpatientTypes),
  roomCount: z.number().int().min(1, "Room count must be at least 1"),
});

export type OutpatientFacility = z.infer<typeof OutpatientFacilitySchema>;

// Define wards that belong to the nested maternity structure
export const MATERNITY_CHILD_WARDS = [
  "nbu_ward",
  "labour_ward",
  "post_natal_ward",
  "antenatal_ward",
];

// --- SCHEMAS ---
export const roomCountsSchema = z
  .record(z.string(), z.number().int().min(0))
  .optional();

export const outpatientFields = outpatientTypes.reduce(
  (acc, type) => {
    acc[type] = z.boolean().optional();
    return acc;
  },
  {} as Record<(typeof outpatientTypes)[number], z.ZodOptional<z.ZodBoolean>>,
);

export const outpatientSchema = z
  .object({
    ...outpatientFields,
    room_counts: roomCountsSchema,
  })
  .optional();

export const inpatientSchema = z.array(InpatientWardSchema).optional();

export const facilitySchema = z.object({
  company: z.string().min(1, "Company name is required"),
  warehouse: z.string().min(1, "Warehouse is required"),
  bedstart: z.number().int().min(1),
  outpatientParent: z.string().optional(),
  inpatientParent: z.string().optional(),
  outpatient: outpatientSchema,
  inpatient: inpatientSchema,
});

export const serviceUnitsFormSchema = z.object({
  jobType: z.literal("service_units"),
  facilities: z
    .array(facilitySchema)
    .min(1, "At least one facility is required"),
});

export type ServiceUnitsFormSchema = z.infer<typeof serviceUnitsFormSchema>;

export const transformFacilities = (
  facilities: ServiceUnitsFormSchema["facilities"],
) => {
  return facilities.map((facility) => {
    // --- TRANSFORM OUTPATIENT ---
    const outpatient: Record<string, any> = {};

    if (facility.outpatient) {
      Object.entries(facility.outpatient).forEach(([key, value]) => {
        if (key === "room_counts" && value) {
          // Filter room counts: only include if count > 1
          const filteredCounts: Record<string, number> = {};
          Object.entries(value as Record<string, number>).forEach(([k, v]) => {
            if (v > 1) {
              filteredCounts[k] = v;
            }
          });

          if (Object.keys(filteredCounts).length > 0) {
            outpatient.room_counts = filteredCounts;
          }
        } else if (value === true) {
          outpatient[key] = true;
        }
      });
    }

    // --- TRANSFORM INPATIENT ---
    const inpatientObj: Record<string, any> = {};
    const maternityChildren: Record<string, number> = {};

    // Iterate through the form's flat array and restructure
    if (facility.inpatient) {
      facility.inpatient.forEach((item) => {
        if (MATERNITY_CHILD_WARDS.includes(item.ward)) {
          // Add to nested maternity object
          maternityChildren[item.ward] = item.quantity;
        } else {
          // Add directly to root
          inpatientObj[item.ward] = item.quantity;
        }
      });
    }

    // If we collected any maternity children wards, attach them
    if (Object.keys(maternityChildren).length > 0) {
      inpatientObj["maternity"] = {
        children: maternityChildren,
      };
    }

    return {
      company: facility.company,
      warehouse: facility.warehouse,
      bedstart: facility.bedstart,
      outpatient: Object.keys(outpatient).length > 0 ? outpatient : {},
      inpatient: inpatientObj,
    };
  });
};

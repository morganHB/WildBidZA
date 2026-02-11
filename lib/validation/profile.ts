import { z } from "zod";
import { SOUTH_AFRICA_PROVINCES } from "@/lib/constants/provinces";

export const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(2, "Display name is required"),
  id_number: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || /^\d{13}$/.test(value.replace(/\s+/g, "")), {
      message: "ID number must be 13 digits",
    }),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number too long")
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || /^(\+27\d{9}|0\d{9})$/.test(value.replace(/[^\d+]/g, "")), {
      message: "Enter a valid South African cellphone number",
    }),
  province: z
    .enum(SOUTH_AFRICA_PROVINCES)
    .optional()
    .or(z.literal("")),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

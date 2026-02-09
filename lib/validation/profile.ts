import { z } from "zod";
import { SOUTH_AFRICA_PROVINCES } from "@/lib/constants/provinces";

export const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(2, "Display name is required"),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number too long")
    .optional()
    .or(z.literal("")),
  province: z
    .enum(SOUTH_AFRICA_PROVINCES)
    .optional()
    .or(z.literal("")),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

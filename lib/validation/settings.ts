import { z } from "zod";

export const settingsUpdateSchema = z.object({
  sniping_window_minutes: z.number().int().min(0).max(60),
  extension_minutes: z.number().int().min(0).max(60),
  default_min_increment: z.number().positive().max(1000000),
  max_images_per_auction: z.number().int().min(1).max(12),
  bidder_masking_enabled: z.boolean().optional(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

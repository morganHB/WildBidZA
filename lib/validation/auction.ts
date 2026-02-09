import { z } from "zod";
import { SOUTH_AFRICA_PROVINCES } from "@/lib/constants/provinces";

export const auctionImageSchema = z.object({
  storage_path: z.string().min(1),
  sort_order: z.number().int().min(0),
});

const auctionSexSchema = z.enum(["male", "female"]);

const auctionBaseSchema = z.object({
  title: z.string().trim().min(8, "Title must be at least 8 characters").max(120),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(6000),
  category_id: z.string().uuid(),
  animal_count: z.number().int().min(1, "Animal count must be at least 1"),
  avg_weight_kg: z.number().positive("Average weight must be greater than 0").optional().nullable(),
  breed_type: z.string().trim().max(100).optional().nullable(),
  sex: auctionSexSchema.optional().nullable(),
  age: z.string().trim().max(40).optional().nullable(),
  weight: z.string().trim().max(40).optional().nullable(),
  province: z.enum(SOUTH_AFRICA_PROVINCES).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  farm_name: z.string().trim().max(100).optional().nullable(),
  health_notes: z.string().trim().max(2000).optional().nullable(),
  permit_reference: z.string().trim().max(120).optional().nullable(),
  collection_notes: z.string().trim().max(2000).optional().nullable(),
  starting_bid: z.number().positive(),
  min_increment: z.number().positive().optional().nullable(),
  reserve_price: z.number().positive().optional().nullable(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  images: z.array(auctionImageSchema).max(8),
});

export const createAuctionSchema = auctionBaseSchema
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: "End time must be after start time",
    path: ["end_time"],
  })
  .refine((data) => data.animal_count <= 1 || Boolean(data.avg_weight_kg), {
    message: "Average weight is required for herd listings",
    path: ["avg_weight_kg"],
  })
  .refine((data) => !data.reserve_price || data.reserve_price >= data.starting_bid, {
    message: "Reserve price must be equal to or above starting bid",
    path: ["reserve_price"],
  });

export const updateAuctionSchema = auctionBaseSchema
  .partial()
  .extend({
    is_active: z.boolean().optional(),
  })
  .refine((data) => !data.animal_count || data.animal_count <= 1 || Boolean(data.avg_weight_kg), {
    message: "Average weight is required for herd listings",
    path: ["avg_weight_kg"],
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return new Date(data.end_time) > new Date(data.start_time);
      }

      return true;
    },
    {
      message: "End time must be after start time",
      path: ["end_time"],
    },
  )
  .refine(
    (data) => {
      if (data.reserve_price && data.starting_bid) {
        return data.reserve_price >= data.starting_bid;
      }

      return true;
    },
    {
      message: "Reserve price must be equal to or above starting bid",
      path: ["reserve_price"],
    },
  );

export const auctionFiltersSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  province: z.string().optional(),
  status: z.enum(["all", "upcoming", "live", "ended"]).optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sort: z.enum(["ending_soon", "newest", "highest_price"]).optional(),
  limit: z.coerce.number().int().min(1).max(48).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
export type UpdateAuctionInput = z.infer<typeof updateAuctionSchema>;

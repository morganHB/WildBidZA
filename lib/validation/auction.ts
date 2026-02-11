import { z } from "zod";
import { SOUTH_AFRICA_PROVINCES } from "@/lib/constants/provinces";

export const auctionImageSchema = z.object({
  storage_path: z.string().min(1),
  sort_order: z.number().int().min(0),
});

export const auctionVideoSchema = z.object({
  storage_path: z.string().min(1),
  sort_order: z.number().int().min(0),
  trim_start_seconds: z.number().min(0),
  trim_end_seconds: z.number().positive().nullable().optional(),
  muted: z.boolean(),
});

const auctionSexSchema = z.enum(["male", "female"]);
const bidPricingModeSchema = z.enum(["lot_total", "per_head"]);
const startModeSchema = z.enum(["immediate", "scheduled"]);
const durationMinutesSchema = z.number().int().min(10).max(10080);

const auctionBaseSchema = z.object({
  title: z.string().trim().min(8, "Title must be at least 8 characters").max(120),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(6000),
  category_id: z.string().uuid(),
  animal_count: z.number().int().min(1, "Animal count must be at least 1"),
  avg_weight_kg: z
    .number()
    .positive("Average weight must be greater than 0")
    .optional()
    .nullable(),
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
  bid_pricing_mode: bidPricingModeSchema.optional().default("lot_total"),
  duration_minutes: durationMinutesSchema,
  start_time: z.string().datetime(),
  packet_series_id: z.string().uuid().optional().nullable(),
  packet_sequence: z.number().int().min(1).optional().nullable(),
  previous_packet_auction_id: z.string().uuid().optional().nullable(),
  is_waiting_for_previous: z.boolean().optional(),
  auto_start_next: z.boolean().optional().default(true),
  images: z.array(auctionImageSchema).max(8).default([]),
  videos: z.array(auctionVideoSchema).max(3).default([]),
});

export const createAuctionSchema = auctionBaseSchema
  .refine((data) => data.animal_count <= 1 || Boolean(data.avg_weight_kg), {
    message: "Average weight is required for herd listings",
    path: ["avg_weight_kg"],
  })
  .refine(
    (data) => !data.reserve_price || data.reserve_price >= data.starting_bid,
    {
      message: "Reserve price must be equal to or above starting bid",
      path: ["reserve_price"],
    },
  )
  .refine((data) => data.images.length + data.videos.length > 0, {
    message: "Add at least one image or video",
    path: ["images"],
  })
  .refine(
    (data) => {
      return data.videos.every((video) => {
        return (
          video.trim_end_seconds == null ||
          video.trim_end_seconds > video.trim_start_seconds
        );
      });
    },
    {
      message: "Video trim end must be after trim start",
      path: ["videos"],
    },
  );

export const updateAuctionSchema = auctionBaseSchema
  .partial()
  .extend({
    is_active: z.boolean().optional(),
    images: z.array(auctionImageSchema).max(8).optional(),
    videos: z.array(auctionVideoSchema).max(3).optional(),
  })
  .refine(
    (data) =>
      !data.animal_count ||
      data.animal_count <= 1 ||
      Boolean(data.avg_weight_kg),
    {
      message: "Average weight is required for herd listings",
      path: ["avg_weight_kg"],
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
  )
  .refine(
    (data) => {
      if (!data.videos) {
        return true;
      }

      return data.videos.every((video) => {
        return (
          video.trim_end_seconds == null ||
          video.trim_end_seconds > video.trim_start_seconds
        );
      });
    },
    {
      message: "Video trim end must be after trim start",
      path: ["videos"],
    },
  );

export const packetItemSchema = z
  .object({
    packet_label: z.string().trim().max(80).optional().nullable(),
    animal_count: z.number().int().min(1),
    avg_weight_kg: z.number().positive().optional().nullable(),
    starting_bid: z.number().positive(),
    min_increment: z.number().positive().optional().nullable(),
    reserve_price: z.number().positive().optional().nullable(),
    duration_minutes: durationMinutesSchema,
    auto_start_next: z.boolean().optional().default(true),
  })
  .refine((data) => data.animal_count <= 1 || Boolean(data.avg_weight_kg), {
    message: "Average weight is required for herd packets",
    path: ["avg_weight_kg"],
  })
  .refine(
    (data) => !data.reserve_price || data.reserve_price >= data.starting_bid,
    {
      message: "Reserve price must be equal to or above starting bid",
      path: ["reserve_price"],
    },
  );

export const createPacketSeriesSchema = z
  .object({
    title: z.string().trim().min(8, "Title must be at least 8 characters").max(120),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(6000),
    category_id: z.string().uuid(),
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
    min_increment: z.number().positive().optional().nullable(),
    start_mode: startModeSchema.default("immediate"),
    scheduled_start: z.string().datetime().optional().nullable(),
    images: z.array(auctionImageSchema).max(8).default([]),
    videos: z.array(auctionVideoSchema).max(3).default([]),
    packets: z.array(packetItemSchema).min(1).max(100),
  })
  .refine(
    (data) =>
      data.start_mode !== "scheduled" ||
      Boolean(data.scheduled_start),
    {
      message: "Scheduled start is required when start mode is scheduled",
      path: ["scheduled_start"],
    },
  )
  .refine(
    (data) => data.images.length + data.videos.length > 0,
    {
      message: "Add at least one image or video",
      path: ["images"],
    },
  )
  .refine(
    (data) => {
      return data.videos.every((video) => {
        return (
          video.trim_end_seconds == null ||
          video.trim_end_seconds > video.trim_start_seconds
        );
      });
    },
    {
      message: "Video trim end must be after trim start",
      path: ["videos"],
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
export type CreatePacketSeriesInput = z.infer<typeof createPacketSeriesSchema>;

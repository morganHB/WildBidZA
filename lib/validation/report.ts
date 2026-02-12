import { z } from "zod";

export const reportTypeSchema = z.enum([
  "auction_performance",
  "bidding_activity",
  "sales_outcomes",
]);

export const reportScopeSchema = z.enum(["all_access", "owned", "managed"]);

export const reportStatusSchema = z.enum(["all", "upcoming", "live", "ended"]);

export const reportFiltersSchema = z.object({
  reportType: reportTypeSchema.default("auction_performance"),
  scope: reportScopeSchema.default("all_access"),
  status: reportStatusSchema.default("all"),
  categoryId: z.string().uuid().optional(),
  province: z.string().trim().min(2).max(80).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().trim().max(120).optional(),
  maxRows: z.number().int().min(10).max(10000).optional().default(2000),
});

export type ReportType = z.infer<typeof reportTypeSchema>;
export type ReportScope = z.infer<typeof reportScopeSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>;

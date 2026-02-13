import { z } from "zod";

export const bidSchema = z.object({
  amount: z.number().positive("Bid amount must be greater than 0"),
});

export const autoBidSchema = z.object({
  max_amount: z.number().positive("Max auto-bid amount must be greater than 0"),
});

export type BidInput = z.infer<typeof bidSchema>;
export type AutoBidInput = z.infer<typeof autoBidSchema>;

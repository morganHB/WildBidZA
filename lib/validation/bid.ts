import { z } from "zod";

export const bidSchema = z.object({
  amount: z.number().positive("Bid amount must be greater than 0"),
});

export type BidInput = z.infer<typeof bidSchema>;
